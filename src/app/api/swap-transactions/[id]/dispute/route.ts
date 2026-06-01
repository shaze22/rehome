import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const DisputeSchema = z.object({
  reason: z.string().min(10).max(1000),
  evidence: z.array(z.string().url()).max(5).default([]),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = DisputeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const tx = await prisma.swapTransaction.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.escrowStatus === 'COMPLETED') return NextResponse.json({ error: 'Transaksi sudah selesai, pertikaian tidak boleh difailkan.' }, { status: 400 })
  if (tx.escrowStatus === 'DISPUTED') return NextResponse.json({ error: 'Pertikaian sudah pun difailkan.' }, { status: 400 })

  const isSeller = tx.sellerId === user.id
  const isBuyer = tx.buyerId === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  const updated = await prisma.swapTransaction.update({
    where: { id },
    data: {
      escrowStatus: 'DISPUTED',
      disputeReason: parsed.data.reason,
      disputeEvidence: parsed.data.evidence,
    },
  })

  return NextResponse.json({ transaction: updated })
}
