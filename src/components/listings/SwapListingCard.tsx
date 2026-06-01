'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Clock, CheckCircle, ArrowLeftRight, MapPin, MessageSquare } from 'lucide-react'
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
}

function useCountdown(endsAt: Date | string | null) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)

  useEffect(() => {
    if (!endsAt) { setTimeLeft('Tiada had masa'); return }
    function update() {
      const diff = new Date(endsAt as Date | string).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Tamat'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setIsUrgent(diff < 3 * 3600000)
      if (h >= 24) setTimeLeft(`${Math.floor(h / 24)}h ${h % 24}j`)
      else if (h > 0) setTimeLeft(`${h}j ${m}m`)
      else setTimeLeft(`${m}m`)
    }
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent }
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Perabot', ELECTRONICS: 'Elektronik', FASHION: 'Fesyen',
  BOOKS: 'Buku', SPORTS: 'Sukan', KITCHEN: 'Dapur', OTHERS: 'Lain-lain',
}

export function SwapListingCard({ listing }: Props) {
  const { timeLeft, isUrgent } = useCountdown(listing.endsAt ?? null)
  const offerCount = listing._count?.offers ?? 0
  const isHot = (listing.viewCount ?? 0) >= 20 || offerCount >= 3

  const wantedLabel = listing.swapOpenOffers
    ? 'Terbuka kepada semua tawaran'
    : [listing.swapWantedItem, listing.swapWantedCategory ? CATEGORY_LABELS[listing.swapWantedCategory] : null]
        .filter(Boolean).join(' / ') || 'Lihat butiran'

  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <div className="rounded-xl overflow-hidden card-hover cursor-pointer" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
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
              <ArrowLeftRight className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          {/* SWAP badge */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1" style={{ backgroundColor: 'rgba(22,163,74,0.9)', color: 'white', backdropFilter: 'blur(4px)' }}>
            <ArrowLeftRight className="w-3 h-3" />
            SWAP
          </div>
          {/* HOT badge */}
          {isHot && (
            <div className="absolute top-8 left-2 px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: 'linear-gradient(135deg,#f97316,#ef4444)', color: 'white', backdropFilter: 'blur(4px)' }}>
              🔥 Popular
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

          {/* Value estimate */}
          {listing.swapValueEstimate && (
            <div className="mb-2">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>Nilai anggaran</p>
              <p className="text-base font-bold font-mono" style={{ color: '#16a34a' }}>
                ~RM {listing.swapValueEstimate.toFixed(0)}
              </p>
            </div>
          )}

          {/* Wanted */}
          <div className="mb-2 px-2 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Dicari: </span>
            <span className="font-medium" style={{ color: '#16a34a' }}>{wantedLabel}</span>
            {listing.swapAcceptCash && (
              <span className="ml-1" style={{ color: 'var(--text-muted)' }}>/ Wang ok</span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <MapPin className="w-3 h-3" />
              {listing.state}
            </div>
            <div className="flex items-center gap-2">
              {offerCount > 0 && (
                <div className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <MessageSquare className="w-3 h-3" />
                  {offerCount}
                </div>
              )}
              {listing.seller.icVerified && (
                <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
              )}
              <div className={`flex items-center gap-0.5 text-xs font-mono ${isUrgent ? 'text-red-400' : ''}`} style={{ color: isUrgent ? undefined : 'var(--text-muted)' }}>
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
