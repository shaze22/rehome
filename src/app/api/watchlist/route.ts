import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({ listingId: z.string().min(1) })

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const { listingId } = parsed.data
  const existing = await prisma.watchlist.findUnique({ where: { userId_listingId: { userId: user.id, listingId } } })

  if (existing) {
    await prisma.watchlist.delete({ where: { userId_listingId: { userId: user.id, listingId } } })
    return NextResponse.json({ watching: false })
  } else {
    await prisma.watchlist.create({ data: { userId: user.id, listingId } })
    return NextResponse.json({ watching: true })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ items: [] })

  const listingId = request.nextUrl.searchParams.get('listingId')

  if (listingId) {
    const item = await prisma.watchlist.findUnique({ where: { userId_listingId: { userId: user.id, listingId } } })
    return NextResponse.json({ watching: !!item })
  }

  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: {
      listing: {
        include: { seller: { select: { name: true, rehomeScore: true, icVerified: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ items })
}
