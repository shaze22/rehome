import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentReceivedEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Tiada tandatangan.' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook tidak sah.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { listingId, buyerId, sellerId, platformFee, sellerPayout } = session.metadata as Record<string, string>

    // Validate metadata against DB to prevent tampering
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { transactions: { take: 1 } },
    })
    if (!listing) return NextResponse.json({ error: 'Listing tidak wujud.' }, { status: 400 })
    if (listing.currentBidder !== buyerId) return NextResponse.json({ error: 'buyerId tidak sah.' }, { status: 400 })
    if (listing.sellerId !== sellerId) return NextResponse.json({ error: 'sellerId tidak sah.' }, { status: 400 })
    // Idempotency: ignore duplicate webhook
    if (listing.transactions.length > 0) return NextResponse.json({ received: true })

    await prisma.$transaction([
      prisma.listing.update({
        where: { id: listingId },
        data: { status: 'SOLD' },
      }),
      prisma.transaction.create({
        data: {
          listingId,
          buyerId,
          sellerId,
          amount: (session.amount_total ?? 0) / 100,
          platformFee: parseFloat(platformFee),
          sellerPayout: parseFloat(sellerPayout),
          stripePaymentId: session.payment_intent as string,
          status: 'ESCROWED',
        },
      }),
    ])

    // Notify seller
    try {
      const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { title: true, sellerId: true } })
      const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
      if (seller?.email && listing) {
        await sendPaymentReceivedEmail(seller.email, seller.name ?? 'Penjual', listing.title, parseFloat(sellerPayout))
      }
    } catch {}
  }

  return NextResponse.json({ received: true })
}
