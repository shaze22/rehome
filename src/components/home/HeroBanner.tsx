import Link from 'next/link'
import { Zap, ArrowLeftRight, Search, Lock, BadgeCheck, Truck, Tag } from 'lucide-react'
import { Kassim } from '@/components/brand/Kassim'

/** Kassim standing at the open mouth of his treasure cave. */
function HeroCave() {
  return (
    <div className="relative mx-auto w-full max-w-[230px] sm:max-w-[300px] lg:max-w-[400px]">
      <svg viewBox="0 0 400 330" className="block w-full h-auto" aria-hidden>
        <defs>
          <radialGradient id="hero-cave-glow" cx="50%" cy="92%" r="80%">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#7c2d12" />
            <stop offset="100%" stopColor="#1c1917" />
          </radialGradient>
          <linearGradient id="hero-cave-rock" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#57534e" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
          <clipPath id="hero-cave-mouth">
            <path d="M52 330 L52 168 Q52 56 200 56 Q348 56 348 168 L348 330 Z" />
          </clipPath>
        </defs>
        <path d="M8 330 L8 152 Q8 8 200 8 Q392 8 392 152 L392 330 Z" fill="url(#hero-cave-rock)" />
        <g clipPath="url(#hero-cave-mouth)">
          <rect x="52" y="56" width="296" height="274" fill="url(#hero-cave-glow)" />
          <ellipse cx="200" cy="336" rx="170" ry="52" fill="#f59e0b" />
          <ellipse cx="112" cy="300" rx="52" ry="20" fill="#fbbf24" />
          <ellipse cx="296" cy="296" rx="56" ry="22" fill="#fbbf24" />
          <circle cx="92" cy="282" r="7" fill="#14b8a6" />
          <circle cx="318" cy="272" r="8" fill="#ff6b35" />
          <circle cx="128" cy="276" r="4" fill="#fef3c7" />
          <circle cx="282" cy="268" r="4.5" fill="#fef3c7" />
          <circle cx="306" cy="292" r="6" fill="#14b8a6" />
        </g>
        <path d="M52 330 L52 168 Q52 56 200 56 Q348 56 348 168 L348 330" fill="none" stroke="#1c1917" strokeWidth="6" />
      </svg>
      <Kassim pose="3d-point" width={160} preload className="absolute bottom-0 left-[30%] w-[40%] h-auto kassim-bob" />
    </div>
  )
}

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-6 sm:pb-10">
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position: 'absolute', top: 0, left: '20%', width: '60%', height: '60%', background: 'radial-gradient(ellipse, rgba(245,185,66,0.10) 0%, transparent 70%)' }} />
      </div>

      <div className="max-w-6xl mx-auto relative grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 items-center">
        <div className="lg:order-2">
          <Link
            href="/story"
            className="block w-fit mx-auto mb-2 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            My treasure cave is full.{' '}
            <span style={{ color: 'var(--teal)' }}>Come and take a look.</span>
          </Link>
          <HeroCave />
        </div>

        <div className="text-center lg:text-left lg:order-1">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2 sm:mb-3" style={{ color: 'var(--teal)' }}>
            Malaysia&apos;s Smarter Pre-Loved Marketplace
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-2 sm:mb-3">
            Bid from <span className="text-gold-gradient">RM0.</span>{' '}
            Win in 30 minutes.
          </h1>
          <p className="text-sm sm:text-base max-w-lg mx-auto lg:mx-0 mb-4 sm:mb-6" style={{ color: 'var(--text-secondary)' }}>
            One man&apos;s trash is another man&apos;s treasure. Bid on pre-loved items or swap your own, with escrow and delivery built in.
          </p>

          {/* One primary action (Flash Bid); Swap Bid is the quieter second choice */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-4 sm:mb-6">
            <Link
              href="/listings?mode=flash"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ff6b35, #f59e0b)', boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}
            >
              <Zap className="w-4 h-4" />
              Browse Flash Bid
            </Link>
            <Link
              href="/listings?mode=swap"
              className="flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              <ArrowLeftRight className="w-4 h-4" />
              Swap Bid
            </Link>
          </div>

          {/* Search bar */}
          <form action="/listings" method="get" className="flex items-center max-w-xl mx-auto lg:mx-0 rounded-xl overflow-hidden mb-4 sm:mb-6" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
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
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 sm:gap-6">
            {[
              { icon: Lock, text: 'Escrow Protected' },
              { icon: BadgeCheck, text: 'IC Verified Sellers' },
              { icon: Truck, text: 'Delivery Included' },
              { icon: Tag, text: 'Free to List' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
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
      </div>
    </section>
  )
}
