'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, CheckCircle, Gavel, Leaf, MapPin } from 'lucide-react'
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

  useEffect(() => {
    if (!endsAt) {
      setTimeLeft('Waiting for first bid')
      setIsUrgent(false)
      return
    }
    function update() {
      const diff = new Date(endsAt as Date | string).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setIsUrgent(diff < 300000)
      if (h > 0) setTimeLeft(`${h}j ${m}m`)
      else if (m > 0) setTimeLeft(`${m}m ${s}s`)
      else setTimeLeft(`${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent }
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Furniture', ELECTRONICS: 'Electronics', FASHION: 'Fashion',
  BOOKS: 'Books', SPORTS: 'Sports', KITCHEN: 'Kitchen', OTHERS: 'Others',
}

export function ListingCard({ listing }: Props) {
  const { timeLeft, isUrgent } = useCountdown(listing.endsAt ?? null)
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
      <div className="rounded-xl overflow-hidden card-hover cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
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
          {/* Category badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-medium" style={{ backgroundColor: 'rgba(10,10,15,0.8)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.3)', backdropFilter: 'blur(4px)' }}>
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </div>
          {/* HOT badge */}
          {isHot && (
            <div className="absolute top-8 left-2 px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'white', backdropFilter: 'blur(4px)' }}>
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
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Current bid</p>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--teal)' }}>
                RM {bid.toFixed(0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Time left</p>
              {isWaitingLong ? (
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  Waiting {daysWaiting} days
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
