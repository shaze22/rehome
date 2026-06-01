import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendAuctionWonEmail } from '@/lib/resend'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, endsAt: true, currentBid: true, currentBidder: true },
  })

  if (!listing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ already: true, status: listing.status })
  if (!listing.endsAt || listing.endsAt > new Date()) return NextResponse.json({ active: true })

  await prisma.listing.update({ where: { id }, data: { status: 'ENDED' } })

  if (listing.currentBidder) {
    try {
      const winner = await prisma.user.findUnique({
        where: { id: listing.currentBidder },
        select: { email: true, name: true },
      })
      if (winner?.email) {
        await sendAuctionWonEmail(winner.email, winner.name ?? 'Penawar', listing.title, listing.currentBid, listing.id)
      }
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ expired: true })
}
