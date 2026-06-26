import { getStripe } from './stripe'
import { prisma } from './prisma'

const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'

/**
 * Get the seller's Stripe Connect account, creating one if needed.
 * **Standard** accounts — Malaysia platforms cannot be loss-liable (Stripe risk
 * control), and Express requires the platform to be loss-liable, so Standard is the
 * only option: Stripe owns onboarding/KYC/loss-liability and the seller gets a full
 * Stripe dashboard. Funds reach the seller via Transfer on escrow release.
 */
export async function getOrCreateConnectAccount(user: { id: string; email: string; stripeAccountId: string | null }): Promise<string> {
  if (user.stripeAccountId) return user.stripeAccountId

  const account = await getStripe().accounts.create({
    type: 'standard',
    country: 'MY',
    email: user.email,
    metadata: { userId: user.id },
  })

  await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: account.id } })
  return account.id
}

/** Hosted onboarding link. refresh_url re-creates the link if it expires before completion. */
export async function createOnboardingLink(accountId: string): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${APP}/api/connect/onboard`,
    return_url: `${APP}/api/connect/return`,
    type: 'account_onboarding',
  })
  return link.url
}

/**
 * Where a seller manages payouts & bank details. Standard accounts use the full
 * Stripe dashboard (login links are Express/Custom-only), so we send them there.
 */
export function sellerDashboardUrl(): string {
  return 'https://dashboard.stripe.com'
}

/** Pull live status from Stripe and persist `stripeOnboarded` (payouts enabled). */
export async function refreshOnboardStatus(userId: string, accountId: string): Promise<boolean> {
  const acct = await getStripe().accounts.retrieve(accountId)
  const onboarded = !!(acct.details_submitted && acct.payouts_enabled)
  await prisma.user.update({ where: { id: userId }, data: { stripeOnboarded: onboarded } })
  return onboarded
}

export type TransferResult =
  | { ok: true; transferId: string | null; skipped?: boolean }
  | { ok: false; reason: 'not_onboarded' | 'already_paid' | 'error'; message?: string }

/**
 * Pay the seller for a released Flash transaction via Stripe Connect Transfer
 * (separate charges & transfers — funds were held in the platform balance during escrow).
 * Falls back to `not_onboarded` so the caller can keep the manual bank-transfer flow.
 * Idempotent: a transaction already transferred / paid is a no-op.
 */
export async function transferToSeller(listingId: string): Promise<TransferResult> {
  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return { ok: false, reason: 'error', message: 'Transaction not found' }
  if (tx.stripeTransferId || tx.sellerPaid) return { ok: false, reason: 'already_paid' }
  if (tx.disputed) return { ok: false, reason: 'error', message: 'Transaction is disputed — payout held' }

  const seller = await prisma.user.findUnique({
    where: { id: tx.sellerId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })
  if (!seller?.stripeOnboarded || !seller.stripeAccountId) return { ok: false, reason: 'not_onboarded' }

  // Concurrency lock: atomically claim the payout. Only the FIRST of any racing callers
  // (double confirm, confirm vs admin mark-payout) flips sellerPaid false->true and proceeds.
  const claim = await prisma.transaction.updateMany({
    where: { listingId, sellerPaid: false, stripeTransferId: null },
    data: { sellerPaid: true },
  })
  if (claim.count === 0) return { ok: false, reason: 'already_paid' }

  // Nothing to pay (e.g. free win) — settled by the claim above, no Transfer needed.
  if (tx.sellerPayout <= 0) {
    await prisma.transaction.update({ where: { listingId }, data: { sellerPaidAt: new Date() } })
    return { ok: true, transferId: null, skipped: true }
  }

  try {
    // idempotencyKey is belt-and-suspenders: even if this runs twice, Stripe makes ONE transfer.
    const transfer = await getStripe().transfers.create({
      amount: Math.round(tx.sellerPayout * 100),
      currency: 'myr',
      destination: seller.stripeAccountId,
      transfer_group: `listing_${listingId}`,
      metadata: { listingId, sellerId: tx.sellerId },
    }, { idempotencyKey: `transfer_${listingId}` })
    await prisma.transaction.update({
      where: { listingId },
      data: { stripeTransferId: transfer.id, sellerPaidAt: new Date() },
    })
    return { ok: true, transferId: transfer.id }
  } catch (err) {
    // Release the claim so the payout can be retried (admin Mark Paid / next confirm).
    await prisma.transaction.update({ where: { listingId }, data: { sellerPaid: false } }).catch(() => {})
    console.error('[connect] transfer failed for', listingId, err)
    return { ok: false, reason: 'error', message: (err as Error).message }
  }
}
