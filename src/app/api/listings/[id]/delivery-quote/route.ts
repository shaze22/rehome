import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDeliveryQuote } from '@/lib/courier'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buyerState = request.nextUrl.searchParams.get('buyerState') ?? ''
  const buyerPostcode = request.nextUrl.searchParams.get('buyerPostcode') ?? undefined

  if (!buyerState && !buyerPostcode) {
    return NextResponse.json({ error: 'buyerState or buyerPostcode is required.' }, { status: 400 })
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { state: true, weightKg: true },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  const result = await getDeliveryQuote(listing.state, buyerState, listing.weightKg, buyerPostcode)
  return NextResponse.json({ ...result, sellerState: listing.state, buyerState, buyerPostcode })
}
