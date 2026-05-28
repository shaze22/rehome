'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Truck, CheckCircle, Star, AlertCircle, Loader2 } from 'lucide-react'

interface Order {
  listingId: string
  title: string
  amount: number
  sellerPayout: number
  status: string
  shippingStatus: string
  trackingNumber: string | null
  deliveryConfirmed: boolean
  isSeller: boolean
}

interface Props { order: Order }

export function OrderCard({ order }: Props) {
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState('')
  const [showTracking, setShowTracking] = useState(false)
  const [localOrder, setLocalOrder] = useState(order)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const [error, setError] = useState('')

  async function handleShip() {
    setLoading(true); setError('')
    const res = await fetch(`/api/transactions/${localOrder.listingId}/ship`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber: tracking || undefined }),
    })
    setLoading(false)
    if (res.ok) { setLocalOrder(o => ({ ...o, shippingStatus: 'SHIPPED', trackingNumber: tracking || null })); setShowTracking(false) }
    else { const d = await res.json(); setError(d.error) }
  }

  async function handleConfirm() {
    setLoading(true); setError('')
    const res = await fetch(`/api/transactions/${localOrder.listingId}/confirm`, { method: 'POST' })
    setLoading(false)
    if (res.ok) setLocalOrder(o => ({ ...o, deliveryConfirmed: true, shippingStatus: 'DELIVERED', status: 'RELEASED' }))
    else { const d = await res.json(); setError(d.error) }
  }

  async function handleReview() {
    if (!rating) return
    setLoading(true); setError('')
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: localOrder.listingId, rating, comment }),
    })
    setLoading(false)
    if (res.ok) setReviewed(true)
    else { const d = await res.json(); setError(d.error) }
  }

  const statusColor: Record<string, string> = {
    PENDING: 'var(--yellow)', SHIPPED: 'var(--blue)', DELIVERED: 'var(--green)'
  }
  const statusLabel: Record<string, string> = {
    PENDING: 'Belum Dihantar', SHIPPED: 'Dalam Penghantaran', DELIVERED: 'Diterima'
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <Link href={`/listings/${localOrder.listingId}`} className="text-sm font-medium hover:underline">
            {localOrder.title}
          </Link>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono" style={{ color: 'var(--teal)' }}>RM {localOrder.amount.toFixed(0)}</span>
            {localOrder.isSeller && <span style={{ color: 'var(--green)' }}>Payout: RM {localOrder.sellerPayout.toFixed(0)}</span>}
          </div>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${statusColor[localOrder.shippingStatus] ?? 'var(--text-muted)'}15`, color: statusColor[localOrder.shippingStatus] ?? 'var(--text-muted)' }}>
          {statusLabel[localOrder.shippingStatus] ?? localOrder.shippingStatus}
        </span>
      </div>

      {localOrder.trackingNumber && (
        <p className="text-xs mb-3 px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          No. Pengesanan: <span className="font-mono">{localOrder.trackingNumber}</span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* Seller actions */}
      {localOrder.isSeller && localOrder.shippingStatus === 'PENDING' && localOrder.status === 'ESCROWED' && (
        showTracking ? (
          <div className="space-y-2">
            <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="No. pengesanan (optional)"
              className="w-full px-3 py-2 rounded-lg text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <button onClick={handleShip} disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white"
                style={{ background: 'linear-gradient(135deg, var(--blue), var(--teal))' }}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                Tandakan Dihantar
              </button>
              <button onClick={() => setShowTracking(false)} className="px-3 py-2 rounded-lg text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Batal
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowTracking(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--blue)', color: 'var(--blue)', backgroundColor: 'rgba(79,140,255,0.08)' }}>
            <Truck className="w-3.5 h-3.5" /> Item Sudah Dihantar
          </button>
        )
      )}

      {/* Buyer actions */}
      {!localOrder.isSeller && localOrder.shippingStatus === 'SHIPPED' && !localOrder.deliveryConfirmed && (
        <button onClick={handleConfirm} disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--green), var(--teal))' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Sahkan Terima Item
        </button>
      )}

      {/* Review */}
      {!localOrder.isSeller && localOrder.deliveryConfirmed && !reviewed && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Beri penilaian penjual:</p>
          <div className="flex gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)} className="text-xl transition-transform hover:scale-110">
                <span style={{ color: s <= rating ? 'var(--yellow)' : 'var(--text-muted)' }}>★</span>
              </button>
            ))}
          </div>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Ulasan (optional)"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={handleReview} disabled={!rating || loading}
            className="w-full py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--yellow), var(--orange))' }}>
            <Star className="w-3.5 h-3.5 inline mr-1" /> Hantar Ulasan
          </button>
        </div>
      )}

      {reviewed && (
        <div className="mt-2 text-xs text-center" style={{ color: 'var(--green)' }}>
          ✓ Ulasan diberikan. Terima kasih!
        </div>
      )}
    </div>
  )
}
