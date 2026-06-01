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
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      bids:   { take: 1 },
      offers: { where: { status: { in: ['PENDING', 'COUNTERED'] } }, take: 1 },
    },
  })

  if (!listing) return NextResponse.json({ error: 'Listing tidak dijumpai.' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Hanya listing aktif boleh ditarik balik.' }, { status: 400 })

  if (listing.mode === 'FLASH' && listing.bids.length > 0) {
    return NextResponse.json({ error: 'Listing yang sudah ada tawaran tidak boleh ditarik balik.' }, { status: 400 })
  }
  if (listing.mode === 'SWAP' && listing.offers.length > 0) {
    return NextResponse.json({ error: 'Listing yang sudah ada tawaran aktif tidak boleh ditarik balik.' }, { status: 400 })
  }

  await prisma.listing.update({ where: { id }, data: { status: 'CANCELLED' } })
  return NextResponse.json({ success: true })
}
