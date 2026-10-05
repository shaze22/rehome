'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#14b8a6', '#ff6b35', '#fbbf24', '#22c55e', '#fef3c7']
const PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 90) / 100,
  duration: 2.2 + ((i * 29) % 14) / 10,
  size: 6 + ((i * 17) % 6),
  color: COLORS[i % COLORS.length],
  round: i % 3 === 0,
}))
const LIFETIME_MS = 4500

/**
 * One-shot confetti burst. With `onceKey`, it plays at most once per browser
 * session for that key, so a returning winner is not showered on every visit.
 */
export function Confetti({ onceKey }: { onceKey?: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (onceKey) {
      try {
        if (sessionStorage.getItem(onceKey)) return
        sessionStorage.setItem(onceKey, '1')
      } catch {
        // storage blocked: still celebrate
      }
    }
    const start = setTimeout(() => setShow(true), 0)
    const stop = setTimeout(() => setShow(false), LIFETIME_MS)
    return () => {
      clearTimeout(start)
      clearTimeout(stop)
    }
  }, [onceKey])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none" aria-hidden>
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.6,
            borderRadius: p.round ? '50%' : 2,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}
