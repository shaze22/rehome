import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  transactionId: z.string().min(1),
  resolution: z.enum(['complete', 'cancel']),
  note: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const { transactionId, resolution } = parsed.data

  const tx = await prisma.swapTransaction.findUnique({ where: { id: transactionId } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.escrowStatus !== 'DISPUTED') return NextResponse.json({ error: 'Transaksi ini tidak dalam pertikaian.' }, { status: 400 })

  const updated = await prisma.swapTransaction.update({
    where: { id: transactionId },
    data: {
      escrowStatus: resolution === 'complete' ? 'COMPLETED' : 'PENDING',
      resolvedAt: resolution === 'complete' ? new Date() : null,
    },
  })

  // If resolved as complete, update listing to SOLD (already SOLD but just ensure) and swap scores
  if (resolution === 'complete') {
    await prisma.$transaction([
      prisma.user.update({ where: { id: tx.sellerId }, data: { successfulSwaps: { increment: 1 } } }),
      prisma.user.update({ where: { id: tx.buyerId }, data: { successfulSwaps: { increment: 1 } } }),
    ])
  }

  return NextResponse.json({ transaction: updated })
}
