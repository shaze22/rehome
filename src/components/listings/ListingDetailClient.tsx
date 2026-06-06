'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Gavel, Leaf, Shield, CheckCircle, MapPin, Star,
  AlertCircle, ChevronLeft, ChevronRight, Bot, Share2, ArrowLeftRight,
  Package, Truck, Trash2, Link2, Copy
} from 'lucide-react'
import { calculatePlatformFee, MALAYSIAN_STATES } from '@/lib/delivery'
import { trackRecentlyViewed } from '@/components/home/RecentlyViewed'
import { OfferModal } from './OfferModal'
import { OwnerOffersPanel } from './OwnerOffersPanel'
import { SwapEscrowPanel } from './SwapEscrowPanel'

interface FlashTransaction {
  id: string
  listingId: string
  sellerId: string
  buyerId: string
  amount: number
  platformFee: number
  sellerPayout: number
  status: string
  shippingStatus: string
  trackingNumber: string | null
  deliveryConfirmed: boolean
  pickupMethod: string | null
  sellerPickupConfirmed: boolean
}

interface Bid {
  id: string
  amount: number
  createdAt: string
  bidder: { name: string | null; rehomeScore: number }
}

interface Seller {
  id: string
  name: string | null
  phone?: string | null
  rehomeScore: number
  icVerified: boolean
  state: string | null
  icStatus: string
  createdAt: string
}

interface Listing {
  id: string
  title: string
  description: string
  category: string
  condition: number
  originalPrice: number
  startingBid: number
  currentBid: number
  currentBidder: string | null
  photos: string[]
  state: string
  status: string
  mode: string
  endsAt: string | null
  co2Saved: number
  viewCount?: number
  hasScratch: boolean
  isFunctional: boolean
  hasCompleteParts: boolean
  hasOriginalBox: boolean
  hasWarranty: boolean
  aiSuggestedMin: number | null
  aiSuggestedMax: number | null
  aiReasoning: string | null
  swapWantedItem: string | null
  swapWantedCategory: string | null
  swapOpenOffers: boolean
  swapAcceptCash: boolean
  swapMinCashTopup: number | null
  swapValueEstimate: number | null
  seller: Seller & { _count?: { listings: number } }
  bids: Bid[]
  _count: { bids: number; offers?: number }
}

interface Props {
  listing: Listing
  currentUserId: string | null
  currentUserEmail: string | null
  currentUserState?: string | null
  currentUserPhone?: string | null
  currentUserPostcode?: string | null
  currentUserSavedAddress?: string | null
  watchlistButton?: React.ReactNode
  relatedListingsSlot?: React.ReactNode
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Furniture', ELECTRONICS: 'Electronics', FASHION: 'Fashion',
  BOOKS: 'Books', SPORTS: 'Sports', KITCHEN: 'Kitchen', OTHERS: 'Others',
}

interface DCourierRate { id: string; courierName: string; serviceName: string; basePrice: number; chargedPrice: number; markup: number; eta?: string }

