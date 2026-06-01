import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ListingDetailClient } from '@/components/listings/ListingDetailClient'
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
  const modeLabel = listing.mode === 'SWAP' ? 'Tukar Barang' : 'Lelong Pantas'
  const priceText = listing.mode === 'SWAP' ? 'Tukar Barang' : `RM ${listing.currentBid.toFixed(0)}`
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rehome-eta.vercel.app'
  const title = `${listing.title} — ${priceText}`
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
        seller: { select: { id: true, name: true, rehomeScore: true, icVerified: true, state: true, icStatus: true, createdAt: true, swapScore: true, swapVerified: true } },
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

  // Non-blocking view count increment
  prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

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
