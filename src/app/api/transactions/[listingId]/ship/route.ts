import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  trackingNumber: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { trackingNumber } = Schema.parse(body)

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.sellerId !== user.id) return NextResponse.json({ error: 'Bukan penjual.' }, { status: 403 })
  if (tx.shippingStatus !== 'PENDING') return NextResponse.json({ error: 'Sudah dihantar.' }, { status: 400 })

  await prisma.transaction.update({
    where: { listingId },
    data: { shippingStatus: 'SHIPPED', trackingNumber: trackingNumber ?? null },
  })

  // Broadcast to buyer via Supabase Realtime
  await supabase.channel(`listing:${listingId}`).send({
    type: 'broadcast', event: 'item_shipped',
    payload: { listingId, trackingNumber },
  })

  return NextResponse.json({ success: true })
}
