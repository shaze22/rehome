import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStripe, calculateFees } from '@/lib/stripe'
import { getDeliveryQuote } from '@/lib/courier'
import { sendPaymentReceivedEmail, sendPickupArrangeEmail } from '@/lib/resend'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const p = request.nextUrl.searchParams
  const listingId = p.get('listingId')
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required.' }, { status: 400 })
  }

  const courierServiceId = p.get('courierServiceId') ?? ''
  const buyerPostcode = p.get('buyerPostcode') ?? ''
  const buyerPhone = p.get('buyerPhone') ?? ''
  const buyerAddress = p.get('buyerAddress') ?? ''
  const courierName = p.get('courierName') ?? ''
  const courierService = p.get('courierService') ?? ''
  // Self-pickup fallback (for areas Lalamove does not cover): no courier, no delivery fee.
  const isPickup = p.get('pickup') === '1'

  const [listing, dbUser] = await Promise.all([
    prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: { select: { email: true, name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { creditBalance: true },
    }),
  ])

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  if (listing.currentBidder !== user.id) {
    return NextResponse.json({ error: 'You are not the winner of this auction.' }, { status: 403 })
  }

  // Re-calculate delivery fee server-side — never trust client-provided fee values
  let serverDeliveryFee = 0, serverDeliveryBase = 0, serverDeliveryMarkup = 0
  if (!isPickup && courierServiceId && buyerPostcode) {
    try {
      const quote = await getDeliveryQuote(listing.state, '', listing.weightKg, buyerPostcode, listing.category)
      const selected = quote.couriers.find(c => c.id === courierServiceId)
      if (selected) {
        serverDeliveryFee = selected.chargedPrice
        serverDeliveryBase = selected.basePrice
        serverDeliveryMarkup = selected.markup
      } else if (quote.couriers.length > 0) {
        // Fallback mode returns a single generic option — use it
        serverDeliveryFee = quote.couriers[0].chargedPrice
        serverDeliveryBase = quote.couriers[0].basePrice
        serverDeliveryMarkup = quote.couriers[0].markup
      }
    } catch {
      // If quote fails entirely, require delivery fee from client as last resort (capped)
      serverDeliveryFee = Math.min(parseFloat(p.get('deliveryFee') ?? '0'), 200)
      serverDeliveryBase = Math.min(parseFloat(p.get('deliveryBase') ?? '0'), 160)
      serverDeliveryMarkup = Math.min(parseFloat(p.get('deliveryMarkup') ?? '0'), 60)
    }
  }

  const creditAvailable = dbUser?.creditBalance ?? 0
  const creditToUse = Math.min(creditAvailable, Math.max(0, listing.currentBid - 1))
  const chargeAmount = listing.currentBid - creditToUse

  const { platformFee, sellerPayout } = calculateFees(chargeAmount)

  // FPX minimum is RM 1.00. A free win (RM0 bid) collected via self-pickup has nothing
  // to charge — Stripe can't create a RM0 session — so record the escrow directly and
  // let the parties coordinate collection + the buyer confirm receipt.
  const totalCents = Math.round(chargeAmount * 100) + Math.round(serverDeliveryFee * 100)
  if (totalCents < 100) {
    if (isPickup && chargeAmount === 0) {
      try {
        await prisma.$transaction([
          prisma.listing.update({ where: { id: listingId }, data: { status: 'SOLD' } }),
          prisma.transaction.create({
            data: {
              listingId, buyerId: user.id, sellerId: listing.sellerId,
              amount: 0, platformFee: 0, sellerPayout: 0,
              status: 'ESCROWED', pickupMethod: 'PICKUP',
              buyerPhone: buyerPhone || null,
            },
          }),
        ])
        const seller = listing.seller
        if (seller?.email) {
          await sendPickupArrangeEmail(seller.email, seller.name ?? 'Seller', listing.title, listingId, buyerPhone || null)
        }
      } catch (e: unknown) {
        // P2002 = transaction already exists (double submit) — fine, fall through to success
        if ((e as { code?: string }).code !== 'P2002') throw e
      }
      return NextResponse.redirect(new URL(`/listings/${listingId}?payment=success`, request.url))
    }
    return NextResponse.redirect(new URL(`/listings/${listingId}?payment=amount_too_low`, request.url))
  }

  const lineItems = []

  lineItems.push({
    price_data: {
      currency: 'myr',
      product_data: {
        name: listing.title,
        description: creditToUse > 0
          ? `KASSIM ⚡ FLASH BID — ${listing.category} (RM${creditToUse.toFixed(0)} credit applied)`
          : `KASSIM ⚡ FLASH BID — ${listing.category}`,
      },
      unit_amount: Math.round(chargeAmount * 100),
    },
    quantity: 1,
  })

  if (serverDeliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'myr',
        product_data: {
          name: `Delivery — ${courierName} ${courierService}`.trim(),
          description: `kassim.app delivery (incl. 30% platform handling fee)`,
        },
        unit_amount: Math.round(serverDeliveryFee * 100),
      },
      quantity: 1,
    })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'fpx'],
    customer_email: user.email ?? undefined,
    line_items: lineItems,
    // Group the charge so the seller payout (Stripe Connect Transfer) can be tied to it
    // on escrow release (separate charges & transfers).
    payment_intent_data: { transfer_group: `listing_${listingId}` },
    metadata: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      platformFee: platformFee.toString(),
      sellerPayout: sellerPayout.toString(),
      creditUsed: creditToUse.toString(),
      deliveryFee: serverDeliveryFee.toString(),
      deliveryBase: serverDeliveryBase.toString(),
      deliveryMarkup: serverDeliveryMarkup.toString(),
      pickupMethod: isPickup ? 'PICKUP' : 'DELIVERY',
      courierName,
      courierService,
      courierServiceId,
      buyerPostcode,
      buyerPhone,
      buyerAddress: buyerAddress.slice(0, 490),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=cancelled`,
  })

  return NextResponse.redirect(session.url!)
}
