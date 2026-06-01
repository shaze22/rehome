import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendPaymentReceivedEmail } from '@/lib/resend'

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.sellerId !== user.id) return NextResponse.json({ error: 'Bukan penjual.' }, { status: 403 })
  if (tx.pickupMethod !== 'PICKUP') return NextResponse.json({ error: 'Bukan mod ambil sendiri.' }, { status: 400 })
  if (tx.sellerPickupConfirmed) return NextResponse.json({ error: 'Sudah disahkan.' }, { status: 400 })

  await prisma.transaction.update({
    where: { listingId },
    data: {
      sellerPickupConfirmed: true,
      shippingStatus: 'DELIVERED',
      deliveryConfirmed: true,
      status: 'RELEASED',
    },
  })

  await prisma.user.update({
    where: { id: tx.sellerId },
    data: { rehomeScore: { increment: 5 } },
  })

  try {
    const seller = await prisma.user.findUnique({ where: { id: tx.sellerId }, select: { email: true, name: true } })
    const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } })
    if (seller?.email && listing) {
      await sendPaymentReceivedEmail(seller.email, seller.name ?? 'Penjual', listing.title, tx.sellerPayout)
    }
  } catch { /* email failure is non-critical */ }

  return NextResponse.json({ success: true })
}
