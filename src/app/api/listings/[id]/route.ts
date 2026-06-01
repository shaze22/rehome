import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      bids:   { take: 1 },
      offers: { where: { status: { in: ['PENDING', 'COUNTERED'] } }, take: 1 },
    },
  })

  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Only active listings can be withdrawn.' }, { status: 400 })

  if (listing.mode === 'FLASH' && listing.bids.length > 0) {
    return NextResponse.json({ error: 'Listings with existing bids cannot be withdrawn.' }, { status: 400 })
  }
  if (listing.mode === 'SWAP' && listing.offers.length > 0) {
    return NextResponse.json({ error: 'Listings with active offers cannot be withdrawn.' }, { status: 400 })
  }

  await prisma.listing.update({ where: { id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({ success: true })
}
