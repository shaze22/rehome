import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendSwapOfferReceivedEmail } from '@/lib/resend'
import { sendPushToUser } from '@/lib/push'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

// Only accept photos uploaded to our own Supabase bucket — prevents SSRF/XSS via external URLs
const trustedPhotoUrl = z.string().url().refine(
  (url) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    return base ? url.startsWith(`${base}/storage/v1/object/public/rehome-photos/`) : true
  },
  { message: 'Photos must be uploaded via KASSIM.' }
)

const OfferSchema = z.object({
  listingId: z.string().min(1),
  offerType: z.enum(['CASH', 'SWAP', 'HYBRID']),
  offeredCashAmount: z.number().min(0).optional(),
  offeredItemPhotos: z.array(trustedPhotoUrl).max(5).default([]),
  offeredItemDesc: z.string().max(1000).optional(),
  offeredItemValue: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { allowed } = await rateLimit('offer', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many offers. Please try again in an hour.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = OfferSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const data = parsed.data

  const listing = await prisma.listing.findUnique({
    where: { id: data.listingId },
    select: { id: true, title: true, sellerId: true, mode: true, status: true, endsAt: true, swapAcceptCash: true },
  })

  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.mode !== 'SWAP') return NextResponse.json({ error: 'Only Swap listings accept offers.' }, { status: 400 })
  if (listing.sellerId === user.id) return NextResponse.json({ error: 'You cannot make an offer on your own listing.' }, { status: 400 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'This listing is no longer active.' }, { status: 400 })
  if (listing.endsAt && new Date(listing.endsAt) < new Date()) return NextResponse.json({ error: 'This listing has expired.' }, { status: 400 })

  if (data.offerType === 'CASH' && !listing.swapAcceptCash) {
    return NextResponse.json({ error: 'The owner does not accept cash-only offers.' }, { status: 400 })
  }

  if ((data.offerType === 'CASH' || data.offerType === 'HYBRID') && !data.offeredCashAmount) {
    return NextResponse.json({ error: 'Please enter a cash amount.' }, { status: 400 })
  }

  if ((data.offerType === 'SWAP' || data.offerType === 'HYBRID') && data.offeredItemPhotos.length === 0) {
    return NextResponse.json({ error: 'Please upload at least 1 photo of the offered item.' }, { status: 400 })
  }

  // Check for existing active offer from same user
  const existingOffer = await prisma.offer.findFirst({
    where: {
      listingId: data.listingId,
      bidderId: user.id,
      status: { in: ['PENDING', 'COUNTERED'] },
    },
  })

  if (existingOffer) {
    return NextResponse.json({ error: 'You already have an active offer on this listing. Wait for the owner to respond first.' }, { status: 400 })
  }

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, email: user.email!, name: user.user_metadata?.name ?? user.email?.split('@')[0] },
    update: {},
  })

  const totalValue = (data.offeredCashAmount ?? 0) + (data.offeredItemValue ?? 0)

  const offer = await prisma.offer.create({
    data: {
      listingId: data.listingId,
      bidderId: user.id,
      offerType: data.offerType,
      offeredCashAmount: data.offeredCashAmount ?? null,
      offeredItemPhotos: data.offeredItemPhotos,
      offeredItemDesc: data.offeredItemDesc ?? null,
      offeredItemValue: data.offeredItemValue ?? null,
      totalOfferValue: totalValue > 0 ? totalValue : null,
      message: data.message ?? null,
      expiresAt: listing.endsAt,
    },
    include: { bidder: { select: { name: true, rehomeScore: true, swapScore: true, successfulSwaps: true } } },
  })

  // Email + push seller
  try {
    const seller = await prisma.user.findUnique({ where: { id: listing.sellerId }, select: { email: true, name: true } })
    if (seller?.email) {
      await sendSwapOfferReceivedEmail(seller.email, seller.name ?? 'Pemilik', listing.title ?? data.listingId, data.offerType, data.listingId)
    }
    sendPushToUser(listing.sellerId, {
      title: '🔄 New offer received!',
      body: listing.title ?? 'Check your offer',
      url: `/listings/${data.listingId}`,
      tag: `offer-${data.listingId}`,
    }).catch(() => {})
  } catch {}

  return NextResponse.json({ offer }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  const myOffer = searchParams.get('myOffer') === 'true'

  if (!listingId) return NextResponse.json({ error: 'listingId is required.' }, { status: 400 })

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  })
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })

  if (myOffer) {
    const offer = await prisma.offer.findFirst({
      where: { listingId, bidderId: user.id, status: { in: ['PENDING', 'COUNTERED'] } },
      include: {
        bidder: { select: { name: true, rehomeScore: true, swapScore: true, successfulSwaps: true } },
        counterOffers: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    return NextResponse.json({ offer })
  }

  // Only seller can see all offers
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const offers = await prisma.offer.findMany({
    where: { listingId, parentOfferId: null },
    include: {
      bidder: { select: { name: true, rehomeScore: true, swapScore: true, successfulSwaps: true, swapVerified: true } },
      counterOffers: {
        orderBy: { createdAt: 'desc' },
        include: { bidder: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ offers })
}
