'use client'

import { useEffect, useState } from 'react'
import { Gavel, ArrowLeftRight } from 'lucide-react'

interface StickyBidBarProps {
  /** id of the element that holds the real price, timer and bid form. */
  targetId: string
  isSwap: boolean
  priceLabel: string
  timeLabel: string
  urgent: boolean
}

/**
 * Phone-only bar that keeps the price, the clock and the way to bid in view.
 * It only scrolls to the real form; it never submits anything itself.
 */
export function StickyBidBar({ targetId, isSwap, priceLabel, timeLabel, urgent }: StickyBidBarProps) {
  const [targetVisible, setTargetVisible] = useState(true)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const observer = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), { threshold: 0.2 })
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  if (targetVisible) return null

  const accent = isSwap ? '#16a34a' : 'var(--orange)'
  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-16 z-40 px-3 pb-2"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 shadow-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${accent}`, pointerEvents: 'auto' }}
      >
        <div className="min-w-0">
          <p className="text-lg font-bold font-mono leading-tight truncate" style={{ color: 'var(--teal)' }}>{priceLabel}</p>
          <p className={`text-xs truncate ${urgent ? 'font-bold' : ''}`} style={{ color: urgent ? 'var(--red)' : 'var(--text-secondary)' }}>{timeLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white text-sm active:scale-95 transition-transform"
          style={{ background: isSwap ? 'linear-gradient(135deg,#16a34a,#22c55e)' : 'linear-gradient(135deg,#ff6b35,#f59e0b)' }}
        >
          {isSwap ? <ArrowLeftRight className="w-4 h-4" /> : <Gavel className="w-4 h-4" />}
          {isSwap ? 'Make an offer' : 'Bid now'}
        </button>
      </div>
    </div>
  )
}
