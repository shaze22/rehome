import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ListingDetailClient } from '@/components/listings/ListingDetailClient'
import { ListingChat } from '@/components/listings/ListingChat'
import { WatchlistButton } from '@/components/listings/WatchlistButton'

async function getListing(id: string) {
  try {
    return await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, rehomeScore: true, icVerified: true, state: true, icStatus: true, createdAt: true } },
        bids: {
          include: { bidder: { select: { name: true, rehomeScore: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        review: { select: { rating: true, comment: true, createdAt: true } },
        _count: { select: { bids: true } },
      },
    })
  } catch {
    return null
  }
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <ListingDetailClient
        listing={listing as any}
        currentUserId={user?.id ?? null}
        currentUserEmail={user?.email ?? null}
        watchlistButton={
          <WatchlistButton listingId={listing.id} currentUserId={user?.id ?? null} />
        }
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <ListingChat
          listingId={listing.id}
          currentUserId={user?.id ?? null}
          sellerId={listing.sellerId}
        />
      </div>
    </div>
  )
}
