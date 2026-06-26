import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPaymentReceivedEmail } from '@/lib/resend'
import { logAdminAction } from '@/lib/audit'
import { transferToSeller } from '@/lib/connect'

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.buyerId !== user.id) return NextResponse.json({ error: 'Not the buyer.' }, { status: 403 })
  // Self-pickup has no "shipped" step — the buyer confirms once they have collected the item.
  if (tx.pickupMethod !== 'PICKUP' && tx.shippingStatus !== 'SHIPPED') return NextResponse.json({ error: 'Item has not been shipped by the seller yet.' }, { status: 400 })
  if (tx.deliveryConfirmed) return NextResponse.json({ error: 'Already confirmed.' }, { status: 400 })

  // Atomically claim the confirmation: only the first of any racing requests (double-click,
  // retry, two tabs) flips deliveryConfirmed false->true. Prevents double score + double payout.
  const claim = await prisma.transaction.updateMany({
    where: { listingId, deliveryConfirmed: false },
    data: { shippingStatus: 'DELIVERED', deliveryConfirmed: true, status: 'RELEASED' },
  })
  if (claim.count === 0) {
    return NextResponse.json({ success: true, sellerPayout: tx.sellerPayout, payout: 'already_confirmed' })
  }

  // We own the release — award the seller's score once.
  await prisma.user.update({
    where: { id: tx.sellerId },
    data: { rehomeScore: { increment: 5 } },
  })

  // Auto-payout via Stripe Connect (separate charges & transfers). Non-onboarded
  // sellers fall back to the manual admin "Mark Paid" flow.
  const payout = await transferToSeller(listingId).catch(() => ({ ok: false as const, reason: 'error' as const }))

  // Notify seller
  try {
    const seller = await prisma.user.findUnique({ where: { id: tx.sellerId }, select: { email: true, name: true } })
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } })
    if (seller?.email && listing) {
      await sendPaymentReceivedEmail(seller.email, seller.name ?? 'Penjual', listing.title, tx.sellerPayout)
    }
  } catch { /* email failure is non-critical */ }

  void logAdminAction(user.id, 'BUYER_CONFIRMED_RECEIPT', listingId, 'Transaction', {
    sellerId: tx.sellerId,
    sellerPayout: tx.sellerPayout,
    payout: payout.ok ? 'sent' : payout.reason,
  })

  return NextResponse.json({ success: true, sellerPayout: tx.sellerPayout, payout: payout.ok ? 'sent' : payout.reason })
}
