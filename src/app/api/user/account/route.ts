import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

// PDPA 2010 — user right to erasure
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const userId = user.id

  // Prevent deletion if user has active ESCROWED transactions (money in transit)
  const activeEscrow = await prisma.transaction.findFirst({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }], status: 'ESCROWED' },
    select: { id: true },
  })
  if (activeEscrow) {
    return NextResponse.json(
      { error: 'Cannot delete account while a payment is in escrow. Please complete or dispute the transaction first.' },
      { status: 409 }
    )
  }

  const activeSwapEscrow = await prisma.swapTransaction.findFirst({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      escrowStatus: { in: ['PENDING', 'BOTH_SHIPPED'] },
    },
    select: { id: true },
  })
  if (activeSwapEscrow) {
    return NextResponse.json(
      { error: 'Cannot delete account while a swap is in progress. Please complete or dispute the swap first.' },
      { status: 409 }
    )
  }

  // 1. Cancel all active listings
  await prisma.listing.updateMany({
    where: { sellerId: userId, status: 'ACTIVE' },
    data: { status: 'CANCELLED', hiddenBySeller: true },
  })

  // 2. Reject all pending offers made by this user
  await prisma.offer.updateMany({
    where: { bidderId: userId, status: { in: ['PENDING', 'COUNTERED'] } },
    data: { status: 'REJECTED' },
  })

  // 3. Delete purely personal data (no business impact)
  await prisma.$transaction([
    prisma.pushSubscription.deleteMany({ where: { userId } }),
    prisma.watchlist.deleteMany({ where: { userId } }),
    prisma.message.deleteMany({ where: { senderId: userId } }),
  ])

  // 4. Anonymize user record — keep row for FK integrity (transactions, bids, reviews).
  //    Capture the IC photo first so we can purge the sensitive file from storage.
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { icPhoto: true } })
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: 'Deleted User',
      email: `deleted-${userId}@kassim.app`,
      avatar: null,
      phone: null,
      postcode: null,
      savedAddress: null,
      referralCode: null,
      icPhoto: null,
      icVerified: false,
      icStatus: 'UNVERIFIED',
    },
  })

  // 5. Delete Supabase auth account + purge the IC image (service role required)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  if (before?.icPhoto) {
    try {
      if (before.icPhoto.startsWith('http')) {
        const m = before.icPhoto.split('/rehome-photos/')[1]   // legacy public upload
        if (m) await admin.storage.from('rehome-photos').remove([m])
      } else {
        await admin.storage.from('ic-verification').remove([before.icPhoto])
      }
    } catch (e) { console.error('[account-delete] IC purge failed:', e) }
  }
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId)
  if (deleteAuthError) {
    console.error('[account-delete] auth deletion failed:', deleteAuthError.message)
    // Anonymization already done — log but don't fail (user data is cleared)
  }

  return NextResponse.json({ success: true })
}
