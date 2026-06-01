import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

// Lalamove order status → our shippingStatus mapping
const STATUS_MAP: Record<string, string | null> = {
  ASSIGNING_DRIVER: null,        // driver belum ada, no update needed
  ON_GOING: null,                // driver otw pickup
  PICKED_UP: 'SHIPPED',         // penjual punye barang dah pickup
  COMPLETED: 'DELIVERED',       // barang sampai
  CANCELLED: null,
  EXPIRED: null,
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LALAMOVE_API_SECRET
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-lalamove-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Signature tidak sah.' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const event = payload.event as string
  const data = payload.data as Record<string, unknown> | undefined

  if (event === 'ORDER_STATUS_CHANGED' && data) {
    const lalamoveOrderId = data.orderId as string
    const status = data.status as string
    const newShippingStatus = STATUS_MAP[status]

    if (newShippingStatus && lalamoveOrderId) {
      // Match by lalamoveOrderId stored in trackingNumber
      const tx = await prisma.transaction.findFirst({
        where: { trackingNumber: lalamoveOrderId },
      })

      if (tx && tx.shippingStatus !== newShippingStatus) {
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { shippingStatus: newShippingStatus as 'SHIPPED' | 'DELIVERED' },
        })

        // Auto-confirm delivery when Lalamove reports COMPLETED
        if (newShippingStatus === 'DELIVERED') {
          await prisma.transaction.update({
            where: { id: tx.id },
            data: {
              deliveryConfirmed: true,
              status: 'RELEASED',
            },
          })
          await prisma.user.update({
            where: { id: tx.sellerId },
            data: { rehomeScore: { increment: 5 } },
          })
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
