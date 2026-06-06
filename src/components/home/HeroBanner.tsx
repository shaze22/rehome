import Link from 'next/link'
import { Zap, ArrowLeftRight, Search } from 'lucide-react'

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-10">
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-3xl mx-auto relative text-center">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2 sm:mb-3" style={{ color: 'var(--teal)' }}>
          Malaysia&apos;s #1 Pre-Loved Marketplace
        </p>
        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-2 sm:mb-3">
          Turn Old Stuff Into{' '}
          <span style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cash
          </span>
          {' '}or Find a{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Bargain
          </span>
        </h1>
        <p className="text-xs sm:text-base max-w-lg mx-auto mb-4 sm:mb-6" style={{ color: 'var(--text-secondary)' }}>
          30-min flash auctions, item swaps, 100% secure escrow, delivery included.
        </p>

        {/* Primary CTAs — side by side on mobile */}
        <div className="flex flex-col items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center">
            <Link
              href="/listings?mode=flash"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)', boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}
            >
              <Zap className="w-4 h-4" />
              Flash Bid
            </Link>
            <Link
              href="/sell"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95 gradient-teal glow-teal"
            >
              Sell Now
            </Link>
          </div>
          <Link
            href="/listings?mode=swap"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105"
            style={{ border: '1px solid rgba(22,163,74,0.4)', color: '#16a34a', backgroundColor: 'rgba(22,163,74,0.06)' }}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Browse Swap Bid
          </Link>
        </div>

        {/* Search bar */}
        <form action="/listings" method="get" className="flex items-center max-w-xl mx-auto rounded-xl overflow-hidden mb-4 sm:mb-6" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2 flex-1 px-3 sm:px-4 py-2.5 sm:py-3">
            <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
            <input
              name="q"
              type="text"
              placeholder="Search laptops, furniture, clothes..."
              className="w-full bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          <button type="submit" className="px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold text-white flex-shrink-0 gradient-teal">
            Search
          </button>
        </form>

        {/* Trust micro-indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 sm:gap-6">
          {[
            { emoji: '🔒', text: 'Escrow Protected' },
            { emoji: '✅', text: 'IC Verified Sellers' },
            { emoji: '📦', text: 'Auto Delivery' },
            { emoji: '0%', text: 'Free to List' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span className="font-semibold">{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-3 sm:mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          New here?{' '}
          <Link href="/how-it-works" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>
            Learn how Flash Bid and Swap Bid work
          </Link>
        </p>
      </div>
    </section>
  )
}
