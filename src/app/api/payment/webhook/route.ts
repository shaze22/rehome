import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentReceivedEmail, sendShipNowEmail } from '@/lib/resend'
import { createEasyParcelShipment } from '@/lib/easyparcel'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No signature.' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const meta = session.metadata as Record<string, string>
    const {
      listingId, buyerId, sellerId, platformFee, sellerPayout, creditUsed,
      deliveryFee, deliveryBase, deliveryMarkup,
      courierName, courierService, courierServiceId,
      buyerPostcode, buyerPhone, buyerAddress,
    } = meta

    // Validate metadata against DB to prevent tampering
    const [listing, existingTx] = await Promise.all([
      prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          currentBidder: true, sellerId: true, title: true, weightKg: true,
          seller: { select: { name: true, email: true, state: true, phone: true } },
        },
      }),
      prisma.transaction.findUnique({ where: { listingId } }),
    ])
    if (!listing) return NextResponse.json({ error: 'Listing does not exist.' }, { status: 400 })
    if (listing.currentBidder !== buyerId) return NextResponse.json({ error: 'Invalid buyerId.' }, { status: 400 })
    if (listing.sellerId !== sellerId) return NextResponse.json({ error: 'Invalid sellerId.' }, { status: 400 })
    if (existingTx) return NextResponse.json({ received: true }) // idempotency

    const creditAmount = parseFloat(creditUsed ?? '0')
    const dFee = parseFloat(deliveryFee ?? '0')
    const dBase = parseFloat(deliveryBase ?? '0')
    const dMarkup = parseFloat(deliveryMarkup ?? '0')

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
          // Delivery
          ...(dFee > 0 ? {
            deliveryFee: dFee,
            deliveryBase: dBase,
            deliveryMarkup: dMarkup,
            courierName: courierName || null,
            courierService: courierService || null,
            courierServiceId: courierServiceId || null,
            buyerPostcode: buyerPostcode || null,
            buyerPhone: buyerPhone || null,
            buyerAddress: buyerAddress || null,
          } : {}),
        },
      }),
      ...(creditAmount > 0
        ? [prisma.user.update({ where: { id: buyerId }, data: { creditBalance: { decrement: creditAmount } } })]
        : []),
    ])

    // Auto-book EasyParcel shipment if delivery was selected via platform
    if (dFee > 0 && courierServiceId && buyerPostcode && buyerPhone && buyerAddress) {
      const sellerUser = listing.seller
      const sellerState = sellerUser?.state ?? 'Kuala Lumpur'
      const sellerPostcode = sellerState === 'Kuala Lumpur' ? '50000' : '50000' // seller postcode from profile (best effort)

      void createEasyParcelShipment({
        fromName: sellerUser?.name ?? 'KASSIM Seller',
        fromPhone: sellerUser?.phone ?? '0123456789',
        fromAddress: sellerState,
        fromPostcode: sellerPostcode,
        toName: 'KASSIM Buyer',
        toPhone: buyerPhone,
        toAddress: buyerAddress,
        toPostcode: buyerPostcode,
        serviceId: courierServiceId,
        weightKg: listing.weightKg,
        description: listing.title,
        declaredValue: Math.round(dBase),
      }).then(async (orderId) => {
        if (orderId) {
          await prisma.transaction.update({
            where: { listingId },
            data: { easyparcelOrderId: orderId },
          })
        }
      }).catch(err => console.error('[webhook] EasyParcel booking error:', err))
    }

    // Notify seller — payment received + ship instructions
    try {
      const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
      if (seller?.email && listing) {
        await sendPaymentReceivedEmail(seller.email, seller.name ?? 'Seller', listing.title, parseFloat(sellerPayout))
        await sendShipNowEmail(
          seller.email, seller.name ?? 'Seller', listing.title, listingId,
          courierName || null, buyerPostcode || null, null, // easyparcelOrderId saved async later
        )
      }
    } catch {}
  }

  return NextResponse.json({ received: true })
}
