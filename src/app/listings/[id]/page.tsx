import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ListingDetailClient } from '@/components/listings/ListingDetailClient'
import { ListingCard } from '@/components/listings/ListingCard'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { ListingChat } from '@/components/listings/ListingChat'
import { WatchlistButton } from '@/components/listings/WatchlistButton'
import { CheckCircle, Pencil } from 'lucide-react'
import type { Metadata } from 'next'

const CATEGORY_MS: Record<string, string> = {
  FURNITURE: 'Perabot', ELECTRONICS: 'Elektronik', FASHION: 'Fesyen',
  BOOKS: 'Buku', SPORTS: 'Sukan', KITCHEN: 'Dapur', OTHERS: 'Lain-lain',
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) return { title: 'Listing tidak dijumpai' }

  const category = CATEGORY_MS[listing.category] ?? listing.category
  const modeLabel = listing.mode === 'SWAP' ? 'Item Swap' : 'Flash Auction'
  const priceText = listing.mode === 'SWAP' ? 'Item Swap' : `RM ${listing.currentBid.toFixed(0)}`
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
  const title = `${listing.title} | ${priceText}`
  const description = `${modeLabel} · ${category} · ${listing.state} · ${listing.description.slice(0, 120)}...`
  const photo = listing.photos[0]
  const ogFallback = `${BASE}/api/og?title=${encodeURIComponent(listing.title)}&subtitle=${encodeURIComponent(`${modeLabel} · ${category} · ${listing.state}`)}&price=${encodeURIComponent(priceText)}&mode=${listing.mode === 'SWAP' ? 'swap' : 'flash'}`
  const ogImage = photo ?? ogFallback

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: listing.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

const getListing = cache(async (id: string) => {
  try {
    return await prisma.listing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, phone: true, rehomeScore: true, icVerified: true, state: true, icStatus: true, createdAt: true, swapScore: true, swapVerified: true, _count: { select: { listings: { where: { status: 'ACTIVE', hiddenBySeller: false } } } } } },
        bids: {
          include: { bidder: { select: { name: true, rehomeScore: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: { select: { bids: true, offers: true } },
      },
    })
  } catch {
    return null
  }
})

export default async function ListingDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const isNew = sp.new === '1'
  const listing = await getListing(id)
  if (!listing) notFound()

  // Fire-and-forget view count — don't let DB write block page render
  prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => null)

  const [relatedListings, supabase] = await Promise.all([
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
        seller: { select: { id: true, name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
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
    select: { state: true, phone: true, postcode: true, savedAddress: true },
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
      {isNew && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 mb-2" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>Your listing is live!</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Review it below — you can still edit if anything looks off.</p>
              </div>
            </div>
            <Link
              href={`/sell/edit/${listing.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
          </div>
        </div>
      )}
      <ListingDetailClient
        listing={listing as any}
        currentUserId={user?.id ?? null}
        currentUserEmail={user?.email ?? null}
        currentUserState={dbUser?.state ?? null}
        currentUserPhone={dbUser?.phone ?? null}
        currentUserPostcode={dbUser?.postcode ?? null}
        currentUserSavedAddress={dbUser?.savedAddress ?? null}
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
