import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { WasteCounter } from '@/components/home/WasteCounter'
import { HowItWorks } from '@/components/home/HowItWorks'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { RecentlyViewed } from '@/components/home/RecentlyViewed'
import { MegaLelongCountdown } from '@/components/home/MegaLelongCountdown'
import { ArrowRight, Leaf, Zap, TrendingUp, ArrowLeftRight, Bot, CheckCircle, Lock, Flame } from 'lucide-react'

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
    const [sold, swapDone, co2Result] = await Promise.all([
      prisma.listing.count({ where: { status: 'SOLD' } }),
      prisma.swapTransaction.count({ where: { escrowStatus: 'COMPLETED' } }),
      prisma.listing.aggregate({ where: { status: 'SOLD' }, _sum: { co2Saved: true } }),
    ])
    return { sold, swapDone, co2: co2Result._sum.co2Saved ?? 0 }
  } catch {
    return { sold: 0, swapDone: 0, co2: 0 }
  }
}

const CREDIBILITY_STATS = [
  { icon: Lock, label: 'Secure Escrow', desc: 'Pay only after receiving', color: 'var(--teal)' },
  { icon: Bot, label: 'AI Pricing', desc: 'Fair price with AI', color: 'var(--purple)' },
  { icon: CheckCircle, label: 'IC Verified', desc: 'Verified sellers', color: 'var(--green)' },
  { icon: Zap, label: '30-Min Auctions', desc: 'Fast & secure', color: 'var(--yellow)' },
]

const TRUST_FEATURES = [
  { emoji: '🔒', title: 'Secure Escrow', desc: 'Buyer funds held safely until item is received. Zero fraud risk.' },
  { emoji: '🤖', title: 'AI Pricing', desc: 'AI price suggestions based on current market. Sell at a fair and accurate price.' },
  { emoji: '✅', title: 'IC Verified', desc: 'Sellers who verify their IC get a trust badge. You know who you\'re dealing with.' },
  { emoji: '⚡', title: '30-Min Auctions', desc: 'Fast 30-minute auctions. Bid, win, pay — done in one day.' },
]

const TESTIMONIALS = [
  { quote: 'Sold my old laptop for RM650 in 22 minutes. Even faster than Carousell!', name: 'Ahmad F.', location: 'Kuala Lumpur', initial: 'A' },
  { quote: 'Swapped my old glasses for a watch. Saved money buying new. So easy!', name: 'Siti R.', location: 'Selangor', initial: 'S' },
  { quote: 'Escrow gave me peace of mind. Money only releases when item arrives. Really safe.', name: 'Razif M.', location: 'Penang', initial: 'R' },
]

export default async function HomePage() {
  const [flashListings, swapListings, stats, trendingListings, megaListings] = await Promise.all([
    getFeaturedListings(),
    getFeaturedSwapListings(),
    getStats(),
    getTrendingListings(),
    getMegaLelongListings(),
  ])
  const { sold: totalTransactions, swapDone, co2: totalCO2 } = stats
  const hasRealData = totalTransactions > 0

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
              <Leaf className="w-3.5 h-3.5" />
              Malaysia&apos;s #1 Pre-Loved Auction Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Sell Old Stuff.{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Get Paid Today.
              </span>
            </h1>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Progressive 30-min auctions. Item swaps. Secure escrow. Every deal saves the planet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/jual"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105"
              >
                Start Selling Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/listings"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
              >
                Browse Items →
              </Link>
            </div>
          </div>

          {/* Stats — credibility when no real data, real stats otherwise */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {hasRealData ? (
              <>
                {[
                  { label: 'Items Sold', value: `${totalTransactions.toLocaleString()}+`, icon: TrendingUp, color: 'var(--teal)' },
                  { label: 'CO₂ Saved', value: `${Math.round(totalCO2)}kg`, icon: Leaf, color: 'var(--green)' },
                  { label: 'Swaps Completed', value: `${swapDone}+`, icon: ArrowLeftRight, color: 'var(--purple)' },
                  { label: 'Avg. Sell Time', value: '< 30 min', icon: Zap, color: 'var(--yellow)' },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-4 text-center card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                    <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
                  </div>
                ))}
              </>
            ) : (
              <>
                {CREDIBILITY_STATS.map(stat => (
                  <div key={stat.label} className="rounded-xl p-4 text-center card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                    <p className="text-sm font-bold" style={{ color: stat.color }}>{stat.label}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.desc}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

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
                    ⚡ Friday Mega Auction
                  </h2>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: '#ef4444', color: 'white' }}>FEATURED</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Curated listings every Friday night</p>
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
                Flash Auctions ⚡
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bid now, win in 30 minutes</p>
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
                Item Swaps 🔄
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Trade pre-loved items without cash</p>
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
            <h2 className="text-2xl font-bold mb-2">What Our Users Say</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Real experiences from our community</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-3xl font-serif mb-3" style={{ color: 'var(--teal)' }}>&ldquo;</div>
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

      {/* How it works */}
      <HowItWorks />
    </div>
  )
}
