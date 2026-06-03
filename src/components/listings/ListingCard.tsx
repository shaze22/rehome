'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, CheckCircle, Gavel, Leaf, MapPin, Zap } from 'lucide-react'
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
  seller: {
    name: string | null
    rehomeScore: number
    icVerified: boolean
  }
  _count?: { bids: number }
}

interface Props {
  listing: ListingWithSeller
}

function useCountdown(endsAt: Date | string | null) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isEndingSoon, setIsEndingSoon] = useState(false)

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft('🎯 No bids yet — could be yours for FREE!')
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

export function ListingCard({ listing }: Props) {
  const { timeLeft, isUrgent, isEndingSoon } = useCountdown(listing.endsAt ?? null)
  const bid = listing.currentBid > 0 ? listing.currentBid : listing.startingBid
  const bidCount = listing._count?.bids ?? 0
  const isHot = (listing.viewCount ?? 0) >= 20 || bidCount >= 3
  const isWaitingLong = !listing.endsAt && listing.createdAt
    ? (Date.now() - new Date(listing.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000
    : false
  const daysWaiting = listing.createdAt
    ? Math.floor((Date.now() - new Date(listing.createdAt).getTime()) / 86400000)
    : 0

  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <div
        className="rounded-xl overflow-hidden card-hover cursor-pointer"
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
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gavel className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          {/* ENDING SOON full-width banner */}
          {isEndingSoon && (
            <div className="absolute top-0 left-0 right-0 z-10 py-1 text-center text-xs font-bold" style={{ background: 'rgba(239,68,68,0.9)', color: 'white' }}>
              🔥 ENDING SOON
            </div>
          )}
          {/* ⚡ FLASH BID mode badge */}
          <div className={`absolute left-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${isEndingSoon ? 'top-8' : 'top-2'}`}
            style={{ background: 'linear-gradient(135deg,#ff6b35,#f59e0b)', color: 'white', backdropFilter: 'blur(4px)' }}>
            <Zap className="w-2.5 h-2.5" />
            FLASH BID
          </div>
          {/* Category badge */}
          <div className={`absolute left-2 px-2 py-0.5 rounded-md text-xs font-medium ${isEndingSoon ? 'top-14' : 'top-8'}`}
            style={{ backgroundColor: 'rgba(10,10,15,0.75)', color: 'var(--text-secondary)', backdropFilter: 'blur(4px)' }}>
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </div>
          {/* HOT / bid count badge */}
          {bidCount >= 5 ? (
            <div className={`absolute left-2 px-2 py-0.5 rounded-md text-xs font-bold ${isEndingSoon ? 'top-20' : 'top-14'}`} style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'white', backdropFilter: 'blur(4px)' }}>
              🔥 {bidCount} bids
            </div>
          ) : isHot && (
            <div className={`absolute left-2 px-2 py-0.5 rounded-md text-xs font-bold ${isEndingSoon ? 'top-20' : 'top-14'}`} style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'white', backdropFilter: 'blur(4px)' }}>
              🔥 Hot
            </div>
          )}
          {/* Condition badge */}
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono" style={{ backgroundColor: 'rgba(10,10,15,0.8)', color: listing.condition >= 7 ? 'var(--green)' : listing.condition >= 4 ? 'var(--yellow)' : 'var(--orange)', backdropFilter: 'blur(4px)' }}>
            {listing.condition}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 mb-2" style={{ color: 'var(--text-primary)' }}>
            {listing.title}
          </h3>

          {/* Bid info */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                {bidCount === 0 ? 'Be the first bidder' : 'Current bid'}
              </p>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--teal)' }}>
                {bidCount === 0 && listing.startingBid === 0 ? 'Starting at RM 0' : `RM ${bid.toFixed(0)}`}
              </p>
            </div>
            <div className="text-right">
              {isWaitingLong ? (
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Waiting {daysWaiting} days
                </p>
              ) : !listing.endsAt ? (
                <p className="text-xs font-mono text-right" style={{ color: 'var(--text-muted)', maxWidth: '120px' }}>
                  {timeLeft}
                </p>
              ) : (
                <p className={`text-sm font-mono font-medium ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : 'var(--text-primary)' }}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {timeLeft}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3" />
              {listing.state}
            </div>
            <div className="flex items-center gap-2">
              {(listing.viewCount ?? 0) > 10 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  👀 {listing.viewCount}
                </span>
              )}
              {listing.seller.icVerified && (
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
              )}
              {listing.co2Saved > 0 && (
                <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--green)' }}>
                  <Leaf className="w-3 h-3" />
                  {listing.co2Saved}kg
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
