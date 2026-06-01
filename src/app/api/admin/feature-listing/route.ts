import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { listingId, featured } = await request.json()
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 })

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data: { isFeatured: !!featured },
    select: { id: true, isFeatured: true },
  })

  return NextResponse.json(listing)
}
