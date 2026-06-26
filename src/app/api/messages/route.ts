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
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const { listingId, content } = parsed.data

  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { id: true, status: true } })
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })

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
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const listingId = request.nextUrl.searchParams.get('listingId')
  if (!listingId) return NextResponse.json({ error: 'listingId is required.' }, { status: 400 })

  // Only the seller or a chat participant (someone who messaged / bid / offered on this
  // listing) may read the private negotiation — otherwise any logged-in user could enumerate
  // listing ids and read everyone's chats (phone numbers, addresses shared there).
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } })
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.sellerId !== user.id) {
    const [m, b, o] = await Promise.all([
      prisma.message.findFirst({ where: { listingId, senderId: user.id }, select: { id: true } }),
      prisma.bid.findFirst({ where: { listingId, bidderId: user.id }, select: { id: true } }),
      prisma.offer.findFirst({ where: { listingId, bidderId: user.id }, select: { id: true } }),
    ])
    if (!m && !b && !o) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })
  }

  // Fetch last 100 messages desc, reverse to restore chronological order for client
  const raw = await prisma.message.findMany({
    where: { listingId },
    include: { sender: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const messages = raw.reverse()

  return NextResponse.json({ messages })
}
