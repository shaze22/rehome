import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { logAdminAction } from '@/lib/audit'

function nextFriday8pmMYT(): Date {
  const now = new Date()
  // MYT = UTC+8
  const myt = new Date(now.getTime() + 8 * 3600000)
  const day = myt.getUTCDay() // 0=Sun, 5=Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const friday = new Date(myt)
  friday.setUTCDate(friday.getUTCDate() + daysUntilFriday)
  friday.setUTCHours(12, 0, 0, 0) // 20:00 MYT = 12:00 UTC
  return friday
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { listingId, featured } = await request.json()
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 })

  const data = featured
    ? { isFeatured: true, featuredAt: new Date(), featuredUntil: nextFriday8pmMYT() }
    : { isFeatured: false, featuredAt: null, featuredUntil: null }

  const listing = await prisma.listing.update({
    where: { id: listingId },
    data,
    select: { id: true, isFeatured: true, featuredAt: true, featuredUntil: true },
  })

  void logAdminAction(user.id, featured ? 'LISTING_FEATURED' : 'LISTING_UNFEATURED', listingId, 'Listing')

  return NextResponse.json(listing)
}
