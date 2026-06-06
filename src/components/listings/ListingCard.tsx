'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, CheckCircle, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ListingWithSeller {
  id: string
  title: string
  currentBid: number
  startingBid: number
  endsAt: Date | string | null
  photos: string[]
  category: string
  condition: number
  state: string
  co2Saved: number
  status: string
  viewCount?: number
  createdAt?: Date | string
  sellerId?: string
  seller: {
    id?: string
    name: string | null
    rehomeScore: number
    icVerified: boolean
  }
  _count?: { bids: number }
}

interface Props {
  listing: ListingWithSeller
  priority?: boolean
}

function useCountdown(endsAt: Date | string | null) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isEndingSoon, setIsEndingSoon] = useState(false)

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft('')
      setIsUrgent(false)
      setIsEndingSoon(false)
      return
    }
    function update() {
      const diff = new Date(endsAt as Date | string).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setIsUrgent(diff < 300000)
      setIsEndingSoon(diff < 300000)
      if (h > 0) setTimeLeft(`${h}h ${m}m`)
      else if (m > 0) setTimeLeft(`${m}m ${s}s`)
      else setTimeLeft(`${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent, isEndingSoon }
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Furniture', ELECTRONICS: 'Electronics', FASHION: 'Fashion',
  BOOKS: 'Books', SPORTS: 'Sports', KITCHEN: 'Kitchen', OTHERS: 'Others',
}

const CATEGORY_PLACEHOLDERS: Record<string, { emoji: string; bg: string }> = {
  FURNITURE: { emoji: '🛋️', bg: 'linear-gradient(135deg,#78350f,#92400e)' },
  ELECTRONICS: { emoji: '📱', bg: 'linear-gradient(135deg,#1e3a5f,#1e40af)' },
  FASHION: { emoji: '👗', bg: 'linear-gradient(135deg,#5b21b6,#7c3aed)' },
  BOOKS: { emoji: '📚', bg: 'linear-gradient(135deg,#14532d,#15803d)' },
  SPORTS: { emoji: '⚽', bg: 'linear-gradient(135deg,#7f1d1d,#b91c1c)' },
  KITCHEN: { emoji: '🍳', bg: 'linear-gradient(135deg,#713f12,#ca8a04)' },
  OTHERS: { emoji: '📦', bg: 'linear-gradient(135deg,#1f2937,#374151)' },
}

const CONDITION_LABEL: Record<number, { label: string; color: string }> = {
  10: { label: 'Like New', color: 'var(--green)' },
  9:  { label: 'Excellent', color: 'var(--green)' },
  8:  { label: 'Very Good', color: 'var(--green)' },
  7:  { label: 'Good', color: 'var(--teal)' },
  6:  { label: 'Fair', color: 'var(--yellow)' },
  5:  { label: 'Fair', color: 'var(--yellow)' },
  4:  { label: 'Used', color: 'var(--orange)' },
  3:  { label: 'Worn', color: 'var(--orange)' },
  2:  { label: 'Poor', color: 'var(--red)' },
  1:  { label: 'For Parts', color: 'var(--red)' },
}

export function ListingCard({ listing, priority = false }: Props) {
  const { timeLeft, isUrgent, isEndingSoon } = useCountdown(listing.endsAt ?? null)
  const bid = listing.currentBid > 0 ? listing.currentBid : listing.startingBid
  const bidCount = listing._count?.bids ?? 0
  const condInfo = CONDITION_LABEL[listing.condition] ?? { label: `${listing.condition}/10`, color: 'var(--text-muted)' }
  const isFree = bidCount === 0 && listing.startingBid === 0

  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <div
        className="rounded-xl overflow-hidden card-hover cursor-pointer h-full"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: isEndingSoon ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--border)',
          boxShadow: isEndingSoon ? '0 0 16px rgba(239,68,68,0.15)' : undefined,
        }}
      >
        {/* Image */}
        <div className="relative aspect-square bg-[var(--bg-elevated)] overflow-hidden">
          {listing.photos[0] ? (
            <Image
              src={listing.photos[0]}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1"
              style={{ background: CATEGORY_PLACEHOLDERS[listing.category]?.bg ?? CATEGORY_PLACEHOLDERS.OTHERS.bg }}>
              <span className="text-3xl sm:text-4xl">{CATEGORY_PLACEHOLDERS[listing.category]?.emoji ?? '📦'}</span>
              <span className="text-xs font-medium text-white opacity-70 hidden sm:block">{CATEGORY_LABELS[listing.category] ?? listing.category}</span>
            </div>
          )}

          {isEndingSoon && (
            <div className="absolute top-0 left-0 right-0 z-10 py-0.5 sm:py-1 text-center text-xs font-bold" style={{ background: 'rgba(239,68,68,0.92)', color: 'white' }}>
              🔥 ENDING SOON
            </div>
          )}

          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#ff6b35,#f59e0b)', color: 'white', backdropFilter: 'blur(4px)' }}>
            <Zap className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">FLASH BID</span>
            <span className="sm:hidden">FLASH</span>
          </div>

          {bidCount >= 2 && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-xs font-bold"
              style={{ background: 'rgba(10,10,15,0.8)', color: 'white', backdropFilter: 'blur(4px)' }}>
              🔥 {bidCount}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3">
          <h3 className="font-medium text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
            <span className="text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded" style={{ backgroundColor: `${condInfo.color}18`, color: condInfo.color, border: `1px solid ${condInfo.color}30` }}>
              {condInfo.label}
            </span>
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs mb-0.5 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
                {bidCount === 0 ? 'No bids — be first!' : 'Current bid'}
              </p>
              <p className="text-sm sm:text-lg font-bold font-mono" style={{ color: isFree ? 'var(--green)' : 'var(--teal)' }}>
                {isFree ? (
                  <>
                    <span className="sm:hidden">FREE</span>
                    <span className="hidden sm:inline">RM 0 — FREE</span>
                  </>
                ) : `RM ${bid.toFixed(0)}`}
              </p>
            </div>
            <div className="text-right">
              {listing.endsAt ? (
                <span className={`text-xs font-mono font-medium ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : 'var(--text-muted)' }}>
                  <Clock className="w-3 h-3 inline mr-0.5" />
                  {timeLeft}
                </span>
              ) : (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="hidden sm:inline">Waiting</span>
                  <span className="sm:hidden">—</span>
                </span>
              )}
            </div>
          </div>

          {/* Footer — hidden on mobile to keep cards compact */}
          <div className="hidden sm:flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{listing.state}</span>
              {listing.seller.id && listing.seller.name && (
                <Link
                  href={`/profile/${listing.seller.id}`}
                  onClick={e => e.stopPropagation()}
                  className="text-xs truncate hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  · {listing.seller.name}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {(listing.viewCount ?? 0) > 10 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>👀 {listing.viewCount}</span>
              )}
              {listing.seller.icVerified && (
                <span title="IC Verified Seller">
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
                </span>
              )}
            </div>
          </div>

          {/* Mobile-only minimal footer */}
          <div className="flex sm:hidden items-center justify-between pt-1.5 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{listing.state}</span>
            {listing.seller.icVerified && (
              <CheckCircle className="w-3 h-3" style={{ color: 'var(--teal)' }} />
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
