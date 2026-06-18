import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const { listingId, rating, comment } = parsed.data

  const tx = await prisma.transaction.findUnique({ where: { listingId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.buyerId !== user.id) return NextResponse.json({ error: 'Only the buyer can submit a review.' }, { status: 403 })
  if (!tx.deliveryConfirmed) return NextResponse.json({ error: 'Please confirm receipt of the item first.' }, { status: 400 })

  const existing = await prisma.review.findFirst({ where: { listingId, reviewerId: user.id } })
  if (existing) return NextResponse.json({ error: 'Review already submitted.' }, { status: 400 })

  const review = await prisma.review.create({
    data: { listingId, reviewerId: user.id, sellerId: tx.sellerId, rating, comment },
  })

  // Recalculate seller's score using DB-side aggregation (avoids unbounded fetch)
  const agg = await prisma.review.aggregate({
    where: { sellerId: tx.sellerId },
    _avg: { rating: true },
  })
  const avgRating = agg._avg.rating ?? 3
  const newScore = Math.min(100, Math.round(50 + (avgRating - 3) * 15))
  await prisma.user.update({ where: { id: tx.sellerId }, data: { rehomeScore: newScore } })

  return NextResponse.json({ review }, { status: 201 })
}
