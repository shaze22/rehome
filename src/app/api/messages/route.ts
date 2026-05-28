import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  listingId: z.string().min(1),
  content: z.string().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak sah.' }, { status: 400 })

  const { listingId, content } = parsed.data

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true } })
  if (!listing) return NextResponse.json({ error: 'Listing tidak dijumpai.' }, { status: 404 })

  const msg = await prisma.message.create({
    data: { listingId, senderId: user.id, content },
    include: { sender: { select: { name: true, avatar: true } } },
  })

  await supabase.channel(`chat:${listingId}`).send({
    type: 'broadcast', event: 'new_message',
    payload: { ...msg, createdAt: msg.createdAt.toISOString() },
  })

  return NextResponse.json({ message: { ...msg, createdAt: msg.createdAt.toISOString() } }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const listingId = request.nextUrl.searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'listingId diperlukan.' }, { status: 400 })

  const messages = await prisma.message.findMany({
    where: { listingId },
    include: { sender: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ messages })
}
