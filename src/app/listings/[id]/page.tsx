import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ListingDetailClient } from '@/components/listings/ListingDetailClient'
import { ListingCard } from '@/components/listings/ListingCard'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { ListingChat } from '@/components/listings/ListingChat'
import { WatchlistButton } from '@/components/listings/WatchlistButton'
import type { Metadata } from 'next'

const CATEGORY_MS: Record<string, string> = {
  FURNITURE: 'Perabot', ELECTRONICS: 'Elektronik', FASHION: 'Fesyen',
  BOOKS: 'Buku', SPORTS: 'Sukan', KITCHEN: 'Dapur', OTHERS: 'Lain-lain',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { title: true, description: true, photos: true, currentBid: true, state: true, category: true, mode: true },
  })
  if (!listing) return { title: 'Listing tidak dijumpai' }

  const category = CATEGORY_MS[listing.category] ?? listing.category
  const modeLabel = listing.mode === 'SWAP' ? 'Item Swap' : 'Flash Auction'
  const priceText = listing.mode === 'SWAP' ? 'Item Swap' : `RM ${listing.currentBid.toFixed(0)}`
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
  const title = `${listing.title} | ${priceText}`
  const description = `${modeLabel} · ${category} · ${listing.state} · ${listing.description.slice(0, 120)}...`
  const photo = listing.photos[0]
  const ogImage = photo ?? `${BASE}/api/og?title=${encodeURIComponent(listing.title)}&subtitle=${encodeURIComponent(`${modeLabel} · ${category} · ${listing.state}`)}&price=${encodeURIComponent(priceText)}&mode=${listing.mode === 'SWAP' ? 'swap' : 'flash'}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogImage, width: photo ? 800 : 1200, height: photo ? 800 : 630, alt: listing.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

async function getListing(id: string) {
  try {
    return await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, phone: true, rehomeScore: true, icVerified: true, state: true, icStatus: true, createdAt: true, swapScore: true, swapVerified: true, _count: { select: { listings: true } } } },
        bids: {
          include: { bidder: { select: { name: true, rehomeScore: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        reviews: { select: { rating: true, comment: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
        _count: { select: { bids: true, offers: true } },
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

  // Non-blocking view count increment + fetch related listings in parallel
  const [, relatedListings, supabase] = await Promise.all([
    prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => null),
    prisma.listing.findMany({
      where: {
        id: { not: listing.id },
        status: 'ACTIVE',
        category: listing.category,
        mode: listing.mode,
        ...(listing.mode === 'FLASH'
          ? { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }
          : { endsAt: { gt: new Date() } }),
      },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: 4,
    }).catch(() => [] as typeof listing[]),
    createClient(),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  const dbUser = user ? await prisma.user.findUnique({
    where: { id: user.id },
    select: { state: true, phone: true },
  }) : null

  const relatedSlot = relatedListings.length > 0 ? (
    <section className="mt-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <h2 className="text-xl font-bold mb-4">You May Also Like</h2>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {relatedListings.map((l: any) => (
          <div key={l.id} className="flex-shrink-0 w-64">
            {l.mode === 'SWAP'
              ? <SwapListingCard listing={l as any} />
              : <ListingCard listing={l as any} />
            }
          </div>
        ))}
      </div>
    </section>
  ) : null

  return (
    <div>
      <ListingDetailClient
        listing={listing as any}
        currentUserId={user?.id ?? null}
        currentUserEmail={user?.email ?? null}
        currentUserState={dbUser?.state ?? null}
        currentUserPhone={dbUser?.phone ?? null}
        watchlistButton={
          <WatchlistButton listingId={listing.id} currentUserId={user?.id ?? null} />
        }
        relatedListingsSlot={relatedSlot}
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
