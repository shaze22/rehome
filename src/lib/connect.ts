import { getStripe } from './stripe'
import { prisma } from './prisma'

const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'

/**
 * Get the seller's Stripe Connect (Express) account, creating one if needed.
 * Express = Stripe-hosted onboarding + KYC + payout dashboard. We only request the
 * `transfers` capability — funds reach the seller via Transfer on escrow release.
 */
export async function getOrCreateConnectAccount(user: { id: string; email: string; stripeAccountId: string | null }): Promise<string> {
  if (user.stripeAccountId) return user.stripeAccountId

  const account = await getStripe().accounts.create({
    type: 'express',
    country: 'MY',
    email: user.email,
    business_type: 'individual',
    capabilities: { transfers: { requested: true } },
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

/** Express dashboard login link (seller views their payouts). */
export async function createLoginLink(accountId: string): Promise<string> {
  const link = await getStripe().accounts.createLoginLink(accountId)
  return link.url
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

  const seller = await prisma.user.findUnique({
    where: { id: tx.sellerId },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })
  if (!seller?.stripeOnboarded || !seller.stripeAccountId) return { ok: false, reason: 'not_onboarded' }

  // Nothing to pay (e.g. free win) — mark settled without a Transfer.
  if (tx.sellerPayout <= 0) {
    await prisma.transaction.update({ where: { listingId }, data: { sellerPaid: true, sellerPaidAt: new Date() } })
    return { ok: true, transferId: null, skipped: true }
  }

  try {
    const transfer = await getStripe().transfers.create({
      amount: Math.round(tx.sellerPayout * 100),
      currency: 'myr',
      destination: seller.stripeAccountId,
      transfer_group: `listing_${listingId}`,
      metadata: { listingId, sellerId: tx.sellerId },
    })
    await prisma.transaction.update({
      where: { listingId },
      data: { stripeTransferId: transfer.id, sellerPaid: true, sellerPaidAt: new Date() },
    })
    return { ok: true, transferId: transfer.id }
  } catch (err) {
    console.error('[connect] transfer failed for', listingId, err)
    return { ok: false, reason: 'error', message: (err as Error).message }
  }
}
