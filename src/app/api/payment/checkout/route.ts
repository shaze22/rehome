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

  const listingId = request.nextUrl.searchParams.get('listingId')
  if (!listingId) {
    return NextResponse.json({ error: 'listingId is required.' }, { status: 400 })
  }

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
  // Apply credit — max discount is (bidAmount - 1) to keep Stripe minimum of RM1
  const creditToUse = Math.min(creditAvailable, Math.max(0, listing.currentBid - 1))
  const chargeAmount = listing.currentBid - creditToUse

  const { platformFee, sellerPayout } = calculateFees(chargeAmount)

  const lineItems = [
    {
      price_data: {
        currency: 'myr',
        product_data: {
          name: listing.title,
          description: creditToUse > 0
            ? `KASSIM Auction — ${listing.category} (RM${creditToUse.toFixed(0)} credit ditolak)`
            : `KASSIM Auction — ${listing.category}`,
        },
        unit_amount: Math.round(chargeAmount * 100),
      },
      quantity: 1,
    },
  ]

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
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}`,
  })

  return NextResponse.redirect(session.url!)
}
