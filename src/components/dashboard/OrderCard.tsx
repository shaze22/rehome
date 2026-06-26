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
  courierName?: string | null
  courierService?: string | null
  buyerPostcode?: string | null
  buyerPhone?: string | null
  buyerAddress?: string | null
  deliveryFee?: number | null
  easyparcelOrderId?: string | null
  lalamoveOrderId?: string | null
  deliveryTrackingUrl?: string | null
  posLabelUrl?: string | null
  pickupMethod?: string | null
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
  const isPickup = localOrder.pickupMethod === 'PICKUP'

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
    PENDING: 'Not Shipped', SHIPPED: 'In Transit', DELIVERED: 'Received'
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

      {/* Delivery booking details (seller sees buyer info; buyer sees tracking) */}
      {localOrder.isSeller && localOrder.courierName && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>📦 Delivery Info</p>
          {localOrder.courierName && <p style={{ color: 'var(--text-muted)' }}>Courier: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{localOrder.courierName} {localOrder.courierService ? `· ${localOrder.courierService}` : ''}</span></p>}
          {localOrder.buyerPostcode && <p style={{ color: 'var(--text-muted)' }}>Buyer postcode: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{localOrder.buyerPostcode}</span></p>}
          {localOrder.buyerPhone && <p style={{ color: 'var(--text-muted)' }}>Buyer phone: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{localOrder.buyerPhone}</span></p>}
          {localOrder.buyerAddress && <p style={{ color: 'var(--text-muted)' }}>Address: <span style={{ color: 'var(--text-primary)' }}>{localOrder.buyerAddress}</span></p>}
          {localOrder.easyparcelOrderId && <p style={{ color: 'var(--text-muted)' }}>EasyParcel ID: <span className="font-mono" style={{ color: 'var(--teal)' }}>{localOrder.easyparcelOrderId}</span></p>}
          {localOrder.lalamoveOrderId && <p style={{ color: 'var(--text-muted)' }}>Lalamove ID: <span className="font-mono" style={{ color: 'var(--teal)' }}>{localOrder.lalamoveOrderId}</span></p>}
          {localOrder.deliveryFee && <p style={{ color: 'var(--text-muted)' }}>Delivery charged: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>RM {localOrder.deliveryFee.toFixed(2)}</span></p>}
        </div>
      )}

      {/* Tracking link (both buyer + seller) — Lalamove live driver or Pos parcel */}
      {localOrder.deliveryTrackingUrl && (
        <a href={localOrder.deliveryTrackingUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs mb-3 px-3 py-2 rounded-lg font-medium"
          style={{ backgroundColor: 'rgba(249,115,22,0.1)', color: 'var(--orange)', border: '1px solid var(--orange)' }}>
          <Truck className="w-3.5 h-3.5" /> {localOrder.lalamoveOrderId ? 'Track Lalamove driver (live)' : 'Track parcel (Pos Laju)'}
        </a>
      )}

      {/* Pos Laju consignment label — seller prints, sticks on parcel, drops at Pos */}
      {localOrder.isSeller && localOrder.posLabelUrl && (
        <div className="mb-3">
          <a href={localOrder.posLabelUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium"
            style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: 'var(--blue)', border: '1px solid var(--blue)' }}>
            <Package className="w-3.5 h-3.5" /> Print Pos Laju label (PDF)
          </a>
          <p className="text-xs mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
            Print it, stick on your parcel, then drop off at any Pos Malaysia / Pos Laju branch. Then mark as shipped below.
          </p>
        </div>
      )}

      {localOrder.trackingNumber && (
        <p className="text-xs mb-3 px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          Tracking No.: <span className="font-mono">{localOrder.trackingNumber}</span>
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {/* Self-pickup (Lalamove-uncovered area) — no courier, parties meet up */}
      {isPickup && localOrder.status !== 'RELEASED' && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'rgba(0,217,165,0.08)', border: '1px solid rgba(0,217,165,0.3)' }}>
          <p className="font-medium flex items-center gap-1.5" style={{ color: 'var(--green)' }}><Package className="w-3.5 h-3.5" /> Self-Pickup</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {localOrder.isSeller
              ? `Buyer collects from you. Contact: ${localOrder.buyerPhone ?? 'see listing chat'}`
              : 'Arrange a meet-up with the seller, then confirm once you have the item.'}
          </p>
        </div>
      )}

      {/* Buyer: confirm self-pickup collection */}
      {!localOrder.isSeller && isPickup && localOrder.status === 'ESCROWED' && !localOrder.deliveryConfirmed && (
        <button onClick={handleConfirm} disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--green), var(--teal))' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Confirm Item Collected
        </button>
      )}

      {/* Seller actions */}
      {!isPickup && localOrder.isSeller && localOrder.shippingStatus === 'PENDING' && localOrder.status === 'ESCROWED' && (
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
                Mark as Shipped
              </button>
              <button onClick={() => setShowTracking(false)} className="px-3 py-2 rounded-lg text-xs" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowTracking(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium"
            style={{ border: '1px solid var(--blue)', color: 'var(--blue)', backgroundColor: 'rgba(79,140,255,0.08)' }}>
            <Truck className="w-3.5 h-3.5" /> Item Has Been Shipped
          </button>
        )
      )}

      {/* Buyer actions */}
      {!localOrder.isSeller && localOrder.shippingStatus === 'SHIPPED' && !localOrder.deliveryConfirmed && (
        <button onClick={handleConfirm} disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-white"
          style={{ background: 'linear-gradient(135deg, var(--green), var(--teal))' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Confirm Item Received
        </button>
      )}

      {/* Review */}
      {!localOrder.isSeller && localOrder.deliveryConfirmed && !reviewed && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Rate this seller:</p>
          <div className="flex gap-1 mb-2">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)} className="text-xl transition-transform hover:scale-110">
                <span style={{ color: s <= rating ? 'var(--yellow)' : 'var(--text-muted)' }}>★</span>
              </button>
            ))}
          </div>
          <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Review (optional)"
            className="w-full px-3 py-2 rounded-lg text-xs outline-none mb-2"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <button onClick={handleReview} disabled={!rating || loading}
            className="w-full py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--yellow), var(--orange))' }}>
            <Star className="w-3.5 h-3.5 inline mr-1" /> Submit Review
          </button>
        </div>
      )}

      {reviewed && (
        <div className="mt-2 text-xs text-center" style={{ color: 'var(--green)' }}>
          ✓ Review submitted. Thank you!
        </div>
      )}
    </div>
  )
}
