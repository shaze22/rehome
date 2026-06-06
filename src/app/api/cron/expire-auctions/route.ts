import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAuctionWonEmail, sendAuctionExpiredSellerEmail, sendAuctionRelistedEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron every minute
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let processed = 0
  const errors: string[] = []

  // 1. Expire active auctions whose timer has run out
  const expiredListings = await prisma.listing.findMany({
    where: { status: 'ACTIVE', endsAt: { not: null, lt: now } },
    include: { seller: { select: { email: true, name: true } } },
  })

  for (const listing of expiredListings) {
    try {
      if (listing.currentBidder) {
        await prisma.listing.update({ where: { id: listing.id }, data: { status: 'ENDED' } })
        try {
          const winner = await prisma.user.findUnique({
            where: { id: listing.currentBidder },
            select: { email: true, name: true },
          })
          await Promise.all([
            winner?.email
              ? sendAuctionWonEmail(winner.email, winner.name ?? 'Penawar', listing.title, listing.currentBid, listing.id)
              : Promise.resolve(),
            listing.seller.email
              ? sendAuctionExpiredSellerEmail(listing.seller.email, listing.seller.name ?? 'Penjual', listing.title, listing.currentBid, listing.id)
              : Promise.resolve(),
          ])
        } catch { /* email failure non-critical */ }
      } else {
        await prisma.listing.update({ where: { id: listing.id }, data: { status: 'ENDED' } })
      }
      processed++
    } catch (err) {
      errors.push(`expire:${listing.id}: ${err}`)
    }
  }

  // 2. Re-list ENDED auctions where winner never paid after 24 hours
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const unpaidEnded = await prisma.listing.findMany({
    where: {
      status: 'ENDED',
      currentBidder: { not: null },
      endsAt: { not: null, lt: cutoff24h },
    },
    include: { seller: { select: { email: true, name: true } } },
  })

  for (const listing of unpaidEnded) {
    try {
      const existingTx = await prisma.transaction.findUnique({ where: { listingId: listing.id } })
      if (!existingTx) {
        // No payment — reset to ACTIVE so new bids can come in
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'ACTIVE', currentBid: 0, currentBidder: null, endsAt: null, firstBidAt: null },
        })
        if (listing.seller.email) {
          await sendAuctionRelistedEmail(listing.seller.email, listing.seller.name ?? 'Penjual', listing.title, listing.id).catch(() => {})
        }
        processed++
      }
    } catch (err) {
      errors.push(`relist:${listing.id}: ${err}`)
    }
  }

  // 3. Expire Flash listings with no bids after 14 days (stale, unbid listings)
  const cutoff14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const staleFlash = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      mode: 'FLASH',
      endsAt: null,
      createdAt: { lt: cutoff14d },
    },
  })

  for (const listing of staleFlash) {
    try {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: 'ENDED' } })
      processed++
    } catch (err) {
      errors.push(`stale:${listing.id}: ${err}`)
    }
  }

  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined })
}
