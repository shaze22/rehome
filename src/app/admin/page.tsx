import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { AdminPanel } from '@/components/admin/AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (dbUser?.role !== 'ADMIN') redirect('/dashboard')

  const [
    pendingICs, recentListings,
    totalUsers, activeListings, soldListings, endedListings,
    volumeResult, totalBids, totalMessages, avgRatingResult,
    recentUsers, allUsers, disputedSwaps,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { icStatus: 'PENDING' },
      select: { id: true, name: true, email: true, icPhoto: true, icStatus: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.listing.findMany({
      include: {
        seller: { select: { name: true, icVerified: true } },
        _count: { select: { bids: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.user.count(),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({ where: { status: 'SOLD' } }),
    prisma.listing.count({ where: { status: 'ENDED' } }),
    prisma.transaction.aggregate({ _sum: { amount: true, platformFee: true } }),
    prisma.bid.count(),
    prisma.message.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, name: true, email: true, role: true, rehomeScore: true, createdAt: true },
    }),
    // All beta users — ordered by join date, limited to 200
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, name: true, email: true, role: true, rehomeScore: true, swapScore: true, icVerified: true, createdAt: true, _count: { select: { listings: true } } },
    }),
    // Disputed swap transactions
    prisma.swapTransaction.findMany({
      where: { escrowStatus: 'DISPUTED' },
      include: {
        listing: { select: { id: true, title: true } },
        seller: { select: { id: true, name: true, email: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ])

  const totalVolume = volumeResult._sum.amount ?? 0
  const totalRevenue = volumeResult._sum.platformFee ?? 0
  const avgRating = avgRatingResult._avg.rating ?? 0

  // Single raw SQL join to get pending payouts — avoids N+1 queries
  type RawPayout = {
    id: string; listingId: string; sellerId: string; buyerId: string
    amount: number; sellerPayout: number; courierName: string | null
    updatedAt: Date; sellerPaid: boolean; payoutNote: string | null
    listing_id: string; listing_title: string
    seller_id: string; seller_name: string | null; seller_email: string
    buyer_id: string; buyer_name: string | null; buyer_email: string
  }
  const rawPayouts = await prisma.$queryRaw<RawPayout[]>`
    SELECT
      t.id, t."listingId", t."sellerId", t."buyerId", t.amount, t."sellerPayout",
      t."courierName", t."updatedAt", t."sellerPaid", t."payoutNote",
      l.id AS listing_id, l.title AS listing_title,
      s.id AS seller_id, s.name AS seller_name, s.email AS seller_email,
      b.id AS buyer_id, b.name AS buyer_name, b.email AS buyer_email
    FROM "Transaction" t
    LEFT JOIN "Listing" l ON l.id = t."listingId"
    LEFT JOIN "User" s ON s.id = t."sellerId"
    LEFT JOIN "User" b ON b.id = t."buyerId"
    WHERE t.status = 'RELEASED' AND t."sellerPaid" = false
    ORDER BY t."updatedAt" DESC
  `
  const enrichedPayouts = rawPayouts.map(row => ({
    id: row.id,
    listingId: row.listingId,
    sellerId: row.sellerId,
    buyerId: row.buyerId,
    amount: Number(row.amount),
    sellerPayout: Number(row.sellerPayout),
    courierName: row.courierName,
    updatedAt: row.updatedAt,
    sellerPaid: row.sellerPaid,
    payoutNote: row.payoutNote,
    listing: { id: row.listing_id, title: row.listing_title },
    seller: { id: row.seller_id, name: row.seller_name, email: row.seller_email },
    buyer: { id: row.buyer_id, name: row.buyer_name, email: row.buyer_email },
  }))

  // IC photos live in a PRIVATE bucket — generate short-lived signed URLs (service role) so
  // only admins can view them. Legacy public URLs (old uploads) pass through unchanged.
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const pendingICsSigned = await Promise.all(pendingICs.map(async (u) => {
    let icPhotoUrl: string | null = null
    if (u.icPhoto) {
      if (u.icPhoto.startsWith('http')) icPhotoUrl = u.icPhoto
      else {
        const { data } = await supabaseAdmin.storage.from('ic-verification').createSignedUrl(u.icPhoto, 3600)
        icPhotoUrl = data?.signedUrl ?? null
      }
    }
    return { ...u, icPhotoUrl }
  }))

  return (
    <AdminPanel
      pendingICs={pendingICsSigned as any}
      recentListings={recentListings as any}
      recentUsers={recentUsers as any}
      allUsers={allUsers as any}
      disputedSwaps={disputedSwaps as any}
      pendingPayouts={enrichedPayouts as any}
      stats={{
        totalUsers, activeListings, soldListings, endedListings,
        totalVolume, totalRevenue, totalBids, totalMessages,
        avgRating: Math.round(avgRating * 10) / 10,
      }}
    />
  )
}
