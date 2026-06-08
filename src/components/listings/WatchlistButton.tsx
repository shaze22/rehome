'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  listingId: string
  currentUserId: string | null
}

export function WatchlistButton({ listingId, currentUserId }: Props) {
  const [watching, setWatching] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentUserId) return
    fetch(`/api/watchlist?listingId=${listingId}`)
      .then(r => r.json())
      .then(d => setWatching(d.watching ?? false))
  }, [listingId, currentUserId])

  async function toggle() {
    if (loading) return
    if (!currentUserId) {
      window.location.href = `/auth/login?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setLoading(true)
    const res = await fetch('/api/watchlist', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    })
    const d = await res.json()
    setWatching(d.watching)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 disabled:opacity-40"
      style={{
        backgroundColor: watching ? 'rgba(239,68,68,0.1)' : 'var(--bg-elevated)',
        border: `1px solid ${watching ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
        color: watching ? 'var(--red)' : 'var(--text-secondary)',
      }}
      title={currentUserId ? (watching ? 'Remove from saved' : 'Save listing') : 'Sign in to save'}
    >
      <Heart className="w-3.5 h-3.5" fill={watching ? 'currentColor' : 'none'} />
      {watching ? 'Saved' : 'Save'}
    </button>
  )
}
