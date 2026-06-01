import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSwapCompletedEmail, sendSwapItemShippedEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let autoReleased = 0
  let reminders = 0
  let offersExpired = 0

  // 1. Auto-release BOTH_SHIPPED > 7 days with no action
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const stuckTransactions = await prisma.swapTransaction.findMany({
    where: { escrowStatus: 'BOTH_SHIPPED', updatedAt: { lt: sevenDaysAgo } },
    include: {
      listing: { select: { title: true } },
      seller: { select: { email: true, name: true } },
      buyer:  { select: { email: true, name: true } },
    },
  })

  for (const tx of stuckTransactions) {
    try {
      const newCount = await prisma.$transaction(async (db) => {
        await db.swapTransaction.update({
          where: { id: tx.id },
          data: {
            escrowStatus: 'COMPLETED',
            sellerItemReceived: true,
            buyerItemReceived: true,
            resolvedAt: now,
          },
        })
        const [updatedSeller, updatedBuyer] = await Promise.all([
          db.user.update({
            where: { id: tx.sellerId },
            data: { successfulSwaps: { increment: 1 } },
            select: { successfulSwaps: true },
          }),
          db.user.update({
            where: { id: tx.buyerId },
            data: { successfulSwaps: { increment: 1 } },
            select: { successfulSwaps: true },
          }),
        ])
        await Promise.all([
          db.user.update({ where: { id: tx.sellerId }, data: { swapScore: Math.min(4.0 + updatedSeller.successfulSwaps * 0.1, 5.0), swapVerified: updatedSeller.successfulSwaps >= 5 } }),
          db.user.update({ where: { id: tx.buyerId },  data: { swapScore: Math.min(4.0 + updatedBuyer.successfulSwaps * 0.1, 5.0),  swapVerified: updatedBuyer.successfulSwaps >= 5 } }),
        ])
        return { seller: updatedSeller.successfulSwaps, buyer: updatedBuyer.successfulSwaps }
      })
      void newCount
      try {
        await Promise.all([
          tx.seller.email && sendSwapCompletedEmail(tx.seller.email, tx.seller.name ?? 'Penjual', tx.listing.title),
          tx.buyer.email  && sendSwapCompletedEmail(tx.buyer.email,  tx.buyer.name  ?? 'Pembeli', tx.listing.title),
        ])
      } catch {}
      autoReleased++
    } catch {}
  }

  // 2. Send shipment reminder on day 3 (PENDING and not shipped yet)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const pendingShipment = await prisma.swapTransaction.findMany({
    where: { escrowStatus: 'PENDING', createdAt: { lt: threeDaysAgo } },
    include: {
      listing: { select: { id: true, title: true } },
      seller: { select: { email: true, name: true } },
      buyer:  { select: { email: true, name: true } },
    },
  })

  for (const tx of pendingShipment) {
    try {
      const jobs: Promise<unknown>[] = []
      if (!tx.sellerItemShipped && tx.seller.email) {
        jobs.push(sendSwapItemShippedEmail(
          tx.seller.email, tx.seller.name ?? 'Penjual', tx.listing.title,
          'Sistem BALLOUT', null, null, tx.listing.id,
        ))
      }
      if (tx.buyerItemShipped === false && tx.buyer.email) {
        jobs.push(sendSwapItemShippedEmail(
          tx.buyer.email, tx.buyer.name ?? 'Pembeli', tx.listing.title,
          'Sistem BALLOUT', null, null, tx.listing.id,
        ))
      }
      if (jobs.length > 0) { await Promise.all(jobs); reminders++ }
    } catch {}
  }

  // 3. Expire stale offers on closed/sold listings
  const staleOffers = await prisma.offer.findMany({
    where: {
      status: { in: ['PENDING', 'COUNTERED'] },
      listing: { status: { not: 'ACTIVE' } },
    },
    select: { id: true },
  })

  if (staleOffers.length > 0) {
    const result = await prisma.offer.updateMany({
      where: { id: { in: staleOffers.map(o => o.id) } },
      data: { status: 'EXPIRED' },
    })
    offersExpired = result.count
  }

  return NextResponse.json({ autoReleased, reminders, offersExpired })
}
