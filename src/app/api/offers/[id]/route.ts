import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendSwapOfferAcceptedEmail, sendSwapOfferCounteredEmail } from '@/lib/resend'
import { sendPushToUser } from '@/lib/push'
import { z } from 'zod'

const CounterSchema = z.object({
  action: z.literal('counter'),
  offeredCashAmount: z.number().min(0).optional(),
  offeredItemPhotos: z.array(z.string().url()).max(5).optional(),
  offeredItemDesc: z.string().max(1000).optional(),
  offeredItemValue: z.number().min(0).optional(),
  message: z.string().max(500).optional(),
})

const ActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
})

const Schema = z.union([CounterSchema, ActionSchema])

async function getRootOffer(offerId: string) {
  let offer = await prisma.offer.findUnique({ where: { id: offerId } })
  while (offer?.parentOfferId) {
    offer = await prisma.offer.findUnique({ where: { id: offer.parentOfferId } })
  }
  return offer
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const data = parsed.data

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      listing: { select: { id: true, sellerId: true, endsAt: true, status: true } },
      bidder: { select: { id: true } },
    },
  })

  if (!offer) return NextResponse.json({ error: 'Tawaran tidak dijumpai.' }, { status: 404 })
  if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
    return NextResponse.json({ error: 'Tawaran ini sudah tidak aktif.' }, { status: 400 })
  }

  const isSeller = offer.listing.sellerId === user.id
  const isBidder = offer.bidder.id === user.id

  if (data.action === 'accept') {
    if (!isSeller) return NextResponse.json({ error: 'Hanya pemilik boleh terima tawaran.' }, { status: 403 })

    // Reject all other pending offers for this listing
    await prisma.offer.updateMany({
      where: { listingId: offer.listingId, id: { not: id }, status: { in: ['PENDING', 'COUNTERED'] } },
      data: { status: 'REJECTED' },
    })

    // Accept offer + create SwapTransaction + mark listing as SOLD (no more offers)
    const [updated] = await prisma.$transaction([
      prisma.offer.update({ where: { id }, data: { status: 'ACCEPTED' } }),
      prisma.listing.update({ where: { id: offer.listing.id }, data: { status: 'SOLD' } }),
      prisma.swapTransaction.create({
        data: {
          listingId: offer.listingId,
          acceptedOfferId: id,
          sellerId: offer.listing.sellerId,
          buyerId: offer.bidder.id,
          offerType: offer.offerType,
          // CASH offers: buyer doesn't ship anything (null = not applicable)
          buyerItemShipped: offer.offerType === 'CASH' ? null : false,
        },
      }),
    ])

    // Email + push buyer — fire-and-forget
    prisma.user.findUnique({ where: { id: offer.bidder.id }, select: { email: true, name: true } }).then(buyer => {
      if (buyer?.email) sendSwapOfferAcceptedEmail(buyer.email, buyer.name ?? 'Penawar', offer.listingId, offer.listingId).catch(() => {})
    })
    sendPushToUser(offer.bidder.id, {
      title: '🎉 Tawaran anda diterima!',
      body: 'Proses pertukaran kini bermula. Sedia hantar barang anda.',
      url: `/listings/${offer.listingId}`,
      tag: `accepted-${offer.listingId}`,
    }).catch(() => {})

    return NextResponse.json({ offer: updated })
  }

  if (data.action === 'reject') {
    if (!isSeller && !isBidder) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    const updated = await prisma.offer.update({
      where: { id },
      data: { status: 'REJECTED' },
    })
    return NextResponse.json({ offer: updated })
  }

  if (data.action === 'counter') {
    // Bidder or seller can counter
    if (!isSeller && !isBidder) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

    // Check round limit: find root offer and count chain
    const rootOffer = await getRootOffer(id)
    if (!rootOffer) return NextResponse.json({ error: 'Tawaran tidak dijumpai.' }, { status: 404 })

    const chainLength = await prisma.offer.count({
      where: {
        OR: [
          { id: rootOffer.id },
          { parentOfferId: rootOffer.id },
        ],
      },
    })

    if (chainLength >= 3) {
      return NextResponse.json({ error: 'Had maksimum 3 pusingan rundingan telah dicapai. Pemilik mesti terima atau tolak.' }, { status: 400 })
    }

    // Mark current offer as countered
    await prisma.offer.update({ where: { id }, data: { status: 'COUNTERED' } })

    const totalValue = ((data as z.infer<typeof CounterSchema>).offeredCashAmount ?? 0) +
                       ((data as z.infer<typeof CounterSchema>).offeredItemValue ?? 0)

    const counterOffer = await prisma.offer.create({
      data: {
        listingId: offer.listingId,
        bidderId: user.id,
        offerType: offer.offerType,
        offeredCashAmount: (data as z.infer<typeof CounterSchema>).offeredCashAmount ?? offer.offeredCashAmount ?? null,
        offeredItemPhotos: (data as z.infer<typeof CounterSchema>).offeredItemPhotos ?? offer.offeredItemPhotos,
        offeredItemDesc: (data as z.infer<typeof CounterSchema>).offeredItemDesc ?? offer.offeredItemDesc ?? null,
        offeredItemValue: (data as z.infer<typeof CounterSchema>).offeredItemValue ?? offer.offeredItemValue ?? null,
        totalOfferValue: totalValue > 0 ? totalValue : offer.totalOfferValue ?? null,
        message: (data as z.infer<typeof CounterSchema>).message ?? null,
        counterRounds: offer.counterRounds + 1,
        parentOfferId: id,
        expiresAt: offer.listing.endsAt,
      },
    })

    // Email + push the other party — fire-and-forget
    const recipientId = isSeller ? offer.bidder.id : offer.listing.sellerId
    prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, name: true } }).then(recipient => {
      if (recipient?.email) sendSwapOfferCounteredEmail(recipient.email, recipient.name ?? 'Pengguna', offer.listingId, offer.listingId, isSeller).catch(() => {})
    })
    sendPushToUser(recipientId, {
      title: '💬 Counter tawaran baru!',
      body: 'Semak syarat baru dan beri respons anda.',
      url: `/listings/${offer.listingId}`,
      tag: `counter-${offer.listingId}`,
    }).catch(() => {})

    return NextResponse.json({ offer: counterOffer }, { status: 201 })
  }

  return NextResponse.json({ error: 'Tindakan tidak sah.' }, { status: 400 })
}
