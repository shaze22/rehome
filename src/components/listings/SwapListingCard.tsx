'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, CheckCircle, ArrowLeftRight, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SwapListing {
  id: string
  title: string
  photos: string[]
  category: string
  condition: number
  state: string
  endsAt: Date | string | null
  swapWantedItem: string | null
  swapWantedCategory: string | null
  swapOpenOffers: boolean
  swapAcceptCash: boolean
  swapValueEstimate: number | null
  viewCount?: number
  seller: {
    id?: string
    name: string | null
    rehomeScore: number
    icVerified: boolean
    swapScore?: number | null
    swapVerified?: boolean
  }
  _count?: { bids: number; offers: number }
}

interface Props {
  listing: SwapListing
  priority?: boolean
}

function useCountdown(endsAt: Date | string | null) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (!endsAt) { setTimeLeft('No time limit'); return }
    function update() {
      const diff = new Date(endsAt as Date | string).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setIsUrgent(diff < 3 * 3600000)
      if (h >= 24) setTimeLeft(`${Math.floor(h / 24)}d ${h % 24}h`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m`)
      else setTimeLeft(`${m}m`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent }
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
  9: { label: 'Excellent', color: 'var(--green)' },
  8: { label: 'Very Good', color: 'var(--green)' },
  7: { label: 'Good', color: 'var(--teal)' },
  6: { label: 'Fair', color: 'var(--yellow)' },
  5: { label: 'Fair', color: 'var(--yellow)' },
  4: { label: 'Used', color: 'var(--orange)' },
  3: { label: 'Worn', color: 'var(--orange)' },
  2: { label: 'Poor', color: 'var(--red)' },
  1: { label: 'For Parts', color: 'var(--red)' },
}

export function SwapListingCard({ listing, priority = false }: Props) {
  const { timeLeft, isUrgent } = useCountdown(listing.endsAt ?? null)
  const offerCount = listing._count?.offers ?? 0
  const condInfo = CONDITION_LABEL[listing.condition] ?? { label: `${listing.condition}/10`, color: 'var(--text-muted)' }

  const wantedLabel = listing.swapOpenOffers
    ? 'Open to all offers'
    : [listing.swapWantedItem, listing.swapWantedCategory ? CATEGORY_LABELS[listing.swapWantedCategory] : null]
        .filter(Boolean).join(' / ') || 'View details'

  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <div className="rounded-xl overflow-hidden card-hover cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
        {/* Image — only SWAP BID badge */}
        <div className="relative aspect-square bg-[var(--bg-elevated)] overflow-hidden">
          {listing.photos[0] ? (
            <Image
              src={listing.photos[0]}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              priority={priority}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{ background: CATEGORY_PLACEHOLDERS[listing.category]?.bg ?? CATEGORY_PLACEHOLDERS.OTHERS.bg }}>
              <span className="text-4xl">{CATEGORY_PLACEHOLDERS[listing.category]?.emoji ?? '📦'}</span>
              <span className="text-xs font-medium text-white opacity-70">{CATEGORY_LABELS[listing.category] ?? listing.category}</span>
            </div>
          )}

          {/* SWAP BID badge — bottom left only */}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#16a34a,#14b8a6)', color: 'white', backdropFilter: 'blur(4px)' }}>
            <ArrowLeftRight className="w-2.5 h-2.5" />
            SWAP BID
          </div>

          {/* Offer count — bottom right */}
          {offerCount >= 2 && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-xs font-bold"
              style={{ background: 'rgba(10,10,15,0.8)', color: 'white', backdropFilter: 'blur(4px)' }}>
              🔥 {offerCount} offers
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-medium text-sm line-clamp-2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {listing.title}
          </h3>

          {/* Condition + category row */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${condInfo.color}18`, color: condInfo.color, border: `1px solid ${condInfo.color}30` }}>
              {condInfo.label}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {CATEGORY_LABELS[listing.category] ?? listing.category}
            </span>
          </div>

          {/* Value estimate */}
          {listing.swapValueEstimate && (
            <div className="mb-2">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Est. value</p>
              <p className="text-base font-bold font-mono" style={{ color: '#16a34a' }}>
                ~RM {listing.swapValueEstimate.toFixed(0)}
              </p>
            </div>
          )}

          {/* Offer types */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)' }}>
              🔄 Item Swap
            </span>
            {listing.swapAcceptCash && (
              <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.25)' }}>
                💰 Cash Bid
              </span>
            )}
          </div>

          {/* Wanted item */}
          <div className="mb-2 px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.15)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Wants: </span>
            <span className="font-medium" style={{ color: '#16a34a' }}>{wantedLabel}</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
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
            <div className="flex items-center gap-2">
              {offerCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <MessageSquare className="w-3 h-3" />
                  {offerCount}
                </div>
              )}
              {listing.seller.icVerified && (
                <span title="IC Verified">
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
                </span>
              )}
              <div className="flex items-center gap-0.5 text-xs font-mono" style={{ color: isUrgent ? 'var(--red)' : 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" />
                {timeLeft}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
