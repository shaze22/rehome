import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getStripe, calculateFees } from '@/lib/stripe'

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

  // Delivery params (buyer must select courier before checkout)
  const deliveryFee = parseFloat(p.get('deliveryFee') ?? '0')       // charged to buyer
  const deliveryBase = parseFloat(p.get('deliveryBase') ?? '0')     // cost to platform
  const deliveryMarkup = parseFloat(p.get('deliveryMarkup') ?? '0') // platform's cut
  const courierName = p.get('courierName') ?? ''
  const courierService = p.get('courierService') ?? ''
  const courierServiceId = p.get('courierServiceId') ?? ''
  const buyerPostcode = p.get('buyerPostcode') ?? ''
  const buyerPhone = p.get('buyerPhone') ?? ''
  const buyerAddress = p.get('buyerAddress') ?? ''

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

  const creditAvailable = dbUser?.creditBalance ?? 0
  const creditToUse = Math.min(creditAvailable, Math.max(0, listing.currentBid - 1))
  const chargeAmount = listing.currentBid - creditToUse

  const { platformFee, sellerPayout } = calculateFees(chargeAmount)

  const lineItems = []

  // Bid line item
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

  // Delivery line item (required — platform handles all shipping)
  if (deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: 'myr',
        product_data: {
          name: `Delivery — ${courierName} ${courierService}`.trim(),
          description: `kassim.app delivery (incl. 30% platform handling fee)`,
        },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    })
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: lineItems,
    metadata: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      platformFee: platformFee.toString(),
      sellerPayout: sellerPayout.toString(),
      creditUsed: creditToUse.toString(),
      // Delivery metadata
      deliveryFee: deliveryFee.toString(),
      deliveryBase: deliveryBase.toString(),
      deliveryMarkup: deliveryMarkup.toString(),
      courierName,
      courierService,
      courierServiceId,
      buyerPostcode,
      buyerPhone,
      buyerAddress: buyerAddress.slice(0, 490), // Stripe metadata max 500 chars per value
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}`,
  })

  return NextResponse.redirect(session.url!)
}
