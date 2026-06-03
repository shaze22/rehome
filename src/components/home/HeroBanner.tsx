import Link from 'next/link'
import { Zap, ArrowLeftRight, ArrowRight, Clock, DollarSign, Package, CheckCircle, Search } from 'lucide-react'

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 pb-8">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(20,184,166,0.08) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* ===== ABOVE THE FOLD: Hero + CTA + Search ===== */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--teal)' }}>
            Malaysia&apos;s #1 Pre-Loved Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3">
            Turn Old Stuff Into{' '}
            <span style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Cash
            </span>
            {' '}— or Find a{' '}
            <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Bargain
            </span>
          </h1>
          <p className="text-sm sm:text-base max-w-lg mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
            30-min flash auctions · Item swaps · 100% secure escrow · Delivery included
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <Link
              href="/listings?mode=flash"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)', boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}
            >
              <Zap className="w-4 h-4" />
              Browse Auctions
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sell"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95 gradient-teal glow-teal"
            >
              Sell My Item
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Search bar */}
          <form action="/listings" method="get" className="flex items-center max-w-xl mx-auto rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center gap-2 flex-1 px-4 py-3">
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                name="q"
                type="text"
                placeholder="Search for laptops, furniture, clothes..."
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 text-sm font-semibold text-white flex-shrink-0 gradient-teal"
            >
              Search
            </button>
          </form>
        </div>

        {/* How it works — split cards */}
        <p className="text-center text-xs font-semibold tracking-widest uppercase mb-5" style={{ color: 'var(--text-muted)' }}>Choose your mode</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* ⚡ FLASH BID */}
          <div className="rounded-2xl p-6 sm:p-8 flex flex-col" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(255,107,53,0.35)', boxShadow: '0 0 32px rgba(255,107,53,0.07)' }}>
            {/* Mode badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)' }}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight" style={{ color: '#ff6b35' }}>⚡ FLASH BID</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(255,107,53,0.15)', color: '#ff6b35', border: '1px solid rgba(255,107,53,0.3)' }}>AUCTION</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Bid fast. Win in 30 minutes.</p>
              </div>
            </div>

            {/* Punchy headline */}
            <p className="text-base font-semibold mb-4 leading-snug" style={{ color: 'var(--text-primary)' }}>
              Start bidding from <span style={{ color: '#ff6b35' }}>RM0</span> — even if you&apos;re the only bidder, you win.
            </p>

            {/* Rules */}
            <div className="space-y-2.5 mb-6 flex-1">
              {[
                { icon: DollarSign, text: 'Open bid starts at RM0. Every next bid is at least RM1 higher.' },
                { icon: Clock, text: 'Timer is hidden — starts only when the FIRST bid is placed.' },
                { icon: Zap, text: 'You have 30 minutes from the first bid. Highest bid when timer hits zero wins.' },
                { icon: CheckCircle, text: 'Sole bidder at RM0? The item is yours — for free.' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(255,107,53,0.12)' }}>
                    <Icon className="w-3 h-3" style={{ color: '#ff6b35' }} />
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Example scenario */}
            <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: 'rgba(255,107,53,0.07)', border: '1px solid rgba(255,107,53,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#ff6b35' }}>Example</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Seller lists a MacBook. No timer yet. You bid RM200 — timer starts. Competitor bids RM250. You bid RM280. No more bids in 30 min. <strong style={{ color: 'var(--text-primary)' }}>You win at RM280.</strong>
              </p>
            </div>

            <Link
              href="/listings?mode=flash"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)' }}
            >
              <Zap className="w-4 h-4" />
              Browse Flash Auctions
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 🔄 SWAP BID */}
          <div className="rounded-2xl p-6 sm:p-8 flex flex-col" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.35)', boxShadow: '0 0 32px rgba(22,163,74,0.07)' }}>
            {/* Mode badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #16a34a, #14b8a6)' }}>
                <ArrowLeftRight className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight" style={{ color: '#16a34a' }}>🔄 SWAP BID</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(22,163,74,0.15)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)' }}>TRADE</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Bid cash or swap your item. 3 days window.</p>
              </div>
            </div>

            {/* Punchy headline */}
            <p className="text-base font-semibold mb-4 leading-snug" style={{ color: 'var(--text-primary)' }}>
              No cash? No problem. <span style={{ color: '#16a34a' }}>Offer your item</span> — seller decides if it&apos;s a deal.
            </p>

            {/* Rules */}
            <div className="space-y-2.5 mb-6 flex-1">
              {[
                { icon: DollarSign, text: 'Seller sets a price (or AI suggests fair value). You can bid cash — or offer your own item in return.' },
                { icon: ArrowLeftRight, text: 'Seller reviews all offers and picks: accept a swap, accept a cash bid, or counter-offer.' },
                { icon: Clock, text: '3-day window. Listing is open until the first bid or swap offer arrives.' },
                { icon: Package, text: 'Deal agreed? Both items swap via secure escrow. Cash deals work the same way.' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(22,163,74,0.12)' }}>
                    <Icon className="w-3 h-3" style={{ color: '#16a34a' }} />
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Example scenario */}
            <div className="rounded-xl px-4 py-3 mb-5" style={{ backgroundColor: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#16a34a' }}>Example</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Seller lists vintage glasses (AI value: RM180). You offer your Sony earphones (worth RM200). Seller agrees. <strong style={{ color: 'var(--text-primary)' }}>Deal closed — no money changes hands.</strong>
              </p>
            </div>

            <Link
              href="/listings?mode=swap"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #16a34a, #14b8a6)' }}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Browse Swap Bids
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Bottom CTA row */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ready to sell?</p>
          <Link
            href="/sell"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white text-sm gradient-teal glow-teal transition-all hover:scale-105"
          >
            List Your Item Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>· No listing fee · 15% only on sale</p>
        </div>
      </div>
    </section>
  )
}
