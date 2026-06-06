'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clock, Gavel, Eye, Loader2, Trash2 } from 'lucide-react'

interface Listing {
  id: string
  title: string
  currentBid: number
  startingBid: number
  status: string
  mode?: string
  endsAt: string | Date | null
  viewCount?: number
  _count: { bids: number }
}

interface Props {
  listing: Listing
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  ENDED: 'Tamat',
  SOLD: 'Dijual',
  CANCELLED: 'Dibatal',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'var(--green)',
  ENDED: 'var(--yellow)',
  SOLD: 'var(--teal)',
  CANCELLED: 'var(--red)',
}

export function SellerListingCard({ listing }: Props) {
  const [status, setStatus] = useState(listing.status)
  const [cancelling, setCancelling] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const isWaiting = listing.endsAt === null
  const endDate = listing.endsAt ? new Date(listing.endsAt) : null
  const isActive = status === 'ACTIVE' && (isWaiting || (endDate !== null && endDate > new Date()))
  const canCancel = status === 'ACTIVE' && listing._count.bids === 0

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}/cancel`, { method: 'POST' })
      if (res.ok) { setStatus('CANCELLED'); setConfirm(false) }
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="rounded-xl p-4 transition-all" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/listings/${listing.id}`} className="flex-1 min-w-0 hover:underline">
          <p className="text-sm font-medium line-clamp-1 mb-1">{listing.title}</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono" style={{ color: 'var(--teal)' }}>
              RM {(listing.currentBid || listing.startingBid).toFixed(0)}
            </span>
            <span className="flex items-center gap-1">
              <Gavel className="w-3 h-3" />
              {listing._count.bids} tawaran
            </span>
            {listing.viewCount !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {listing.viewCount}
              </span>
            )}
            {isWaiting ? (
              <span className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-3 h-3" />
                Menunggu bidder
              </span>
            ) : isActive && endDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {endDate.toLocaleDateString('ms-MY')}
              </span>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${STATUS_COLORS[status] ?? 'var(--text-muted)'}15`,
              color: STATUS_COLORS[status] ?? 'var(--text-muted)',
            }}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
          {canCancel && !confirm && (
            <button
              onClick={() => setConfirm(true)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Cancel listing"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {confirm && (
        <div className="mt-3 flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>Batalkan listing ini?</p>
          <button
            onClick={() => setConfirm(false)}
            className="text-xs px-2 py-1 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            Tidak
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Ya, Batal
          </button>
        </div>
      )}
    </div>
  )
}
