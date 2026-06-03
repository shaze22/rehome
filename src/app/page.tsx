import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { WasteCounter } from '@/components/home/WasteCounter'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { RecentlyViewed } from '@/components/home/RecentlyViewed'
import { MegaLelongCountdown } from '@/components/home/MegaLelongCountdown'
import { HeroBanner } from '@/components/home/HeroBanner'
import { ArrowRight, Zap, ArrowLeftRight, Flame } from 'lucide-react'

async function getFeaturedListings() {
  try {
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', mode: 'FLASH', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      include: { seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } }, _count: { select: { bids: true, offers: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getFeaturedSwapListings() {
  try {
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', mode: 'SWAP', endsAt: { gt: new Date() } },
      include: { seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } }, _count: { select: { bids: true, offers: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getMegaLelongListings() {
  try {
    return await prisma.listing.findMany({
      where: {
        isFeatured: true,
        status: 'ACTIVE',
        OR: [
          { mode: 'FLASH', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
          { mode: 'SWAP', endsAt: { gt: new Date() } },
        ],
      },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getTrendingListings() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        updatedAt: { gte: since },
        OR: [
          { mode: 'FLASH', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
          { mode: 'SWAP', endsAt: { gt: new Date() } },
        ],
      },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getStats() {
  try {
    const now = new Date()
    const [sold, swapDone, co2Result, activeFlash, activeSwap, salesResult, co2FullResult] = await Promise.all([
      prisma.listing.count({ where: { status: 'SOLD' } }),
      prisma.swapTransaction.count({ where: { escrowStatus: 'COMPLETED' } }),
      prisma.listing.aggregate({ where: { status: 'SOLD' }, _sum: { co2Saved: true } }),
      prisma.listing.count({ where: { status: 'ACTIVE', mode: 'FLASH', OR: [{ endsAt: null }, { endsAt: { gt: now } }] } }),
      prisma.listing.count({ where: { status: 'ACTIVE', mode: 'SWAP', endsAt: { gt: now } } }),
      prisma.transaction.aggregate({ _sum: { amount: true } }),
      prisma.listing.aggregate({ where: { status: { in: ['SOLD', 'ACTIVE'] } }, _sum: { co2Saved: true } }),
    ])
    return {
      sold,
      swapDone,
      co2: co2Result._sum.co2Saved ?? 0,
      activeFlash,
      activeSwap,
      totalSales: salesResult._sum.amount ?? 0,
      co2Full: co2FullResult._sum.co2Saved ?? 0,
    }
  } catch {
    return { sold: 0, swapDone: 0, co2: 0, activeFlash: 0, activeSwap: 0, totalSales: 0, co2Full: 0 }
  }
}

const TRUST_FEATURES = [
  { emoji: '🔒', title: 'Secure Escrow', desc: 'Buyer funds held safely until item is received. Zero fraud risk.' },
  { emoji: '🤖', title: 'AI Pricing', desc: 'AI price suggestions based on current market. Sell at a fair and accurate price.' },
  { emoji: '✅', title: 'IC Verified', desc: 'Sellers who verify their IC get a trust badge. You know who you\'re dealing with.' },
  { emoji: '⚡', title: '30-Min Auctions', desc: 'Fast 30-minute auctions. Bid, win, pay. Done in one day.' },
]

const TESTIMONIALS = [
  { quote: 'Laptop lama aku terjual RM650 dalam masa 22 minit. Lagi laju dari Carousell!', name: 'Ahmad F.', location: 'Kuala Lumpur', initial: 'A', stars: 5 },
  { quote: 'Swap cermin mata lama dengan jam tangan. Jimat duit beli baru. Mudah sangat!', name: 'Siti R.', location: 'Selangor', initial: 'S', stars: 5 },
  { quote: 'Escrow buat aku rasa selamat. Duit baru lepas bila barang sampai. Highly recommend!', name: 'Razif M.', location: 'Pulau Pinang', initial: 'R', stars: 5 },
]

const SELL_FEATURES = [
  { emoji: '🔒', title: 'Escrow Protection', desc: 'Buyer payment is held securely. You get paid the moment your item is delivered. Guaranteed.' },
  { emoji: '✅', title: 'IC-Verified Buyers', desc: 'Only verified Malaysians can bid. No fake accounts, no ghosting.' },
  { emoji: '📦', title: 'Auto-Shipping via EasyParcel', desc: 'Courier booking is handled for you after payment. Just pack and hand over.' },
  { emoji: '💸', title: '15% Only on Sale', desc: 'Zero listing fee. Zero monthly fee. We only earn when you earn.' },
]

export default async function HomePage() {
  const [flashListings, swapListings, stats, trendingListings, megaListings] = await Promise.all([
    getFeaturedListings(),
    getFeaturedSwapListings(),
    getStats(),
    getTrendingListings(),
    getMegaLelongListings(),
  ])
  const { sold: totalTransactions, swapDone, co2: totalCO2, activeFlash, activeSwap, totalSales, co2Full } = stats
  const hasRealData = totalTransactions > 0

  return (
    <div>
      {/* Hero — Flash Bid + Swap Bid USP */}
      <HeroBanner />

      {/* Live Stats Bar */}
      <section className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl px-6 py-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { emoji: '⚡', value: activeFlash, label: 'Flash Live', desc: 'auctions now', color: 'var(--orange)' },
                { emoji: '🔄', value: activeSwap, label: 'Swaps Open', desc: 'items to swap', color: '#16a34a' },
                { emoji: '💰', value: `RM ${new Intl.NumberFormat('en-MY').format(Math.round(totalSales))}`, label: 'In Sales', desc: 'transacted on platform', color: 'var(--teal)', raw: true },
                { emoji: '🌱', value: `${new Intl.NumberFormat('en-MY').format(Math.round(co2Full))}kg`, label: 'CO₂ Saved', desc: 'vs buying new', color: 'var(--green)', raw: true },
              ].map(stat => (
                <div key={stat.label} className="text-center py-1 px-3">
                  <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>
                    {stat.raw ? stat.value : `${stat.emoji} ${stat.value}`}
                  </p>
                  <p className="text-xs font-semibold mt-0.5">{stat.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CO2 Impact Card */}
      {co2Full > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-2xl px-8 py-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.12) 0%, rgba(20,184,166,0.12) 100%)', border: '1px solid rgba(22,163,74,0.25)' }}>
              <p className="text-xl md:text-2xl font-bold leading-snug">
                🌱 KASSIM users have saved{' '}
                <span style={{ color: 'var(--green)' }}>{new Intl.NumberFormat('en-MY').format(Math.round(co2Full))}kg</span>{' '}
                of CO₂
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                , equivalent to planting{' '}
                <span className="font-semibold" style={{ color: 'var(--green)' }}>{new Intl.NumberFormat('en-MY').format(Math.round(co2Full / 21))} trees</span> 🌳
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Why KASSIM is Safe? */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Why KASSIM is Safe?</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Built to protect buyers and sellers across Malaysia</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_FEATURES.map(item => (
              <div key={item.title} className="rounded-xl p-6 text-center card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-bold mb-2 text-sm">{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Sell on KASSIM? */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--teal)' }}>For Sellers</p>
            <h2 className="text-2xl font-bold mb-2">Why Sell on KASSIM?</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Better than Mudah. Safer than Facebook. Faster than Carousell.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SELL_FEATURES.map(item => (
              <div key={item.title} className="rounded-xl p-6 card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-3xl mb-3">{item.emoji}</div>
                <h3 className="font-bold mb-2 text-sm">{item.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/sell" className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white gradient-teal glow-teal hover:scale-105 transition-all">
              List Your First Item Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>No listing fee · 15% only when sold · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Waste Counter — only show when there's real data */}
      {hasRealData && <WasteCounter totalCO2={totalCO2} totalTransactions={totalTransactions} />}

      {/* Recently Viewed — client component, reads localStorage */}
      <RecentlyViewed />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Trending This Week */}
      {trendingListings.length >= 2 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  Trending This Week 🔥
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Most popular items in the last 7 days</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingListings.map(listing => (
                listing.mode === 'SWAP'
                  ? <SwapListingCard key={listing.id} listing={listing as any} />
                  : <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Friday Mega Auction */}
      {megaListings.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    ⚡ Friday FLASH BID Night
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: '#ef4444', color: 'white' }}>FEATURED</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Curated Flash Bid listings every Friday night</p>
              </div>
              <MegaLelongCountdown />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {megaListings.map(listing => (
                listing.mode === 'SWAP'
                  ? <SwapListingCard key={listing.id} listing={listing as any} />
                  : <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Flash Listings */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                <span style={{ color: '#ff6b35' }}>⚡ FLASH BID</span>
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bid from RM0 · Timer starts on first bid · 30 min to win</p>
            </div>
            <Link href="/listings?mode=flash" className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: 'var(--teal)' }}>
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {flashListings.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium mb-2">No active auctions yet</p>
              <Link href="/jual" className="text-sm px-4 py-2 rounded-lg font-medium text-white gradient-teal inline-block mt-2">Start Selling</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {flashListings.map(listing => (
                <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Swap Listings */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" style={{ color: '#16a34a' }} />
                <span style={{ color: '#16a34a' }}>🔄 SWAP BID</span>
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Offer cash or swap your item · Seller picks the best deal · 3-day window</p>
            </div>
            <Link href="/listings?mode=swap" className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#16a34a' }}>
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {swapListings.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
              <ArrowLeftRight className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium mb-2">No swap offers yet</p>
              <Link href="/jual" className="text-sm px-4 py-2 rounded-lg font-medium text-white inline-block mt-2" style={{ backgroundColor: '#16a34a' }}>List Your Item</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {swapListings.map(listing => (
                <SwapListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--teal)' }}>Trusted by Malaysians</p>
            <h2 className="text-2xl font-bold mb-2">Real Stories. Real Results.</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Join thousands who've already made their first deal on KASSIM</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t.quote}</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-teal flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
