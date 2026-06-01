import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDeliveryQuote } from '@/lib/easyparcel'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const buyerState = request.nextUrl.searchParams.get('buyerState')

  if (!buyerState) {
    return NextResponse.json({ error: 'buyerState diperlukan.' }, { status: 400 })
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { state: true, weightKg: true },
  })

  if (!listing) {
    return NextResponse.json({ error: 'Listing tidak dijumpai.' }, { status: 404 })
  }

  const result = await getDeliveryQuote(listing.state, buyerState, listing.weightKg)
  return NextResponse.json({ ...result, sellerState: listing.state, buyerState })
}
