import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { transactionId, note } = await request.json() as { transactionId: string; note?: string }
  if (!transactionId) return NextResponse.json({ error: 'transactionId required.' }, { status: 400 })

  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.sellerPaid) return NextResponse.json({ error: 'Already marked as paid.' }, { status: 400 })

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: { sellerPaid: true, sellerPaidAt: new Date(), payoutNote: note ?? null },
  })

  return NextResponse.json({ success: true, sellerPaidAt: updated.sellerPaidAt })
}
