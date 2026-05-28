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
    return NextResponse.json({ error: 'listingId diperlukan.' }, { status: 400 })
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { email: true, name: true } } },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing tidak dijumpai.' }, { status: 404 })
  }

  if (listing.currentBidder !== user.id) {
    return NextResponse.json({ error: 'Anda bukan pemenang lelongan ini.' }, { status: 403 })
  }

  const { platformFee, sellerPayout } = calculateFees(listing.currentBid)

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'myr',
          product_data: {
            name: listing.title,
            description: `Lelongan BALLOUT — ${listing.category}`,
          },
          unit_amount: Math.round(listing.currentBid * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      platformFee: platformFee.toString(),
      sellerPayout: sellerPayout.toString(),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}`,
  })

  return NextResponse.redirect(session.url!)
}
