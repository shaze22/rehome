import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { MobileFilterDrawer } from '@/components/listings/MobileFilterDrawer'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { Search, Zap, ArrowLeftRight, Flame } from 'lucide-react'
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
          seller: { select: { id: true, name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
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

async function getEndingSoonListings() {
  try {
    const now = new Date()
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', mode: 'FLASH', endsAt: { gte: now, lte: in2h } },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { endsAt: 'asc' },
      take: 6,
    })
  } catch {
    return []
  }
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const activeMode = params.mode === 'swap' ? 'swap' : 'flash'
  const [{ listings, total, page, totalPages }, endingSoon] = await Promise.all([
    getListings(params),
    activeMode === 'flash' && !params.q ? getEndingSoonListings() : Promise.resolve([]),
  ])
  const endingSoonListings = Array.isArray(endingSoon) ? endingSoon : []

  const tabBase = 'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Ending Soon — FOMO section (Flash only, no active search) */}
      {endingSoonListings.length > 0 && (
        <section className="mb-8 rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.07),rgba(249,115,22,0.07))', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5" style={{ color: '#ef4444' }} />
            <h2 className="text-lg font-bold" style={{ color: '#ef4444' }}>🔥 Ending in the Next 2 Hours</h2>
            <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
              {endingSoonListings.length} left
            </span>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {endingSoonListings.map(listing => (
              <ListingCard key={listing.id} listing={listing as any} />
            ))}
          </div>
        </section>
      )}

      {/* Mode tabs */}
      <div className="flex gap-2 mb-4 p-1.5 rounded-2xl w-fit" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <Link
          href="/listings?mode=flash"
          className={tabBase}
          style={activeMode === 'flash'
            ? { background: 'linear-gradient(135deg,#ff6b35,#f59e0b)', color: 'white', boxShadow: '0 0 16px rgba(255,107,53,0.3)' }
            : { color: 'var(--text-secondary)' }}
        >
          <Zap className="w-4 h-4" />
          ⚡ FLASH BID
        </Link>
        <Link
          href="/listings?mode=swap"
          className={tabBase}
          style={activeMode === 'swap'
            ? { background: 'linear-gradient(135deg,#16a34a,#14b8a6)', color: 'white', boxShadow: '0 0 16px rgba(22,163,74,0.3)' }
            : { color: 'var(--text-secondary)' }}
        >
          <ArrowLeftRight className="w-4 h-4" />
          🔄 SWAP BID
        </Link>
      </div>

      {/* Mode explainer strip */}
      <div className="mb-6 px-4 py-2.5 rounded-xl text-xs" style={{
        backgroundColor: activeMode === 'flash' ? 'rgba(255,107,53,0.07)' : 'rgba(22,163,74,0.07)',
        border: `1px solid ${activeMode === 'flash' ? 'rgba(255,107,53,0.2)' : 'rgba(22,163,74,0.2)'}`,
        color: 'var(--text-secondary)',
      }}>
        {activeMode === 'flash' ? (
          <span>⚡ <strong style={{ color: '#ff6b35' }}>FLASH BID</strong>: Bid from RM0. Timer starts on the first bid. 30 minutes to win. Highest bid takes it.</span>
        ) : (
          <span>🔄 <strong style={{ color: '#16a34a' }}>SWAP BID</strong>: Offer cash or trade your item. Seller picks the best deal. 3-day window.</span>
        )}
        <span className="ml-3 font-semibold" style={{ color: activeMode === 'flash' ? '#ff6b35' : '#16a34a' }}>
          {total} {activeMode === 'flash' ? 'auction' : 'swap'}{total !== 1 ? 's' : ''} active
        </span>
      </div>

      {/* Search bar */}
      <form method="get" className="flex items-center rounded-xl overflow-hidden mb-6" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
        <input type="hidden" name="mode" value={activeMode} />
        <div className="flex items-center gap-2 flex-1 px-4 py-3">
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
          <input
            name="q"
            type="text"
            defaultValue={params.q ?? ''}
            placeholder={activeMode === 'flash' ? 'Search auctions: laptops, phones, furniture...' : 'Search items to swap...'}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button type="submit" className="px-5 py-3 text-sm font-semibold text-white flex-shrink-0 gradient-teal">
          Search
        </button>
      </form>

      {/* Mobile filter button + desktop aside */}
      <div className="mb-4 lg:hidden flex items-center gap-3">
        <MobileFilterDrawer
          currentParams={params as Record<string, string | undefined>}
          activeFilterCount={[params.category, params.state, params.sort && params.sort !== 'createdAt' ? params.sort : '', params.q].filter(Boolean).length}
        />
        {params.q && (
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Results for &ldquo;<strong>{params.q}</strong>&rdquo;
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block lg:w-64 flex-shrink-0">
          <div className="sticky top-20">
            <ListingsFilters currentParams={params as Record<string, string | undefined>} />
          </div>
        </aside>

        <div className="flex-1">
          {listings.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2">No items found</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {activeMode === 'swap' ? 'No active Item Swap listings at the moment.' : 'No auctions right now. Check back soon or list yours!'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
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
                      ← Previous
                    </Link>
                  )}
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Page {page} / {totalPages}
                  </span>
                  {page < totalPages && (
                    <Link
                      href={{ query: { ...params, page: page + 1 } }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
                    >
                      Next →
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
