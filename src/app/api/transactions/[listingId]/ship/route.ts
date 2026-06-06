import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendBuyerShippedEmail } from '@/lib/resend'
import { z } from 'zod'

const Schema = z.object({
  trackingNumber: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { trackingNumber } = Schema.parse(body)

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.sellerId !== user.id) return NextResponse.json({ error: 'Not the seller.' }, { status: 403 })
  if (tx.shippingStatus !== 'PENDING') return NextResponse.json({ error: 'Already shipped.' }, { status: 400 })

  await prisma.transaction.update({
    where: { listingId },
    data: { shippingStatus: 'SHIPPED', trackingNumber: trackingNumber ?? null },
  })

  // Broadcast to buyer via Supabase Realtime
  await supabase.channel(`listing:${listingId}`).send({
    type: 'broadcast', event: 'item_shipped',
    payload: { listingId, trackingNumber },
  })

  // Notify buyer by email
  try {
    const [buyer, listing] = await Promise.all([
      prisma.user.findUnique({ where: { id: tx.buyerId }, select: { email: true, name: true } }),
      prisma.listing.findUnique({ where: { id: listingId }, select: { title: true } }),
    ])
    if (buyer?.email && listing) {
      await sendBuyerShippedEmail(buyer.email, buyer.name ?? 'Buyer', listing.title, trackingNumber ?? null, listingId)
    }
  } catch {
    // non-critical
  }

  return NextResponse.json({ success: true })
}
