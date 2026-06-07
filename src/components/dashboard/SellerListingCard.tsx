'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clock, Gavel, Eye, Loader2, Trash2, Share2, Pencil } from 'lucide-react'

interface Listing {
  id: string
  title: string
  currentBid: number
  startingBid: number
  status: string
  mode?: string
  endsAt: string | Date | null
  viewCount?: number
  _count: { bids: number; offers: number }
}

interface Props {
  listing: Listing
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  ENDED: 'Ended',
  SOLD: 'Sold',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'var(--green)',
  ENDED: 'var(--yellow)',
  SOLD: 'var(--teal)',
  CANCELLED: 'var(--red)',
}

export function SellerListingCard({ listing }: Props) {
  const [status, setStatus] = useState(listing.status)
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)

  const isWaiting = listing.endsAt === null
  const endDate = listing.endsAt ? new Date(listing.endsAt) : null
  const isActive = status === 'ACTIVE' && (isWaiting || (endDate !== null && endDate > new Date()))
  const canDelete = true

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setDeleteError(data.error ?? 'Failed to delete. Please try again.')
        setConfirm(false)
      }
    } finally {
      setDeleting(false)
    }
  }

  if (deleted) return null

  return (
    <div className="rounded-xl p-4 transition-all" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/listings/${listing.id}`} className="flex-1 min-w-0 hover:underline">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-bold flex-shrink-0" style={{ color: listing.mode === 'SWAP' ? '#16a34a' : 'var(--orange)' }}>
              {listing.mode === 'SWAP' ? '🔄' : '⚡'}
            </span>
            <p className="text-sm font-medium line-clamp-1">{listing.title}</p>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono" style={{ color: 'var(--teal)' }}>
              RM {(listing.currentBid || listing.startingBid).toFixed(0)}
            </span>
            <span className="flex items-center gap-1">
              <Gavel className="w-3 h-3" />
              {listing._count.bids} {listing._count.bids === 1 ? 'bid' : 'bids'}
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
                Waiting for bid
              </span>
            ) : isActive && endDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {endDate.toLocaleDateString('en-MY')}
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
          {status === 'ACTIVE' && (
            <>
              <Link
                href={`/sell/edit/${listing.id}`}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.3)' }}
                title="Edit listing"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => {
                  const url = `https://kassim.app/listings/${listing.id}`
                  const text = listing.mode === 'SWAP'
                    ? `\u{1F504} Interested to swap or buy *${listing.title}*? Make an offer on KASSIM!\n\n${url}`
                    : `⚡ Bid on *${listing.title}* from RM0! Only 30 mins once timer starts. Grab it fast on KASSIM!\n\n${url}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#25D366', border: '1px solid rgba(37,211,102,0.3)' }}
                title="Share via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {canDelete && !confirm && (
            <button
              onClick={() => setConfirm(true)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              title="Delete listing"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {deleteError && (
        <p className="mt-2 text-xs" style={{ color: 'var(--red)' }}>{deleteError}</p>
      )}
      {confirm && (
        <div className="mt-3 flex items-center gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>Delete this listing?</p>
          <button onClick={() => setConfirm(false)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
            No
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Yes, Delete
          </button>
        </div>
      )}
    </div>
  )
}
