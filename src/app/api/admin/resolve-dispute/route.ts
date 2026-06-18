import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  transactionId: z.string().min(1),
  resolution: z.enum(['complete', 'cancel']),
  note: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  const { allowed } = await rateLimit('admin', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many admin actions. Please slow down.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { transactionId, resolution } = parsed.data

  const tx = await prisma.swapTransaction.findUnique({ where: { id: transactionId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.escrowStatus !== 'DISPUTED') return NextResponse.json({ error: 'This transaction is not under dispute.' }, { status: 400 })

  const updated = await prisma.swapTransaction.update({
    where: { id: transactionId },
    data: {
      escrowStatus: resolution === 'complete' ? 'COMPLETED' : 'PENDING',
      resolvedAt: resolution === 'complete' ? new Date() : null,
    },
  })

  // If resolved as complete, update swap scores (same formula as /receive route)
  if (resolution === 'complete') {
    const [seller, buyer] = await Promise.all([
      prisma.user.findUnique({ where: { id: tx.sellerId }, select: { successfulSwaps: true } }),
      prisma.user.findUnique({ where: { id: tx.buyerId }, select: { successfulSwaps: true } }),
    ])

    const calcSwapScore = (newCount: number) => Math.min(4.0 + newCount * 0.1, 5.0)
    const sellerNewCount = (seller?.successfulSwaps ?? 0) + 1
    const buyerNewCount = (buyer?.successfulSwaps ?? 0) + 1

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tx.sellerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(sellerNewCount),
          swapVerified: sellerNewCount >= 5,
        },
      }),
      prisma.user.update({
        where: { id: tx.buyerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(buyerNewCount),
          swapVerified: buyerNewCount >= 5,
        },
      }),
    ])
  }

  void logAdminAction(user.id, `DISPUTE_${resolution.toUpperCase()}`, transactionId, 'SwapTransaction', { resolution })

  return NextResponse.json({ transaction: updated })
}
