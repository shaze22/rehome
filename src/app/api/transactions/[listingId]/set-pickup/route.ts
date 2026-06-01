import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  method: z.enum(['DELIVERY', 'PICKUP']),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { method } = Schema.parse(body)

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.buyerId !== user.id) return NextResponse.json({ error: 'Bukan pembeli.' }, { status: 403 })
  if (tx.pickupMethod) return NextResponse.json({ error: 'Kaedah sudah dipilih.' }, { status: 400 })

  await prisma.transaction.update({
    where: { listingId },
    data: { pickupMethod: method },
  })

  return NextResponse.json({ success: true, method })
}
