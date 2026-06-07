import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      bids: { take: 1 },
      offers: { where: { status: { in: ['PENDING', 'COUNTERED'] } }, take: 1 },
    },
  })

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Only active listings can be edited' }, { status: 400 })

  const body = await request.json()
  const { title, description, category, condition, originalPrice, state, weightKg, mode, photos,
    swapWantedItem, swapWantedCategory, swapOpenOffers, swapAcceptCash, swapMinCashTopup,
    hasScratch, isFunctional, hasCompleteParts, hasOriginalBox, hasWarranty } = body

  const newMode = mode ?? listing.mode
  if (newMode !== listing.mode) {
    if (listing.mode === 'FLASH' && listing.bids.length > 0)
      return NextResponse.json({ error: 'Cannot switch mode — listing has existing bids' }, { status: 400 })
    if (listing.mode === 'SWAP' && listing.offers.length > 0)
      return NextResponse.json({ error: 'Cannot switch mode — listing has active offers' }, { status: 400 })
  }

  const modeSwitch: Record<string, unknown> = {}
  if (newMode !== listing.mode) {
    if (newMode === 'SWAP') {
      modeSwitch.endsAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
    } else {
      modeSwitch.endsAt = null
      modeSwitch.startingBid = 0
      modeSwitch.currentBid = 0
    }
  }

  const updated = await prisma.listing.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(condition !== undefined && { condition: Number(condition) }),
      ...(originalPrice !== undefined && { originalPrice: parseFloat(originalPrice) }),
      ...(state !== undefined && { state }),
      ...(weightKg !== undefined && { weightKg: parseFloat(weightKg) }),
      ...(mode !== undefined && { mode }),
      ...(photos !== undefined && { photos }),
      ...(swapWantedItem !== undefined && { swapWantedItem: swapWantedItem || null }),
      ...(swapWantedCategory !== undefined && { swapWantedCategory: swapWantedCategory || null }),
      ...(swapOpenOffers !== undefined && { swapOpenOffers }),
      ...(swapAcceptCash !== undefined && { swapAcceptCash }),
      ...(swapMinCashTopup !== undefined && { swapMinCashTopup: swapMinCashTopup ? parseFloat(swapMinCashTopup) : null }),
      ...(hasScratch !== undefined && { hasScratch }),
      ...(isFunctional !== undefined && { isFunctional }),
      ...(hasCompleteParts !== undefined && { hasCompleteParts }),
      ...(hasOriginalBox !== undefined && { hasOriginalBox }),
      ...(hasWarranty !== undefined && { hasWarranty }),
      ...modeSwitch,
    },
  })

  return NextResponse.json({ success: true, listing: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      bids:   { take: 1 },
      offers: { where: { status: { in: ['PENDING', 'COUNTERED'] } }, take: 1 },
    },
  })

  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  if (listing.status === 'ACTIVE') {
    // Cancel any pending offers before hiding
    await prisma.$transaction([
      prisma.offer.updateMany({
        where: { listingId: id, status: { in: ['PENDING', 'COUNTERED'] } },
        data: { status: 'REJECTED' },
      }),
      prisma.listing.update({ where: { id }, data: { status: 'CANCELLED', hiddenBySeller: true } }),
    ])
  } else {
    await prisma.listing.update({ where: { id }, data: { hiddenBySeller: true } })
  }

  return NextResponse.json({ success: true })
}
