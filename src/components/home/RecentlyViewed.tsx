'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock } from 'lucide-react'

export interface RecentItem {
  id: string
  title: string
  photo: string | null
  mode: 'FLASH' | 'SWAP'
  currentBid?: number
}

const KEY = 'kassim_recently_viewed'
const MAX = 6

export function trackRecentlyViewed(item: RecentItem) {
  try {
    const raw = localStorage.getItem(KEY)
    const existing: RecentItem[] = raw ? JSON.parse(raw) : []
    const filtered = existing.filter(i => i.id !== item.id)
    const updated = [item, ...filtered].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return
      const all: RecentItem[] = JSON.parse(raw)
      const valid = all.filter(i => !i.title.startsWith('[') && !i.title.toLowerCase().startsWith('[test]'))
      if (valid.length !== all.length) localStorage.setItem(KEY, JSON.stringify(valid))
      setItems(valid)
    } catch {
      // ignore
    }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-lg font-bold">Recently Viewed</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {items.map(item => (
            <Link
              key={item.id}
              href={`/listings/${item.id}`}
              className="flex-shrink-0 w-36 rounded-xl overflow-hidden card-hover"
              style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${item.mode === 'SWAP' ? 'rgba(22,163,74,0.3)' : 'var(--border)'}` }}
            >
              <div className="relative aspect-square bg-[var(--bg-elevated)]">
                {item.photo ? (
                  <Image src={item.photo} alt={item.title} fill className="object-cover" sizes="144px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {item.mode === 'SWAP' ? '🔄' : '⚡'}
                  </div>
                )}
                <div
                  className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{
                    backgroundColor: item.mode === 'SWAP' ? 'rgba(22,163,74,0.9)' : 'rgba(20,184,166,0.9)',
                    color: 'white',
                  }}
                >
                  {item.mode}
                </div>
              </div>
              <div className="p-2">
                <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </p>
                {item.mode === 'FLASH' && item.currentBid !== undefined && (
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--teal)' }}>
                    RM {item.currentBid}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
