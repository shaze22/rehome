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

const FLASH_DURATION_MS = 30 * 60 * 1000

type ListingRow = {
  id: string; status: string; mode: string
  endsAt: Date | null; currentBid: number; currentBidder: string | null
  startingBid: number; firstBidAt: Date | null; sellerId: string; title: string
}

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

  // Wrap everything in a transaction with SELECT FOR UPDATE to prevent race conditions
  type TxResult =
    | { error: string; status: number }
    | { bid: { id: string; amount: number; listingId: string; bidderId: string; createdAt: Date; bidder: { name: string | null; rehomeScore: number } }; newEndsAt: Date; bidCount: number; prevBidder: string | null; listingTitle: string }

  let txResult: TxResult
  try {
    txResult = await prisma.$transaction(async (tx) => {
      // Lock the listing row — prevents concurrent bids from passing validation simultaneously
      const rows = await tx.$queryRaw<ListingRow[]>`
        SELECT id, status, mode, "endsAt", "currentBid", "currentBidder",
               "startingBid", "firstBidAt", "sellerId", title
        FROM "Listing" WHERE id = ${listingId} FOR UPDATE
      `
      const listing = rows[0]
      if (!listing) return { error: 'Listing not found.', status: 404 }
      if (listing.status !== 'ACTIVE') return { error: 'Auction is not active.', status: 400 }

      const now = new Date()
      if (listing.endsAt && now > new Date(listing.endsAt)) return { error: 'Auction has ended.', status: 400 }
      if (listing.sellerId === user.id) return { error: 'You cannot bid on your own listing.', status: 400 }
      if (listing.currentBidder === user.id) return { error: 'You cannot bid twice in a row.', status: 400 }

      const bidCount = await tx.bid.count({ where: { listingId } })

      if (bidCount === 0) {
        if (amount < listing.startingBid) {
          return { error: `Minimum bid is RM ${listing.startingBid}.`, status: 400 }
        }
      } else {
        if (amount <= listing.currentBid) {
          return { error: `Bid must be higher than RM ${listing.currentBid}.`, status: 400 }
        }
      }

      let newEndsAt: Date
      let firstBidAt = listing.firstBidAt ? new Date(listing.firstBidAt) : null

      if (bidCount === 0) {
        firstBidAt = now
        newEndsAt = new Date(now.getTime() + FLASH_DURATION_MS)
      } else {
        newEndsAt = new Date(listing.endsAt!)
      }

      const bid = await tx.bid.create({
        data: { amount, listingId, bidderId: user.id },
        include: { bidder: { select: { name: true, rehomeScore: true } } },
      })
      await tx.listing.update({
        where: { id: listingId },
        data: { currentBid: amount, currentBidder: user.id, endsAt: newEndsAt, firstBidAt },
      })

      return { bid, newEndsAt, bidCount, prevBidder: listing.currentBidder, listingTitle: listing.title }
    })
  } catch (err) {
    console.error('[bid] transaction error:', err)
    return NextResponse.json({ error: 'Failed to place bid. Please try again.' }, { status: 500 })
  }

  if ('error' in txResult) {
    return NextResponse.json({ error: txResult.error }, { status: txResult.status })
  }

  const { bid, newEndsAt, bidCount, prevBidder, listingTitle } = txResult

  // Broadcast via Supabase Realtime (outside transaction — non-critical)
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

  if (prevBidder && prevBidder !== user.id) {
    excludeFromWatchlist.add(prevBidder)
    try {
      const prev = await prisma.user.findUnique({
        where: { id: prevBidder },
        select: { email: true, name: true },
      })
      if (prev?.email) {
        await sendOutbidEmail(prev.email, prev.name ?? 'Pengguna', listingTitle, amount, listingId, newEndsAt)
      }
      sendPushToUser(prevBidder, {
        title: '⚡ You\'ve been outbid!',
        body: `${listingTitle} — current bid RM${amount}`,
        url: `/listings/${listingId}`,
        tag: `outbid-${listingId}`,
      }).catch(() => {})
    } catch {
      // non-critical
    }
  }

  try {
    const watchers = await prisma.watchlist.findMany({
      where: { listingId, userId: { notIn: [...excludeFromWatchlist] } },
      include: { user: { select: { email: true } } },
    })
    const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
    await Promise.all(
      watchers
        .filter(w => w.user.email)
        .map(w => sendWatchlistAlertEmail(w.user.email!, listingTitle, amount, `${BASE}/listings/${listingId}`))
    )
  } catch {
    // non-critical
  }

  return NextResponse.json({
    success: true,
    bid: { ...bid, createdAt: bid.createdAt.toISOString() },
    newEndsAt: newEndsAt.toISOString(),
    phase: bidCount === 0 ? 1 : 2,
  })
}
