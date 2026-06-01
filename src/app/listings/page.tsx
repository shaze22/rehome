import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { Search, Zap, ArrowLeftRight } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Listings',
  description: 'Browse active pre-loved item auctions and item swaps across Malaysia.',
  openGraph: {
    title: 'Browse Listings | KASSIM',
    description: 'Progressive 30-min auctions and item swaps. Electronics, furniture, fashion & more.',
  },
}

const PAGE_SIZE = 12

interface SearchParams {
  mode?: string
  category?: string
  state?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  q?: string
  page?: string
}

async function getListings(params: SearchParams) {
  const now = new Date()
  const mode = params.mode === 'swap' ? 'SWAP' : 'FLASH'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const skip = (page - 1) * PAGE_SIZE

  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    mode,
  }

  if (mode === 'FLASH') {
    where.OR = [{ endsAt: null }, { endsAt: { gt: now } }]
  } else {
    where.endsAt = { gt: now }
  }

  if (params.category) where.category = params.category
  if (params.state) where.state = params.state
  if (params.q) {
    const searchOr = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ]
    if (mode === 'FLASH' && where.OR) {
      // Preserve the Flash endsAt OR filter; combine with search using AND
      where.AND = [{ OR: where.OR as object[] }, { OR: searchOr }]
      delete where.OR
    } else {
      where.OR = searchOr
    }
  }

  if (mode === 'FLASH' && (params.minPrice || params.maxPrice)) {
    where.currentBid = {}
    if (params.minPrice) (where.currentBid as Record<string, number>).gte = Number(params.minPrice)
    if (params.maxPrice) (where.currentBid as Record<string, number>).lte = Number(params.maxPrice)
  }

  const orderBy =
    params.sort === 'ending' ? [{ endsAt: { sort: 'asc' as const, nulls: 'last' as const } }] :
    params.sort === 'price_asc' ? [{ currentBid: 'asc' as const }] :
    params.sort === 'price_desc' ? [{ currentBid: 'desc' as const }] :
    params.sort === 'most_offers' ? [{ createdAt: 'desc' as const }] :
    [{ createdAt: 'desc' as const }]

  try {
    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: {
          seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
          _count: { select: { bids: true, offers: true } },
        },
        orderBy,
        take: PAGE_SIZE,
        skip,
      }),
      prisma.listing.count({ where }),
    ])
    return { listings, total, page, totalPages: Math.ceil(total / PAGE_SIZE) }
  } catch {
    return { listings: [], total: 0, page: 1, totalPages: 1 }
  }
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const activeMode = params.mode === 'swap' ? 'swap' : 'flash'
  const { listings, total, page, totalPages } = await getListings(params)

  const tabBase = 'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab navigation */}
      <div className="flex gap-2 mb-8 p-1.5 rounded-2xl w-fit" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Link
          href="/listings?mode=flash"
          className={tabBase}
          style={activeMode === 'flash'
            ? { backgroundColor: 'var(--orange)', color: 'white' }
            : { color: 'var(--text-secondary)' }}
        >
          <Zap className="w-4 h-4" />
          Flash Auction
        </Link>
        <Link
          href="/listings?mode=swap"
          className={tabBase}
          style={activeMode === 'swap'
            ? { backgroundColor: '#16a34a', color: 'white' }
            : { color: 'var(--text-secondary)' }}
        >
          <ArrowLeftRight className="w-4 h-4" />
          Item Swap
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">
          {activeMode === 'flash' ? 'Active Auctions' : 'Item Swap'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {total} {activeMode === 'flash' ? 'items in auction' : 'items available to swap'} now
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0">
          <ListingsFilters currentParams={params as Record<string, string | undefined>} />
        </aside>

        <div className="flex-1">
          {listings.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2">No items found</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activeMode === 'swap' ? 'No active Item Swap listings at the moment.' : 'Try adjusting your filters or search'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map(listing =>
                  activeMode === 'swap'
                    ? <SwapListingCard key={listing.id} listing={listing as any} />
                    : <ListingCard key={listing.id} listing={listing as any} />
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Link
                      href={{ query: { ...params, page: page - 1 } }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                    >
                      ← Sebelum
                    </Link>
                  )}
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Halaman {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={{ query: { ...params, page: page + 1 } }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                    >
                      Seterusnya →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
