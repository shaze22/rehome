import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendSwapItemShippedEmail } from '@/lib/resend'
import { sendPushToUser } from '@/lib/push'
import { z } from 'zod'

const ShipSchema = z.object({
  photos: z.array(z.string().url()).min(1).max(5),
  trackingNumber: z.string().min(1).max(100).optional(),
  courier: z.string().max(50).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = ShipSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const data = parsed.data

  const tx = await prisma.swapTransaction.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.escrowStatus === 'COMPLETED' || tx.escrowStatus === 'DISPUTED') {
    return NextResponse.json({ error: 'Transaction is already completed or disputed.' }, { status: 400 })
  }

  const isSeller = tx.sellerId === user.id
  const isBuyer = tx.buyerId === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  // Prevent double-shipping
  if (isSeller && tx.sellerItemShipped) return NextResponse.json({ error: 'You have already marked the item as shipped.' }, { status: 400 })
  if (isBuyer && tx.buyerItemShipped) return NextResponse.json({ error: 'You have already marked the item as shipped.' }, { status: 400 })
  if (isBuyer && tx.buyerItemShipped === null) return NextResponse.json({ error: 'Buyer does not need to ship for cash offers.' }, { status: 400 })

  // Build update payload
  const update: Record<string, unknown> = {}

  if (isSeller) {
    update.sellerItemShipped = true
    update.sellerPhotos = data.photos
    if (data.trackingNumber) update.sellerTracking = data.trackingNumber
    if (data.courier) update.sellerCourier = data.courier
  } else {
    update.buyerItemShipped = true
    update.buyerPhotos = data.photos
    if (data.trackingNumber) update.buyerTracking = data.trackingNumber
    if (data.courier) update.buyerCourier = data.courier
  }

  // Compute new status after update
  const newSellerShipped = isSeller ? true : tx.sellerItemShipped
  const newBuyerShipped = isBuyer ? true : tx.buyerItemShipped

  // CASH: only seller ships. SWAP/HYBRID: both ship.
  const allShipped = tx.offerType === 'CASH'
    ? newSellerShipped
    : newSellerShipped && newBuyerShipped === true

  if (allShipped) update.escrowStatus = 'BOTH_SHIPPED'

  const updated = await prisma.swapTransaction.update({
    where: { id },
    data: update,
    include: { listing: { select: { title: true } } },
  })

  // Email + push the recipient — fire-and-forget
  const recipientId = isSeller ? tx.buyerId : tx.sellerId
  const senderId = isSeller ? tx.sellerId : tx.buyerId
  Promise.all([
    prisma.user.findUnique({ where: { id: recipientId }, select: { email: true, name: true } }),
    prisma.user.findUnique({ where: { id: senderId }, select: { name: true } }),
  ]).then(([recipient, sender]) => {
    if (recipient?.email) {
      sendSwapItemShippedEmail(
        recipient.email, recipient.name ?? 'Pengguna',
        updated.listing.title, sender?.name ?? 'Pengguna',
        isSeller ? (update.sellerCourier as string ?? null) : (update.buyerCourier as string ?? null),
        isSeller ? (update.sellerTracking as string ?? null) : (update.buyerTracking as string ?? null),
        tx.listingId
      ).catch(() => {})
    }
    sendPushToUser(recipientId, {
      title: '📦 Item on its way!',
      body: updated.listing.title,
      url: `/listings/${tx.listingId}`,
      tag: `ship-${tx.id}`,
    }).catch(() => {})
  })

  return NextResponse.json({ transaction: updated })
}
