import { createClient } from '@/lib/supabase/server'
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
    recentUsers, topSellers, disputedSwaps, allUsers,
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
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, rehomeScore: true, swapScore: true, icVerified: true, createdAt: true, _count: { select: { listings: true } } },
    }),
    prisma.listing.groupBy({
      by: ['sellerId'],
      where: { status: 'SOLD' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
    prisma.swapTransaction.findMany({
      where: { escrowStatus: 'DISPUTED' },
      include: {
        listing: { select: { id: true, title: true } },
        seller: { select: { id: true, name: true, email: true } },
        buyer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const totalVolume = volumeResult._sum.amount ?? 0
  const totalRevenue = volumeResult._sum.platformFee ?? 0
  const avgRating = avgRatingResult._avg.rating ?? 0

  return (
    <AdminPanel
      pendingICs={pendingICs as any}
      recentListings={recentListings as any}
      recentUsers={recentUsers as any}
      allUsers={allUsers as any}
      disputedSwaps={disputedSwaps as any}
      stats={{
        totalUsers, activeListings, soldListings, endedListings,
        totalVolume, totalRevenue, totalBids, totalMessages,
        avgRating: Math.round(avgRating * 10) / 10,
      }}
    />
  )
}
