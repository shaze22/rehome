import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendOutbidEmail, sendWatchlistAlertEmail } from '@/lib/resend'
import { sendPushToUser } from '@/lib/push'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const BidSchema = z.object({
  listingId: z.string().min(1),
  amount: z.number().int('Bid must be a whole number').min(0, 'Bid cannot be negative'),
})

// Flash Bid: fixed 30-minute window from first bid, no extensions
const FLASH_DURATION_MS = 30 * 60 * 1000

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to bid.' }, { status: 401 })
  }

  const { allowed } = await rateLimit('bid', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many bids. Please try again later.' }, { status: 429 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = BidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid data.' }, { status: 400 })
  }

  const { listingId, amount } = parsed.data

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      bids: { orderBy: { createdAt: 'desc' }, take: 1 },
      seller: { select: { id: true, email: true } },
      _count: { select: { bids: true } },
    },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Auction is not active.' }, { status: 400 })
  }

  const now = new Date()

  // If endsAt is set and already past, auction is over
  if (listing.endsAt && now > listing.endsAt) {
    return NextResponse.json({ error: 'Auction has ended.' }, { status: 400 })
  }

  if (listing.seller.id === user.id) {
    return NextResponse.json({ error: 'You cannot bid on your own listing.' }, { status: 400 })
  }

  if (listing.currentBidder === user.id) {
    return NextResponse.json({ error: 'You cannot bid twice in a row.' }, { status: 400 })
  }

  const bidCount = listing._count.bids

  // First bid: can be 0 or any amount >= startingBid
  // Counter bid: must be > currentBid
  if (bidCount === 0) {
    if (amount < listing.startingBid) {
      return NextResponse.json({ error: `Minimum bid is RM ${listing.startingBid}.` }, { status: 400 })
    }
  } else {
    if (amount <= listing.currentBid) {
      return NextResponse.json({ error: `Bid must be higher than RM ${listing.currentBid}.` }, { status: 400 })
    }
  }

  // Timer: first bid starts fixed 30-min window, counter bids do NOT extend timer
  let newEndsAt: Date
  let firstBidAt = listing.firstBidAt

  if (bidCount === 0) {
    // First bid — start fixed 30-minute countdown
    firstBidAt = now
    newEndsAt = new Date(now.getTime() + FLASH_DURATION_MS)
  } else {
    // Counter bids — keep the existing endsAt unchanged
    newEndsAt = listing.endsAt!
  }

  const [bid] = await prisma.$transaction([
    prisma.bid.create({
      data: { amount, listingId, bidderId: user.id },
      include: { bidder: { select: { name: true, rehomeScore: true } } },
    }),
    prisma.listing.update({
      where: { id: listingId },
      data: {
        currentBid: amount,
        currentBidder: user.id,
        endsAt: newEndsAt,
        firstBidAt: firstBidAt,
      },
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
      bidCount: bidCount + 1,
    },
  })

  const excludeFromWatchlist = new Set([user.id])

  // Notify previous highest bidder they've been outbid
  if (listing.currentBidder && listing.currentBidder !== user.id) {
    excludeFromWatchlist.add(listing.currentBidder)
    try {
      const prevBidder = await prisma.user.findUnique({
        where: { id: listing.currentBidder },
        select: { email: true, name: true },
      })
      if (prevBidder?.email) {
        await sendOutbidEmail(prevBidder.email, prevBidder.name ?? 'Pengguna', listing.title, amount, listingId, newEndsAt)
      }
      // Push notification
      sendPushToUser(listing.currentBidder, {
        title: '⚡ You\'ve been outbid!',
        body: `${listing.title} — current bid RM${amount}`,
        url: `/listings/${listingId}`,
        tag: `outbid-${listingId}`,
      }).catch(() => {})
    } catch {
      // Email/push failure shouldn't fail the bid
    }
  }

  // Notify watchlist users (exclude new bidder + outbid user)
  try {
    const watchers = await prisma.watchlist.findMany({
      where: { listingId, userId: { notIn: [...excludeFromWatchlist] } },
      include: { user: { select: { email: true } } },
    })
    const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
    await Promise.all(
      watchers
        .filter(w => w.user.email)
        .map(w => sendWatchlistAlertEmail(w.user.email!, listing.title, amount, `${BASE}/listings/${listingId}`))
    )
  } catch {
    // Email failure shouldn't fail the bid
  }

  return NextResponse.json({
    success: true,
    bid: { ...bid, createdAt: bid.createdAt.toISOString() },
    newEndsAt: newEndsAt.toISOString(),
    phase: bidCount === 0 ? 1 : 2,
  })
}
