import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendSwapCompletedEmail } from '@/lib/resend'
import { sendPushToUser } from '@/lib/push'
import { z } from 'zod'

const ReceiveSchema = z.object({
  conditionOk: z.boolean(),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = ReceiveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const tx = await prisma.swapTransaction.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.escrowStatus === 'COMPLETED') return NextResponse.json({ error: 'Transaction is already completed.' }, { status: 400 })
  if (tx.escrowStatus === 'DISPUTED') return NextResponse.json({ error: 'Transaction is under dispute.' }, { status: 400 })
  if (tx.escrowStatus === 'PENDING') return NextResponse.json({ error: 'Item has not been shipped yet.' }, { status: 400 })

  const isSeller = tx.sellerId === user.id
  const isBuyer = tx.buyerId === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  if (isBuyer && tx.buyerItemReceived) return NextResponse.json({ error: 'You have already confirmed receipt.' }, { status: 400 })
  if (isSeller && tx.sellerItemReceived) return NextResponse.json({ error: 'You have already confirmed receipt.' }, { status: 400 })
  // For CASH, seller doesn't need to confirm receiving (buyer received is enough)
  if (isSeller && tx.offerType === 'CASH') return NextResponse.json({ error: 'This confirmation is not required for cash offers.' }, { status: 400 })

  // Atomically claim THIS actor's receipt (only flips false->true once, even on double-submit).
  const receiptClaim = isBuyer
    ? await prisma.swapTransaction.updateMany({ where: { id, buyerItemReceived: false }, data: { buyerItemReceived: true } })
    : await prisma.swapTransaction.updateMany({ where: { id, sellerItemReceived: false }, data: { sellerItemReceived: true } })
  if (receiptClaim.count === 0) return NextResponse.json({ error: 'You have already confirmed receipt.' }, { status: 400 })

  // Re-read fresh state, then decide completion from authoritative values.
  const updated = await prisma.swapTransaction.findUnique({ where: { id } })
  if (!updated) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  const allReceived = updated.offerType === 'CASH'
    ? updated.buyerItemReceived
    : updated.buyerItemReceived && updated.sellerItemReceived

  // Atomically claim the COMPLETED transition — only the finisher awards stats (no double-count).
  let completedNow = false
  if (allReceived) {
    const completeClaim = await prisma.swapTransaction.updateMany({
      where: { id, escrowStatus: { not: 'COMPLETED' } },
      data: { escrowStatus: 'COMPLETED', resolvedAt: new Date() },
    })
    completedNow = completeClaim.count === 1
  }

  // On completion: update swap scores, verified badge, send emails (once)
  if (completedNow) {
    const [seller, buyer] = await Promise.all([
      prisma.user.findUnique({ where: { id: tx.sellerId }, select: { email: true, name: true, successfulSwaps: true } }),
      prisma.user.findUnique({ where: { id: tx.buyerId }, select: { email: true, name: true, successfulSwaps: true } }),
    ])

    function calcSwapScore(newCount: number) {
      // 1 swap=4.1, 5 swaps=4.5 (verified), 10 swaps=5.0
      return Math.min(4.0 + newCount * 0.1, 5.0)
    }

    const sellerNewCount = (seller?.successfulSwaps ?? 0) + 1
    const buyerNewCount = (buyer?.successfulSwaps ?? 0) + 1

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tx.sellerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(sellerNewCount),
          swapVerified: sellerNewCount >= 5,
        },
      }),
      prisma.user.update({
        where: { id: tx.buyerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(buyerNewCount),
          swapVerified: buyerNewCount >= 5,
        },
      }),
    ])

    // Emails + push — fire-and-forget
    const listingTitle = await prisma.listing.findUnique({ where: { id: tx.listingId }, select: { title: true } }).then(l => l?.title ?? 'Listing')
    if (seller?.email) sendSwapCompletedEmail(seller.email, seller.name ?? 'Penjual', listingTitle).catch(() => {})
    if (buyer?.email) sendSwapCompletedEmail(buyer.email, buyer.name ?? 'Pembeli', listingTitle).catch(() => {})
    sendPushToUser(tx.sellerId, { title: '✅ Swap completed!', body: listingTitle, url: `/listings/${tx.listingId}`, tag: `complete-${tx.id}` }).catch(() => {})
    sendPushToUser(tx.buyerId, { title: '✅ Swap completed!', body: listingTitle, url: `/listings/${tx.listingId}`, tag: `complete-${tx.id}` }).catch(() => {})
  }

  return NextResponse.json({ transaction: updated, completed: !!allReceived })
}
