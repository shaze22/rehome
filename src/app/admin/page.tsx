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

  const [pendingICs, recentListings, totalUsers, activeListings, soldListings, volumeResult] = await Promise.all([
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
    prisma.transaction.aggregate({ _sum: { amount: true } }),
  ])

  const totalVolume = volumeResult._sum.amount ?? 0

  return (
    <AdminPanel
      pendingICs={pendingICs as any}
      recentListings={recentListings as any}
      stats={{ totalUsers, activeListings, soldListings, totalVolume }}
    />
  )
}
