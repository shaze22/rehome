import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendOutbidEmail } from '@/lib/resend'
import { z } from 'zod'

const BidSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().int('Tawaran mesti nombor bulat').positive(),
})

const BID_TIMER_RESET_MINUTES = 3
const MAX_TIMER_CAP_MINUTES = 10

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sila log masuk untuk membida.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Badan permintaan tidak sah.' }, { status: 400 })
  }

  const parsed = BidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak sah.' }, { status: 400 })
  }

  const { listingId, amount } = parsed.data

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      bids: { orderBy: { createdAt: 'desc' }, take: 1 },
      seller: { select: { id: true, email: true } },
    },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing tidak dijumpai.' }, { status: 404 })
  }

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Lelongan tidak aktif.' }, { status: 400 })
  }

  if (new Date() > listing.endsAt) {
    return NextResponse.json({ error: 'Lelongan telah tamat.' }, { status: 400 })
  }

  if (listing.seller.id === user.id) {
    return NextResponse.json({ error: 'Anda tidak boleh membida barangan anda sendiri.' }, { status: 400 })
  }

  if (listing.currentBidder === user.id) {
    return NextResponse.json({ error: 'Anda tidak boleh membida dua kali berturut-turut.' }, { status: 400 })
  }

  const minBid = listing.currentBid > 0 ? listing.currentBid + 1 : Math.max(listing.startingBid, 1)
  if (amount < minBid) {
    return NextResponse.json({ error: `Tawaran minimum ialah RM ${minBid}.` }, { status: 400 })
  }

  // Progressive timer reset
  const now = new Date()
  const timeLeft = listing.endsAt.getTime() - now.getTime()
  const capMs = MAX_TIMER_CAP_MINUTES * 60 * 1000
  let newEndsAt = listing.endsAt
  if (timeLeft < capMs) {
    newEndsAt = new Date(now.getTime() + BID_TIMER_RESET_MINUTES * 60 * 1000)
    if (newEndsAt > new Date(listing.endsAt.getTime() + capMs)) {
      newEndsAt = listing.endsAt
    }
  }

  const [bid] = await prisma.$transaction([
    prisma.bid.create({
      data: { amount, listingId, bidderId: user.id },
      include: { bidder: { select: { name: true, rehomeScore: true } } },
    }),
    prisma.listing.update({
      where: { id: listingId },
      data: { currentBid: amount, currentBidder: user.id, endsAt: newEndsAt },
    }),
  ])

  // Broadcast via Supabase Realtime
  await supabase.channel(`listing:${listingId}`).send({
    type: 'broadcast',
    event: 'new_bid',
    payload: {
      bid: { ...bid, createdAt: bid.createdAt.toISOString() },
      currentBid: amount,
      currentBidder: user.id,
      endsAt: newEndsAt.toISOString(),
    },
  })

  // Send outbid email to previous highest bidder
  if (listing.currentBidder && listing.currentBidder !== user.id) {
    try {
      const prevBidder = await prisma.user.findUnique({
        where: { id: listing.currentBidder },
        select: { email: true, name: true },
      })
      if (prevBidder?.email) {
        await sendOutbidEmail(prevBidder.email, prevBidder.name ?? 'Pengguna', listing.title, amount)
      }
    } catch {
      // Email failure shouldn't fail the bid
    }
  }

  return NextResponse.json({
    success: true,
    bid: { ...bid, createdAt: bid.createdAt.toISOString() },
    newEndsAt: newEndsAt.toISOString(),
  })
}