function DeliveryCheckout({ listingId, bidAmount, sellerState, initialPhone, initialPostcode, initialAddress }: { listingId: string; bidAmount: number; sellerState: string; initialPhone?: string; initialPostcode?: string; initialAddress?: string }) {
  const [credit, setCredit] = useState(0)
  const [postcode, setPostcode] = useState(initialPostcode ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [address, setAddress] = useState(initialAddress ?? '')
  const [quotes, setQuotes] = useState<DCourierRate[] | null>(null)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [selected, setSelected] = useState<DCourierRate | null>(null)

  const step = !postcode || postcode.length < 5 ? 1
    : !selected ? 2
    : !phone || phone.length < 10 || !address || address.length < 10 ? 3
    : 4

  const STEPS = ['Postcode', 'Courier', 'Your Details', 'Pay']

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(d => setCredit(d.creditBalance ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    if (postcode.length !== 5 || !/^\d{5}$/.test(postcode)) {
      setQuotes(null); setSelected(null); return
    }
    setQuotesLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/listings/${listingId}/delivery-quote?buyerState=${sellerState}&buyerPostcode=${postcode}`)
        .then(r => r.json())
        .then((d: { couriers?: DCourierRate[] }) => {
          const list = d.couriers ?? []
          setQuotes(list)
          setSelected(list[0] ?? null)
        })
        .catch(() => setQuotes(null))
        .finally(() => setQuotesLoading(false))
    }, 500)
    return () => clearTimeout(t)
  }, [postcode, listingId, sellerState])

  const discount = Math.min(credit, Math.max(0, bidAmount - 1))
  const deliveryFee = selected?.chargedPrice ?? 0
  // Buyer pays: bid amount + delivery only. Platform fee (15%) is deducted from seller's payout, not charged to buyer.
  const total = bidAmount - discount + deliveryFee

  const ready = selected !== null && phone.length >= 10 && address.length >= 10

  const checkoutParams = new URLSearchParams({ listingId })
  if (selected) {
    checkoutParams.set('deliveryFee', selected.chargedPrice.toString())
    checkoutParams.set('deliveryBase', selected.basePrice.toString())
    checkoutParams.set('deliveryMarkup', selected.markup.toString())
    checkoutParams.set('courierName', selected.courierName)
    checkoutParams.set('courierService', selected.serviceName)
    checkoutParams.set('courierServiceId', selected.id)
    checkoutParams.set('buyerPostcode', postcode)
    checkoutParams.set('buyerPhone', phone)
    checkoutParams.set('buyerAddress', address.slice(0, 490))
  }

  return (
    <div className="space-y-3">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{
                backgroundColor: i + 1 <= step ? 'var(--teal)' : 'var(--bg-elevated)',
                color: i + 1 <= step ? 'white' : 'var(--text-muted)',
                border: i + 1 === step ? '2px solid var(--teal)' : '2px solid transparent',
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className="text-xs mt-0.5 text-center leading-none" style={{ color: i + 1 === step ? 'var(--teal)' : 'var(--text-muted)', fontSize: '9px' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 flex-1 mb-3 rounded" style={{ backgroundColor: i + 1 < step ? 'var(--teal)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Delivery header — only shown when postcode not yet entered */}
      {step === 1 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', color: 'var(--text-secondary)' }}>
          📦 <span>All orders via KASSIM platform. Enter your postcode to see courier rates.</span>
        </div>
      )}

      <div className="space-y-2">
          {/* Postcode */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Your postcode</label>
            <input
              type="text" inputMode="numeric" maxLength={5} value={postcode}
              onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 50480"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Courier picker */}
          {quotesLoading && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Getting courier rates...</p>
          )}
          {quotes && quotes.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Select courier</label>
              <div className="space-y-1.5">
                {quotes.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelected(c)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: selected?.id === c.id ? 'rgba(79,140,255,0.12)' : 'var(--bg-elevated)',
                      border: selected?.id === c.id ? '1px solid rgba(79,140,255,0.5)' : '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}>
                    <span>
                      <span className="font-medium">{c.courierName}</span>
                      <span style={{ color: 'var(--text-muted)' }}> · {c.serviceName}</span>
                      {c.eta && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>({c.eta})</span>}
                    </span>
                    <span className="font-mono font-bold" style={{ color: 'var(--teal)' }}>RM {c.chargedPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {quotes && quotes.length === 0 && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              No rates found. Try a different postcode.
            </p>
          )}

          {/* Contact & address */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0123456789"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Delivery address</label>
            <textarea
              value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Full address including unit, street, city"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

      {/* Payment summary */}
      {selected && (
        <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Winning bid</span>
            <span className="font-mono">RM {bidAmount.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--teal)' }}>
              <span>💳 Credit discount</span>
              <span className="font-mono">− RM {discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Delivery ({selected.courierName})</span>
            <span className="font-mono">RM {deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--teal)' }}>
            <span>Total you pay</span>
            <span className="font-mono">RM {total.toFixed(2)}</span>
          </div>
          <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>15% platform fee is deducted from the seller's payout, not charged to you.</p>
        </div>
      )}

      <Link
        href={ready ? `/api/payment/checkout?${checkoutParams.toString()}` : '#'}
        className={`block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal ${!ready ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {!ready ? 'Fill in delivery details' : `Proceed to Payment: RM ${total.toFixed(2)}`}
      </Link>
    </div>
  )
}

function useServerTimeOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    fetch('/api/time')
      .then(r => r.json())
      .then(({ serverTime }: { serverTime: number }) => setOffset(serverTime - Date.now()))
      .catch(() => {})
  }, [])
  return offset
}

type UrgencyLevel = 0 | 1 | 2 | 3

