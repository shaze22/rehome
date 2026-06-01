import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAuctionWonEmail, sendAuctionExpiredSellerEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron every minute
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all active listings that have a timer set and have passed their end time
  // Listings with endsAt = null are waiting for a first bid and should never expire
  const expiredListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { not: null, lt: now },
    },
    include: {
      seller: { select: { email: true, name: true } },
    },
  })

  if (expiredListings.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processed = 0
  const errors: string[] = []

  for (const listing of expiredListings) {
    try {
      if (listing.currentBidder) {
        // Has a winner (even RM0 bids are valid wins)
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'ENDED' },
        })

        // Notify winner + seller
        try {
          const [winner] = await Promise.all([
            prisma.user.findUnique({
              where: { id: listing.currentBidder },
              select: { email: true, name: true },
            }),
          ])
          await Promise.all([
            winner?.email
              ? sendAuctionWonEmail(winner.email, winner.name ?? 'Penawar', listing.title, listing.currentBid, listing.id)
              : Promise.resolve(),
            listing.seller.email
              ? sendAuctionExpiredSellerEmail(listing.seller.email, listing.seller.name ?? 'Penjual', listing.title, listing.currentBid, listing.id)
              : Promise.resolve(),
          ])
        } catch {
          // Email failure is non-critical
        }
      } else {
        // No bids — just expire it
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'ENDED' },
        })
      }
      processed++
    } catch (err) {
      errors.push(`${listing.id}: ${err}`)
    }
  }

  return NextResponse.json({ processed, errors: errors.length > 0 ? errors : undefined })
}
