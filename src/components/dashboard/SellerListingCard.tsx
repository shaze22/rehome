import Link from 'next/link'
import { Clock, Gavel, Eye, XCircle } from 'lucide-react'

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
  const isWaiting = listing.endsAt === null
  const endDate = listing.endsAt ? new Date(listing.endsAt) : null
  const isActive = listing.status === 'ACTIVE' && (isWaiting || (endDate !== null && endDate > new Date()))

  return (
    <Link href={`/listings/${listing.id}`}>
      <div className="rounded-xl p-4 transition-all card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
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
                  {listing.viewCount} tontonan
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
          </div>
          <span
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${STATUS_COLORS[listing.status] ?? 'var(--text-muted)'}15`,
              color: STATUS_COLORS[listing.status] ?? 'var(--text-muted)',
            }}
          >
            {STATUS_LABELS[listing.status] ?? listing.status}
          </span>
        </div>
      </div>
    </Link>
  )
}
