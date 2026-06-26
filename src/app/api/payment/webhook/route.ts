import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { sendPaymentReceivedEmail, sendShipNowEmail, sendDeliveryFailureEmail, sendPickupArrangeEmail } from '@/lib/resend'
import { createLalamoveOrder, postcodeToState } from '@/lib/lalamove'
import { createSendParcelOrder, isSendParcelService } from '@/lib/sendparcel'

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
    return NextResponse.json({ error: 'Invalid webhook.' }, { status: 500 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    // FPX (and other async methods) can complete checkout without immediate payment
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }
    const meta = session.metadata as Record<string, string>
    const {
      listingId, buyerId, sellerId, platformFee, sellerPayout, creditUsed,
      deliveryFee, deliveryBase, deliveryMarkup, pickupMethod,
      courierName, courierService, courierServiceId,
      buyerPostcode, buyerPhone, buyerAddress,
    } = meta
    const isPickup = pickupMethod === 'PICKUP'

    // Validate metadata against DB to prevent tampering
    const [listing, existingTx] = await Promise.all([
      prisma.listing.findUnique({
        where: { id: listingId },
        select: {
          currentBidder: true, sellerId: true, title: true, weightKg: true, state: true, category: true,
          seller: { select: { name: true, email: true, state: true, phone: true, postcode: true, savedAddress: true } },
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

    try {
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
            pickupMethod: isPickup ? 'PICKUP' : 'DELIVERY', // PICKUP = Lalamove-uncovered area, buyer collects from seller
            deliveryFee: dFee,
            deliveryBase: dBase,
            deliveryMarkup: dMarkup,
            courierName: courierName || null,
            courierService: courierService || null,
            courierServiceId: courierServiceId || null,
            buyerPostcode: buyerPostcode || null,
            buyerPhone: buyerPhone || null,
            buyerAddress: buyerAddress || null,
          },
        }),
        ...(creditAmount > 0
          ? [prisma.user.update({ where: { id: buyerId }, data: { creditBalance: { decrement: creditAmount } } })]
          : []),
      ])
    } catch (e: unknown) {
      // P2002 = unique constraint violation — concurrent webhook already created this transaction
      if ((e as { code?: string }).code === 'P2002') {
        return NextResponse.json({ received: true })
      }
      throw e
    }

    // Auto-book delivery (fire-and-forget — does not block webhook response).
    if (dFee > 0 && courierServiceId && buyerPostcode && buyerPhone && buyerAddress) {
      const sellerUser = listing.seller
      const sellerState = sellerUser?.state ?? 'Kuala Lumpur'

      if (isSendParcelService(courierServiceId)) {
        // Pos Laju (SendParcel) — standard nationwide parcel, courier pickup from seller.
        createSendParcelOrder({
          sender: {
            name: sellerUser?.name ?? 'KASSIM Seller',
            phone: sellerUser?.phone ?? '',
            address1: sellerUser?.savedAddress ?? '',
            state: sellerState,
            postcode: sellerUser?.postcode ?? '',
          },
          receiver: {
            name: 'KASSIM Buyer',
            phone: buyerPhone,
            address1: buyerAddress,
            state: postcodeToState(buyerPostcode) ?? sellerState,
            postcode: buyerPostcode,
          },
          weightKg: listing.weightKg,
          category: listing.category,
          itemDescription: listing.title,
          merchantOrderNumber: `KSM-${listingId}`,
        }).then(async (order) => {
          if (order?.trackingNo) {
            await prisma.transaction.update({
              where: { listingId },
              data: { trackingNumber: order.trackingNo, deliveryTrackingUrl: order.trackingUrl, posLabelUrl: order.labelUrl },
            })
          } else {
            console.error('[webhook] Pos/SendParcel returned no tracking for listingId:', listingId)
            const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
            if (seller?.email) {
              await sendDeliveryFailureEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, 'Pos Laju booking failed — please arrange shipping manually')
            }
          }
        }).catch(async (err: Error) => {
          console.error('[webhook] Pos/SendParcel booking error:', err.message)
          const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
          if (seller?.email) {
            await sendDeliveryFailureEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, err.message ?? 'Pos Laju booking error')
          }
        })
      } else {
      // Lalamove same-day — re-quotes internally for a fresh quotationId before placing.
      createLalamoveOrder({
        sellerState,
        buyerState: '',
        buyerPostcode,
        weightKg: listing.weightKg,
        fromName: sellerUser?.name ?? 'KASSIM Seller',
        fromPhone: sellerUser?.phone ?? '',
        toName: 'KASSIM Buyer',
        toPhone: buyerPhone,
        toAddress: buyerAddress,
        remarks: listing.title,
      }).then(async (order) => {
        if (order?.orderId) {
          await prisma.transaction.update({
            where: { listingId },
            data: { lalamoveOrderId: order.orderId, deliveryTrackingUrl: order.shareUrl },
          })
        } else {
          console.error('[webhook] Lalamove returned no orderId for listingId:', listingId)
          const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
          if (seller?.email) {
            await sendDeliveryFailureEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, 'Lalamove booking failed — please arrange pickup manually')
          }
        }
      }).catch(async (err: Error) => {
        console.error('[webhook] Lalamove booking error:', err.message)
        const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
        if (seller?.email) {
          await sendDeliveryFailureEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, err.message ?? 'Lalamove booking error')
        }
      })
      }
    }

    // Notify seller — payment received + ship instructions
    try {
      const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { email: true, name: true } })
      if (seller?.email && listing) {
        await sendPaymentReceivedEmail(seller.email, seller.name ?? 'Seller', listing.title, parseFloat(sellerPayout))
        if (isPickup) {
          await sendPickupArrangeEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, buyerPhone || null)
        } else {
          await sendShipNowEmail(
            seller.email, seller.name ?? 'Seller', listing.title, listingId,
            courierName || null, buyerPostcode || null, null, // delivery order id saved async later
          )
        }
      }
    } catch {}
  }

  return NextResponse.json({ received: true })
}
