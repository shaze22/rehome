import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { Heart } from 'lucide-react'
import { KassimNiche } from '@/components/brand/Motifs'

export default async function WatchlistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: {
      listing: {
        include: { seller: { select: { name: true, rehomeScore: true, icVerified: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
        <Heart className="w-7 h-7" style={{ color: 'var(--red)' }} fill="currentColor" />
        Saved Listings
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>{items.length} saved {items.length === 1 ? 'item' : 'items'}</p>

      {items.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <KassimNiche pose="head-smile" width={88} className="mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">No saved listings yet</p>
          <p style={{ color: 'var(--text-secondary)' }}>Tap the heart on any listing to keep it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {items.map(item => (
            <ListingCard key={item.id} listing={item.listing} />
          ))}
        </div>
      )}
    </div>
  )
}
