import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAuctionWonEmail } from '@/lib/resend'

export const dynamic = 'force-dynamic'

// Called by Vercel Cron every minute
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find all active listings that have passed their end time
  const expiredListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lt: now },
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
      if (listing.currentBidder && listing.currentBid > 0) {
        // Has a winner
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'ENDED' },
        })

        // Notify winner
        try {
          const winner = await prisma.user.findUnique({
            where: { id: listing.currentBidder },
            select: { email: true, name: true },
          })
          if (winner?.email) {
            await sendAuctionWonEmail(
              winner.email,
              winner.name ?? 'Penawar',
              listing.title,
              listing.currentBid,
              listing.id,
            )
          }
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
