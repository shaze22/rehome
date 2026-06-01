import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'listingId diperlukan.' }, { status: 400 })

  const tx = await prisma.swapTransaction.findUnique({
    where: { listingId },
    include: {
      seller: { select: { id: true, name: true, rehomeScore: true, swapScore: true } },
      buyer: { select: { id: true, name: true, rehomeScore: true, swapScore: true } },
      acceptedOffer: {
        select: {
          offerType: true,
          offeredCashAmount: true,
          offeredItemPhotos: true,
          offeredItemDesc: true,
          offeredItemValue: true,
          totalOfferValue: true,
        },
      },
    },
  })

  if (!tx) return NextResponse.json({ transaction: null })

  // Only seller or buyer can view
  if (tx.sellerId !== user.id && tx.buyerId !== user.id) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  return NextResponse.json({ transaction: tx })
}
