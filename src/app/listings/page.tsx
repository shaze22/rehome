import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { ListingsFilters } from '@/components/listings/ListingsFilters'
import { Search } from 'lucide-react'

interface SearchParams {
  category?: string
  state?: string
  minPrice?: string
  maxPrice?: string
  sort?: string
  q?: string
}

async function getListings(params: SearchParams) {
  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    endsAt: { gt: new Date() },
  }

  if (params.category) where.category = params.category
  if (params.state) where.state = params.state
  if (params.q) where.title = { contains: params.q, mode: 'insensitive' }
  if (params.minPrice || params.maxPrice) {
    where.currentBid = {}
    if (params.minPrice) (where.currentBid as Record<string, number>).gte = Number(params.minPrice)
    if (params.maxPrice) (where.currentBid as Record<string, number>).lte = Number(params.maxPrice)
  }

  const orderBy =
    params.sort === 'ending' ? { endsAt: 'asc' as const } :
    params.sort === 'price_asc' ? { currentBid: 'asc' as const } :
    params.sort === 'price_desc' ? { currentBid: 'desc' as const } :
    { createdAt: 'desc' as const }

  try {
    return await prisma.listing.findMany({
      where,
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true } },
        _count: { select: { bids: true } },
      },
      orderBy,
    })
  } catch {
    return []
  }
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const listings = await getListings(params)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lelongan Aktif</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {listings.length} item dalam lelongan sekarang
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <ListingsFilters currentParams={params as Record<string, string | undefined>} />
        </aside>

        {/* Listings grid */}
        <div className="flex-1">
          {listings.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Search className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2">Tiada item dijumpai</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cuba ubah tapisan atau carian anda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
