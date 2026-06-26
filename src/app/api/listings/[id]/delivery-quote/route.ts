import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getDeliveryQuote } from '@/lib/courier'

// Cache quotes per (route, weight, size) for 5 min — Lalamove rates are stable for minutes,
// so repeated listing views / re-quotes don't hammer the external API.
const cachedDeliveryQuote = unstable_cache(
  (sellerState: string, buyerState: string, weightKg: number, buyerPostcode: string, category: string, l: number, w: number, h: number) =>
    getDeliveryQuote(sellerState, buyerState, weightKg, buyerPostcode || undefined, category, { l, w, h }),
  ['delivery-quote-v1'],
  { revalidate: 300 },
)

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buyerState = request.nextUrl.searchParams.get('buyerState') ?? ''
  const buyerPostcode = request.nextUrl.searchParams.get('buyerPostcode') ?? undefined

  if (!buyerState && !buyerPostcode) {
    return NextResponse.json({ error: 'buyerState or buyerPostcode is required.' }, { status: 400 })
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { state: true, weightKg: true, category: true, lengthCm: true, widthCm: true, heightCm: true },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }

  const result = await cachedDeliveryQuote(listing.state, buyerState, listing.weightKg, buyerPostcode ?? '',
    listing.category, listing.lengthCm ?? 0, listing.widthCm ?? 0, listing.heightCm ?? 0)
  return NextResponse.json({ ...result, sellerState: listing.state, buyerState, buyerPostcode })
}