function useCountdown(endsAt: string | null, offset = 0) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(0)
  const [isEnded, setIsEnded] = useState(false)
  const [isWaiting, setIsWaiting] = useState(!endsAt)

  useEffect(() => {
    if (!endsAt) {
      setIsWaiting(true)
      setIsEnded(false)
      setTimeLeft('Waiting for first bidder...')
      return
    }
    setIsWaiting(false)
    function update() {
      const diff = new Date(endsAt as string).getTime() - (Date.now() + offset)
      if (diff <= 0) { setIsEnded(true); setTimeLeft('Ended'); return }
      setIsEnded(false) // reset if endsAt changed to future (e.g. after first bid realtime update)
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (diff < 60000) setUrgencyLevel(3)
      else if (diff < 300000) setUrgencyLevel(2)
      else if (diff < 600000) setUrgencyLevel(1)
      else setUrgencyLevel(0)
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`)
      else if (m > 0) setTimeLeft(`${m}m ${s}s`)
      else setTimeLeft(`${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt, offset])

  return { timeLeft, urgencyLevel, isUrgent: urgencyLevel > 0, isEnded, isWaiting }
}

export function ListingDetailClient({ listing: initialListing, currentUserId: initialUserId, currentUserEmail, currentUserState, currentUserPhone, currentUserPostcode, currentUserSavedAddress, watchlistButton, relatedListingsSlot }: Props) {
  const [listing, setListing] = useState(initialListing)
  const [bids, setBids] = useState(initialListing.bids)
  const initialBidAmount = initialListing._count.bids === 0
    ? initialListing.startingBid
    : initialListing.currentBid + 1
  const [bidAmount, setBidAmount] = useState(initialBidAmount)
  const [bidError, setBidError] = useState('')
  const [bidLoading, setBidLoading] = useState(false)
  const [bidSuccess, setBidSuccess] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  // Client-side auth fallback — handles SSR session miss
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUserId)
  useEffect(() => {
    if (currentUserId) return
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id)
    }).catch(() => {})
  }, [currentUserId])

  const isSwap = initialListing.mode === 'SWAP'

  // Auto-fetch delivery estimate from user's saved state (silent, no user action needed)
  const [autoDeliveryEst, setAutoDeliveryEst] = useState<number | null>(null)
  useEffect(() => {
    if (!currentUserState || isSwap) return
    fetch(`/api/listings/${initialListing.id}/delivery-quote?buyerState=${encodeURIComponent(currentUserState)}`)
      .then(r => r.json())
      .then((d: { cheapest?: number }) => setAutoDeliveryEst(d.cheapest ?? null))
      .catch(() => {})
  }, [initialListing.id, currentUserState, isSwap])

  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery' | ''>('')
  const [buyerState, setBuyerState] = useState('')
  const serverTimeOffset = useServerTimeOffset()
  const { timeLeft, urgencyLevel, isUrgent, isEnded: countdownEnded, isWaiting } = useCountdown(listing.endsAt, serverTimeOffset)
  const isEnded = countdownEnded || listing.status === 'ENDED' || listing.status === 'SOLD'
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerSubmitted, setOfferSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)
  const searchParams = useSearchParams()
  const justPaid = searchParams.get('payment') === 'success'
  const paymentCancelled = searchParams.get('payment') === 'cancelled'
  const paymentAmountTooLow = searchParams.get('payment') === 'amount_too_low'

  const [flashTx, setFlashTx] = useState<FlashTransaction | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [pickupSaving, setPickupSaving] = useState(false)
  const [pickupConfirming, setPickupConfirming] = useState(false)
  const [shipConfirming, setShipConfirming] = useState(false)
  const [receiveConfirming, setReceiveConfirming] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [cancelling, setCancelling] = useState(false)

  interface CourierRate { id: string; courierName: string; serviceName: string; basePrice: number; chargedPrice: number; markup: number; eta?: string }
  interface QuoteResult { cheapest: number; couriers: CourierRate[]; source: string }
  const [deliveryQuote, setDeliveryQuote] = useState<QuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const isSeller = currentUserId === listing.seller.id
  const isBuyer = !!(flashTx && currentUserId === flashTx.buyerId)

  useEffect(() => {
    trackRecentlyViewed({
      id: listing.id,
      title: listing.title,
      photo: listing.photos[0] ?? null,
      mode: listing.mode as 'FLASH' | 'SWAP',
      currentBid: listing.currentBid,
    })
  }, [listing.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger expiry when timer hits zero (client-side fallback for cron)
  useEffect(() => {
    if (isEnded && listing.status === 'ACTIVE') {
      fetch(`/api/listings/${listing.id}/expire`, { method: 'POST' }).catch(() => {})
    }
  }, [isEnded, listing.id, listing.status])

  // Fetch EasyParcel delivery quote when buyer selects a state
  useEffect(() => {
    if (deliveryMethod !== 'delivery' || !buyerState) { setDeliveryQuote(null); return }
    setQuoteLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/listings/${listing.id}/delivery-quote?buyerState=${encodeURIComponent(buyerState)}`)
        .then(r => r.json())
        .then(data => setDeliveryQuote(data))
        .catch(() => setDeliveryQuote(null))
        .finally(() => setQuoteLoading(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [deliveryMethod, buyerState, listing.id])

  // Fetch Flash transaction when listing ENDED/SOLD and user is involved
  useEffect(() => {
    if (isSwap || !currentUserId) return
    if (listing.status !== 'ENDED' && listing.status !== 'SOLD') return
    setTxLoading(true)
    fetch(`/api/transactions/${listing.id}`)
      .then(r => r.json())
      .then(data => { if (data.transaction) setFlashTx(data.transaction) })
      .catch(() => {})
      .finally(() => setTxLoading(false))
  }, [listing.id, listing.status, isSwap, currentUserId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`listing:${listing.id}`)
      .on('broadcast', { event: 'new_bid' }, ({ payload }) => {
        setBids(prev => [payload.bid, ...prev])
        setListing(prev => ({
          ...prev,
          currentBid: payload.currentBid,
          currentBidder: payload.currentBidder,
          endsAt: payload.endsAt,
          _count: { bids: payload.bidCount },
        }))
        setBidAmount(payload.currentBid + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [listing.id])

  // Postgres changes fallback — catches Listing updates if broadcast misses (Flash only)
  useEffect(() => {
    if (isSwap) return
    const supabase = createClient()
    const channel = supabase
      .channel(`listing-db:${listing.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Listing',
        filter: `id=eq.${listing.id}`,
      }, ({ new: updated }) => {
        const u = updated as { currentBid: number; currentBidder: string | null; endsAt: string | null }
        setListing(prev => ({
          ...prev,
          currentBid: u.currentBid ?? prev.currentBid,
          currentBidder: u.currentBidder ?? prev.currentBidder,
          endsAt: u.endsAt ?? prev.endsAt,
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listing.id, isSwap])

  // Real-time swap offer notifications (seller sees new offers instantly)
  useEffect(() => {
    if (!isSwap || !isSeller) return
    const supabase = createClient()
    const channel = supabase
      .channel(`offers:${listing.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'offers',
        filter: `listingId=eq.${listing.id}`,
      }, () => {
        setListing(prev => ({
          ...prev,
          _count: { bids: prev._count.bids + 1 },
        }))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [listing.id, isSwap, isSeller])

  async function handleSetPickup(method: 'DELIVERY' | 'PICKUP') {
    setPickupSaving(true)
    try {
      const res = await fetch(`/api/transactions/${listing.id}/set-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      if (res.ok) {
        setFlashTx(prev => prev ? { ...prev, pickupMethod: method } : prev)
      }
    } finally {
      setPickupSaving(false)
    }
  }

  async function handlePickupConfirm() {
    setPickupConfirming(true)
    try {
      const res = await fetch(`/api/transactions/${listing.id}/pickup-confirm`, { method: 'POST' })
      if (res.ok) {
        setFlashTx(prev => prev ? { ...prev, sellerPickupConfirmed: true, status: 'RELEASED' } : prev)
      }
    } finally {
      setPickupConfirming(false)
    }
  }

  async function handleShipItem() {
    setShipConfirming(true)
    try {
      const res = await fetch(`/api/transactions/${listing.id}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber: trackingInput || undefined }),
      })
      if (res.ok) {
        setFlashTx(prev => prev ? { ...prev, shippingStatus: 'SHIPPED', trackingNumber: trackingInput || null } : prev)
      }
    } finally {
      setShipConfirming(false)
    }
  }

  async function handleConfirmReceive() {
    setReceiveConfirming(true)
    try {
      const res = await fetch(`/api/transactions/${listing.id}/confirm`, { method: 'POST' })
      if (res.ok) {
        setFlashTx(prev => prev ? { ...prev, deliveryConfirmed: true, status: 'RELEASED' } : prev)
      }
    } finally {
      setReceiveConfirming(false)
    }
  }

  async function handleCancelListing() {
    if (!confirm('Withdraw this listing? This action cannot be undone.')) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
      if (res.ok) setListing(prev => ({ ...prev, status: 'CANCELLED' }))
    } finally {
      setCancelling(false)
    }
  }

  const isFirstBid = listing._count.bids === 0
  const deliveryPrice = deliveryMethod === 'pickup' ? 0 : (deliveryQuote?.cheapest ?? null)
  const platformFee = calculatePlatformFee(bidAmount)
  const totalIfWin = deliveryPrice !== null ? bidAmount + deliveryPrice + platformFee : null
  const deliveryReady = deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && buyerState !== '' && !quoteLoading && deliveryQuote !== null)

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setBidError('')
    if (!currentUserId) { setBidError('Please log in to bid.'); return }
    if (!Number.isInteger(bidAmount) || bidAmount < 0) { setBidError('Bid must be a whole number (Ringgit only).'); return }
    if (isFirstBid && bidAmount < listing.startingBid) {
      setBidError(`Minimum bid is RM ${listing.startingBid}.`); return
    }
    if (!isFirstBid && bidAmount <= listing.currentBid) {
      setBidError(`Bid must be higher than RM ${listing.currentBid}.`); return
    }

    setBidLoading(true)
    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, amount: bidAmount }),
      })
      const data = await res.json()
      if (!res.ok) { setBidError(data.error ?? 'Error while placing bid.'); return }
      setBidSuccess(true)
      setTimeout(() => setBidSuccess(false), 2000)
    } catch {
      setBidError('Network error. Please try again.')
    } finally {
      setBidLoading(false)
    }
  }

  const currentBidDisplay = listing.currentBid > 0 ? listing.currentBid : listing.startingBid
  const isOwnListing = currentUserId === listing.seller.id
  const lastBidder = bids[0]?.bidder
  const isLastBidder = !!(bids[0] && currentUserId && listing.currentBidder === currentUserId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb — uses history.back() to preserve filter state */}
      <nav className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <button onClick={() => window.history.back()} className="hover:text-teal transition-colors">Listings</button>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABELS[listing.category]}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Images */}
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {listing.photos[photoIdx] ? (
              <Image
                src={listing.photos[photoIdx]}
                alt={listing.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gavel className="w-16 h-16" style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            {listing.photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + listing.photos.length) % listing.photos.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(10,10,15,0.7)' }}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % listing.photos.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(10,10,15,0.7)' }}>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          {listing.photos.length > 1 && (
            <div className="flex gap-2">
              {listing.photos.map((photo, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} className="w-16 h-16 rounded-lg overflow-hidden relative flex-shrink-0 transition-all" style={{ opacity: i === photoIdx ? 1 : 0.5, border: i === photoIdx ? '2px solid var(--teal)' : '2px solid transparent' }}>
                  <Image src={photo} alt={`Photo ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Condition Report */}
          <div className="mt-6 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'var(--teal)' }} />
              Condition Report (KASSIM Shield)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'No Scratches', value: !listing.hasScratch },
                { label: 'Functional', value: listing.isFunctional },
                { label: 'Complete', value: listing.hasCompleteParts },
                { label: 'Original Box', value: listing.hasOriginalBox },
                { label: 'Under Warranty', value: listing.hasWarranty },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${item.value ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <span style={{ color: item.value ? 'var(--green)' : 'var(--red)', fontSize: '10px' }}>{item.value ? '✓' : '✗'}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                <div className="h-full rounded-full gradient-teal" style={{ width: `${listing.condition * 10}%` }} />
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: 'var(--teal)' }}>
                {listing.condition}/10
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Item condition score</p>
          </div>
        </div>

        {/* Right: Auction details */}
        <div className="space-y-4">
          {/* Title & badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.3)' }}>
                {CATEGORY_LABELS[listing.category]}
              </span>
              {listing.seller.icVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}>
                  <CheckCircle className="w-3 h-3" /> IC Verified
                </span>
              )}
              {listing.co2Saved > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}>
                  <Leaf className="w-3 h-3" /> Save {listing.co2Saved}kg CO₂
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold mb-1">{listing.title}</h1>
              <button
                onClick={() => {
                  const url = `https://kassim.app/listings/${listing.id}`
                  const interestCount = isSwap ? (listing._count.offers ?? 0) : listing._count.bids
                  const text = isSwap
                    ? `I found *${listing.title}* on KASSIM - swap it, no cash needed!\n\nEst. value: ~RM ${listing.swapValueEstimate ?? 0}${interestCount > 0 ? `\n${interestCount} offers already in!` : ''}\n\nGot something to swap? ${url}`
                    : `I found *${listing.title}* on KASSIM - starting at RM${listing.startingBid}!\n\n${interestCount > 0 ? `${interestCount} people already bid. ` : 'No bids yet! '}Bid now, timer is only 30 mins.\n\n${url}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#25D366', color: 'white' }}
                title="Share ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`https://kassim.app/listings/${listing.id}`)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: copied ? 'rgba(0,217,165,0.15)' : 'var(--bg-surface)', color: copied ? 'var(--green)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
                title="Copy link"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            {/* View count + interest indicator */}
            <div className="flex items-center gap-3 mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>👀 {listing.viewCount ?? 0} people viewed this</span>
              <span>·</span>
              <span>{isSwap ? `${listing._count.offers ?? 0} offers received` : `🔥 ${listing._count.bids} bids`}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{listing.description}</p>
          </div>

          {/* AI Pricing */}
          {listing.aiSuggestedMin && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" style={{ color: 'var(--purple)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--purple)' }}>AI Price Suggestion</span>
              </div>
              <p className="text-lg font-bold font-mono" style={{ color: 'var(--purple)' }}>
                RM {listing.aiSuggestedMin} to RM {listing.aiSuggestedMax}
              </p>
              {listing.aiReasoning && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{listing.aiReasoning}</p>
              )}
            </div>
          )}

          {/* Bid Box / Swap Box */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: isSwap ? '1px solid rgba(22,163,74,0.3)' : '1px solid var(--border)' }}>

            {/* Swap: sold notice */}
            {isSwap && listing.status === 'SOLD' && (
              <div className="text-center py-3 px-4 rounded-xl mb-4" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <CheckCircle className="w-6 h-6 mx-auto mb-1" style={{ color: '#16a34a' }} />
                <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Offer has been accepted</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Swap process is underway</p>
              </div>
            )}

            {/* Swap mode header */}
            {isSwap && (
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <ArrowLeftRight className="w-4 h-4" style={{ color: '#16a34a' }} />
                <span className="text-sm font-bold" style={{ color: '#16a34a' }}>Swap</span>
                {listing.swapValueEstimate && (
                  <span className="ml-auto text-sm font-mono font-bold" style={{ color: '#16a34a' }}>
                    ~RM {listing.swapValueEstimate.toFixed(0)}
                  </span>
                )}
              </div>
            )}

            {/* Swap: wanted item */}
            {isSwap && (listing.swapWantedItem || listing.swapWantedCategory || listing.swapOpenOffers) && (
              <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Owner is looking for:</p>
                <p style={{ color: '#16a34a' }}>
                  {listing.swapOpenOffers ? 'Open to all offers' :
                    [listing.swapWantedItem, listing.swapWantedCategory].filter(Boolean).join(' / ')}
                </p>
                {listing.swapAcceptCash && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Also accepts cash offers</p>
                )}
                {listing.swapMinCashTopup && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Min cash top-up: RM {listing.swapMinCashTopup}</p>
                )}
              </div>
            )}

            {/* Timer */}
            {(() => {
              const timerColor = isWaiting ? 'var(--text-muted)'
                : isSwap ? '#16a34a'
                : urgencyLevel >= 2 ? '#ef4444'
                : urgencyLevel >= 1 ? '#f97316'
                : 'var(--teal)'
              const urgencyLabel = !isSwap && !isWaiting
                ? urgencyLevel >= 3 ? '⏱ Final seconds!'
                  : urgencyLevel >= 2 ? '🔥 Almost over!'
                  : urgencyLevel >= 1 ? '⚡ Ending soon!'
                  : 'Time left'
                : null
              return (
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {urgencyLabel && (
                      <p className="text-xs mb-0.5 font-medium" style={{ color: timerColor }}>{urgencyLabel}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${urgencyLevel >= 3 ? 'timer-urgent' : ''}`} style={{ color: timerColor }} />
                      <span
                        className={`text-sm font-mono ${urgencyLevel >= 2 ? 'font-bold' : 'font-medium'} ${urgencyLevel >= 3 ? 'timer-urgent' : ''}`}
                        style={{ color: timerColor }}
                      >
                        {timeLeft}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {isSwap ? `${listing._count.bids} offers received` : `${listing._count.bids} bids`}
                  </span>
                </div>
              )
            })()}

            {isWaiting && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--text-secondary)' }}>
                Be the first bidder! The 30-minute timer starts as soon as the first bid comes in.
              </div>
            )}

            {/* Current bid */}
            <div className="mb-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                {(listing.status === 'ENDED' || listing.status === 'SOLD') && listing.currentBidder
                  ? 'Winning Bid'
                  : listing.currentBid > 0 ? 'Highest Bid' : 'Starting Bid'}
              </p>
              <p className="text-4xl font-bold font-mono" style={{ color: 'var(--teal)' }}>
                RM {currentBidDisplay.toFixed(0)}
              </p>
              {listing.originalPrice > 0 && currentBidDisplay > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Original price: RM {listing.originalPrice.toFixed(0)} · Save {Math.round((1 - currentBidDisplay / listing.originalPrice) * 100)}%
                </p>
              )}
            </div>

            {/* Last bidder */}
            {lastBidder && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Highest bidder: </span>
                <span className="font-medium">{lastBidder.name ?? 'Anonymous User'}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)' }}>
                  Score {lastBidder.rehomeScore}
                </span>
              </div>
            )}

            {/* Swap: Offer button (for non-owners, still active) */}
            {isSwap && listing.status === 'ACTIVE' && !isOwnListing && (
              <div className="space-y-3">
                {offerSubmitted ? (
                  <div className="text-center py-4 px-4 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#16a34a' }} />
                    <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Offer submitted!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Waiting for the owner's response. You will be notified.</p>
                    <button onClick={() => setOfferSubmitted(false)} className="mt-3 text-xs underline" style={{ color: 'var(--text-muted)' }}>
                      Make a new offer
                    </button>
                  </div>
                ) : !currentUserId ? (
                  <Link href="/auth/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: '#16a34a' }}>
                    Log In to Make an Offer
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Make an Offer
                  </button>
                )}
              </div>
            )}

            {/* Swap: Owner sees offers panel here (when active) */}
            {isSwap && isOwnListing && listing.status === 'ACTIVE' && (
              <div className="space-y-2">
                <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  This is your listing. Offers are shown below.
                </div>
                {listing._count.bids === 0 && (
                  <button
                    onClick={handleCancelListing}
                    disabled={cancelling}
                    className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: 'var(--red)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {cancelling ? 'Withdrawing...' : 'Withdraw Listing'}
                  </button>
                )}
              </div>
            )}

            {/* Flash Bid form */}
            {!isSwap && !isEnded && !isOwnListing && (
              <form onSubmit={handleBid}>
                {/* Bid amount */}
                {(
                  <>
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Your bid amount (RM, whole number)
                      </p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>RM</span>
                          <input
                            type="number"
                            min={isFirstBid ? listing.startingBid : listing.currentBid + 1}
                            step={1}
                            value={bidAmount}
                            onChange={e => setBidAmount(Number(e.target.value))}
                            className="w-full pl-10 pr-3 py-3 rounded-lg text-lg font-mono font-bold outline-none focus:ring-2"
                            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => setBidAmount(a => a + 1)} className="px-3 py-1 rounded-md text-xs" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>+1</button>
                          <button type="button" onClick={() => setBidAmount(a => a + 5)} className="px-3 py-1 rounded-md text-xs" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>+5</button>
                          <button type="button" onClick={() => setBidAmount(a => a + 10)} className="px-3 py-1 rounded-md text-xs" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>+10</button>
                        </div>
                      </div>
                    </div>

                    {/* Auto delivery estimate — silent, from user's saved state */}
                    <div className="mb-3 flex items-center justify-between text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                        <Truck className="w-3.5 h-3.5" />
                        <span>Est. delivery to your address</span>
                      </div>
                      <span className="font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {autoDeliveryEst !== null ? `~RM ${autoDeliveryEst.toFixed(2)}` : currentUserState ? '...' : 'Set in profile'}
                      </span>
                    </div>
                  </>
                )}

                {bidError && (
                  <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {bidError}
                  </div>
                )}

                {isLastBidder && (
                  <div className="flex items-center gap-2 text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--yellow)', border: '1px solid rgba(251,191,36,0.3)' }}>
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> You are currently the highest bidder!
                  </div>
                )}

                {bidSuccess && (
                  <div className="mb-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(20,184,166,0.3)' }}>
                    <div className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.12)', color: 'var(--teal)' }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Bid placed! You are now the highest bidder.
                    </div>
                    <button
                      onClick={() => {
                        const text = `I just bid on *${listing.title}* on KASSIM! Auction ends in 30 mins. Jump in!\n\nhttps://kassim.app/listings/${listing.id}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium"
                      style={{ backgroundColor: '#25D36622', color: '#25D366' }}
                    >
                      <Share2 className="w-3 h-3" /> Tell your friends before someone outbids you!
                    </button>
                  </div>
                )}
                {!currentUserId ? (
                  <Link href={`/auth/login?next=/listings/${listing.id}`} className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
                    Log In to Bid
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={bidLoading || isLastBidder}
                    className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    {bidLoading ? 'Placing bid...' : isFirstBid ? '⚡ Place First Bid - Could Win for Free!' : `Bid RM ${bidAmount}`}
                  </button>
                )}
              </form>
            )}

            {!isSwap && isEnded && (
              <div className="text-center py-4">
                <p className="text-lg font-bold" style={{ color: 'var(--red)' }}>Auction Has Ended</p>
                {listing.currentBidder === currentUserId && !flashTx && (
                  <div className="mt-3">
                    <p className="text-sm mb-3 font-semibold" style={{ color: 'var(--green)' }}>🎉 Congratulations! You won!</p>
                    {paymentCancelled && (
                      <div className="mb-3 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--yellow)' }}>
                        Payment was not completed. Complete checkout below to secure your item. You have 24 hours.
                      </div>
                    )}
                    {paymentAmountTooLow && (
                      <div className="mb-3 px-3 py-2.5 rounded-xl text-xs font-medium" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                        Payment amount is below the minimum RM 1.00. Please contact support via WhatsApp.
                      </div>
                    )}
                    <DeliveryCheckout
                      listingId={listing.id}
                      bidAmount={listing.currentBid}
                      sellerState={listing.seller.state ?? 'Kuala Lumpur'}
                      initialPhone={currentUserPhone ?? undefined}
                      initialPostcode={currentUserPostcode ?? undefined}
                      initialAddress={currentUserSavedAddress ?? undefined}
                    />
                  </div>
                )}
              </div>
            )}

            {!isSwap && isOwnListing && (
              <div className="space-y-2">
                <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  This is your own listing.
                </div>
                {listing.status === 'ACTIVE' && listing._count.bids === 0 && (
                  <button
                    onClick={handleCancelListing}
                    disabled={cancelling}
                    className="w-full py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: 'var(--red)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {cancelling ? 'Withdrawing...' : 'Withdraw Listing'}
                  </button>
                )}
              </div>
            )}

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 mt-3 px-3 py-2 rounded-lg text-xs font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.08)', border: '1px solid rgba(0,217,165,0.2)', color: 'var(--green)' }}>
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              Safe Escrow: Payment released only after item is received
            </div>
          </div>

          {/* Watchlist */}
          {watchlistButton && (
            <div className="flex justify-end">{watchlistButton}</div>
          )}


          {/* Seller info */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white font-bold">
                {listing.seller.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{listing.seller.name ?? 'Anonymous Seller'}</p>
                  {listing.seller.icVerified && <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" style={{ color: 'var(--yellow)' }} />
                    Score {listing.seller.rehomeScore}
                  </span>
                  {listing.seller.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.seller.state}
                    </span>
                  )}
                  <span suppressHydrationWarning>Member since {new Date(listing.seller.createdAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'short' })}</span>
                  {listing.seller._count && listing.seller._count.listings > 1 && (
                    <span style={{ color: 'var(--text-muted)' }}>{listing.seller._count.listings} active listings</span>
                  )}
                </div>
              </div>
              <Link href={`/profile/${listing.seller.id}`} className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Profile
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
                🔒 Escrow Protected
              </span>
              {listing.seller.icVerified && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
                  ✅ IC Verified Seller
                </span>
              )}
              {listing.mode === 'FLASH' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
                  {listing.endsAt === null ? '⚡ Timer starts on first bid' : '⚡ Flash: 30 Min Only'}
                </span>
              )}
              {listing.mode === 'SWAP' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
                  🔄 Swap: 72hr Window
                </span>
              )}
            </div>

            {/* WhatsApp Seller — only when seller has a phone number */}
            {currentUserId && !isOwnListing && listing.seller.phone && (
              <a
                href={`https://wa.me/60${listing.seller.phone.replace(/^0/, '')}?text=${encodeURIComponent(`Hi ${listing.seller.name ?? ''}, I'm interested in your listing on KASSIM: ${listing.title}\nhttps://kassim.app/listings/${listing.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#25D366', color: 'white' }}
              >
                💬 WhatsApp {listing.seller.name ?? 'Seller'}
              </a>
            )}
            {currentUserId && !isOwnListing && !listing.seller.phone && (
              <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
                Contact seller via chat below
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Swap Escrow Panel — shown to both seller & buyer once offer accepted (listing SOLD) */}
      {isSwap && currentUserId && listing.status === 'SOLD' && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Escrow Status</h2>
          <SwapEscrowPanel
            listingId={listing.id}
            currentUserId={currentUserId}
            listingTitle={listing.title}
          />
        </div>
      )}

      {/* Swap: Owner Offers Panel — only when still ACTIVE */}
      {isSwap && isOwnListing && listing.status === 'ACTIVE' && (
        <div className="mt-10">
          <OwnerOffersPanel listingId={listing.id} listingTitle={listing.title} swapValueEstimate={listing.swapValueEstimate} />
        </div>
      )}

      {/* Flash Transaction Panel */}
      {!isSwap && flashTx && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" style={{ color: 'var(--teal)' }} />
            Transaction Status
          </h2>

          {justPaid && isBuyer && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.1)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--green)' }}>
              Payment successful! Your courier has been booked. Waiting for seller to ship.
            </div>
          )}

          {/* Delivery mode — all orders use platform delivery */}
          {(flashTx.pickupMethod === 'DELIVERY' || !flashTx.pickupMethod) && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <Truck className="w-4 h-4" style={{ color: 'var(--blue)' }} />
                <span className="text-sm font-semibold">Postal Delivery</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
                  backgroundColor: flashTx.status === 'RELEASED' ? 'rgba(0,217,165,0.1)' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'rgba(79,140,255,0.1)' : 'rgba(251,191,36,0.1)',
                  color: flashTx.status === 'RELEASED' ? 'var(--green)' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'var(--blue)' : 'var(--yellow)',
                }}>
                  {flashTx.status === 'RELEASED' ? 'Completed' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'In Transit' : 'Awaiting Shipment'}
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${flashTx.shippingStatus !== 'PENDING' ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ color: 'white' }}>
                    {flashTx.shippingStatus !== 'PENDING' ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Seller Ships Item</p>
                    {flashTx.trackingNumber && (
                      <p className="text-xs mt-0.5 font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--teal)' }}>
                        No. Tracking: {flashTx.trackingNumber}
                      </p>
                    )}
                    {isSeller && flashTx.shippingStatus === 'PENDING' && (
                      <div className="mt-2 space-y-2">
                        <input
                          value={trackingInput}
                          onChange={e => setTrackingInput(e.target.value)}
                          placeholder="Tracking No. (optional)"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                        <button
                          onClick={handleShipItem}
                          disabled={shipConfirming}
                          className="w-full py-2.5 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 text-sm"
                        >
                          {shipConfirming ? 'Confirming...' : 'Confirm Shipped'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${flashTx.deliveryConfirmed ? 'bg-green-500' : 'bg-gray-600'}`} style={{ color: 'white' }}>
                    {flashTx.deliveryConfirmed ? '✓' : '2'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Buyer Confirms Receipt</p>
                    {isBuyer && flashTx.shippingStatus === 'SHIPPED' && !flashTx.deliveryConfirmed && (
                      <button
                        onClick={handleConfirmReceive}
                        disabled={receiveConfirming}
                        className="mt-2 w-full py-2.5 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 text-sm"
                      >
                        {receiveConfirming ? 'Confirming...' : 'Confirm Item Received'}
                      </button>
                    )}
                    {flashTx.deliveryConfirmed && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>Received · Payment released to seller</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Bid History (Flash only) */}
      {!isSwap && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Bid History</h2>
          {bids.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Gavel className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No bids yet. Be the first!</p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {bids.map((bid, i) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between px-4 py-3 ${i === 0 ? 'bid-new' : ''}`}
                  style={{
                    backgroundColor: i === 0 ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    borderBottom: i < bids.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-xs font-bold">
                      {bid.bidder.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bid.bidder.name ?? 'Anonymous User'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }} suppressHydrationWarning>
                        {new Date(bid.createdAt).toLocaleString('ms-MY')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono" style={{ color: i === 0 ? 'var(--teal)' : 'var(--text-secondary)' }}>
                      RM {bid.amount.toFixed(0)}
                    </p>
                    {i === 0 && <p className="text-xs" style={{ color: 'var(--green)' }}>Highest</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && currentUserId && (
        <OfferModal
          listingId={listing.id}
          listingTitle={listing.title}
          swapValueEstimate={listing.swapValueEstimate}
          swapAcceptCash={listing.swapAcceptCash}
          swapWantedItem={listing.swapWantedItem}
          swapWantedCategory={listing.swapWantedCategory}
          userId={currentUserId}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => { setShowOfferModal(false); setOfferSubmitted(true) }}
        />
      )}

      {/* Related listings from same seller */}
      {relatedListingsSlot}
    </div>
  )
}
