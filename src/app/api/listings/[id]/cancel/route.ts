import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { sellerId: true, status: true, currentBidder: true },
  })
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Not your listing.' }, { status: 403 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Only active listings can be cancelled.' }, { status: 400 })
  if (listing.currentBidder) return NextResponse.json({ error: 'Cannot cancel a listing with active bids.' }, { status: 400 })

  await prisma.listing.update({ where: { id }, data: { status: 'CANCELLED' } })

  return NextResponse.json({ success: true })
}
