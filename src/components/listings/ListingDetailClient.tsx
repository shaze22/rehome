'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Gavel, Leaf, Shield, CheckCircle, MapPin, Star,
  AlertCircle, ChevronLeft, ChevronRight, Bot, Share2, ArrowLeftRight,
  Package, Home, Truck, Trash2
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
  watchlistButton?: React.ReactNode
  relatedListingsSlot?: React.ReactNode
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Furniture', ELECTRONICS: 'Electronics', FASHION: 'Fashion',
  BOOKS: 'Books', SPORTS: 'Sports', KITCHEN: 'Kitchen', OTHERS: 'Others',
}

function CreditCheckoutButton({ listingId, bidAmount }: { listingId: string; bidAmount: number }) {
  const [credit, setCredit] = useState(0)
  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(d => setCredit(d.creditBalance ?? 0)).catch(() => {})
  }, [])
  const discount = Math.min(credit, Math.max(0, bidAmount - 1))
  const chargeAmount = bidAmount - discount
  return (
    <div>
      {discount > 0 && (
        <div className="mb-2 text-xs text-center rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(20,184,166,0.08)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.2)' }}>
          💳 RM{discount.toFixed(0)} credit will be deducted — pay only RM{chargeAmount.toFixed(0)}
        </div>
      )}
      <Link href={`/api/payment/checkout?listingId=${listingId}`} className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
        Make Payment {discount > 0 ? `— RM${chargeAmount.toFixed(0)}` : ''}
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
      setTimeLeft('Waiting for first bidder...')
      return
    }
    setIsWaiting(false)
    function update() {
      const diff = new Date(endsAt as string).getTime() - (Date.now() + offset)
      if (diff <= 0) { setIsEnded(true); setTimeLeft('Ended'); return }
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

export function ListingDetailClient({ listing: initialListing, currentUserId, currentUserEmail, watchlistButton, relatedListingsSlot }: Props) {
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
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery' | ''>('')
  const [buyerState, setBuyerState] = useState('')
  const serverTimeOffset = useServerTimeOffset()
  const { timeLeft, urgencyLevel, isUrgent, isEnded, isWaiting } = useCountdown(listing.endsAt, serverTimeOffset)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerSubmitted, setOfferSubmitted] = useState(false)
  const searchParams = useSearchParams()
  const justPaid = searchParams.get('payment') === 'success'

  const [flashTx, setFlashTx] = useState<FlashTransaction | null>(null)
  const [txLoading, setTxLoading] = useState(false)
  const [pickupSaving, setPickupSaving] = useState(false)
  const [pickupConfirming, setPickupConfirming] = useState(false)
  const [shipConfirming, setShipConfirming] = useState(false)
  const [receiveConfirming, setReceiveConfirming] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [cancelling, setCancelling] = useState(false)

  interface QuoteResult { cheapest: number; couriers: { courierName: string; serviceName: string; price: number }[]; source: string }
  const [deliveryQuote, setDeliveryQuote] = useState<QuoteResult | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const isSwap = listing.mode === 'SWAP'
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
    if (!deliveryReady) { setBidError('Please choose a delivery method first.'); return }
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
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <Link href="/listings" className="hover:text-teal transition-colors">Listings</Link>
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
                <button key={i} onClick={() => setPhotoIdx(i)} className={`w-16 h-16 rounded-lg overflow-hidden relative flex-shrink-0 ${i === photoIdx ? 'ring-2' : 'opacity-60'}`} style={{ ringColor: 'var(--teal)' } as React.CSSProperties}>
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
                  const url = window.location.href
                  const interestCount = isSwap ? (listing._count.offers ?? 0) : listing._count.bids
                  const text = isSwap
                    ? `I found *${listing.title}* on KASSIM — swap it, no cash needed!\n\nEst. value: ~RM ${listing.swapValueEstimate ?? 0}${interestCount > 0 ? `\n${interestCount} offers already in!` : ''}\n\nGot something to swap? ${url}`
                    : `I found *${listing.title}* on KASSIM — starting at RM${listing.startingBid}!\n\n${interestCount > 0 ? `${interestCount} people already bid. ` : 'No bids yet! '}Bid now, timer is only 30 mins.\n\n${url}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#25D366', color: 'white' }}
                title="Share ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
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
                RM {listing.aiSuggestedMin} — RM {listing.aiSuggestedMax}
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
                {listing.currentBid > 0 ? 'Highest Bid' : 'Starting Bid'}
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
                {/* Step 1: Delivery method */}
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Step 1: Choose delivery method
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => { setDeliveryMethod('pickup'); setBuyerState('') }}
                      className="px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all"
                      style={{
                        backgroundColor: deliveryMethod === 'pickup' ? 'rgba(20,184,166,0.15)' : 'var(--bg-elevated)',
                        border: deliveryMethod === 'pickup' ? '1px solid rgba(20,184,166,0.5)' : '1px solid var(--border)',
                        color: deliveryMethod === 'pickup' ? 'var(--teal)' : 'var(--text-secondary)',
                      }}
                    >
                      Self Pick-Up (Free)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className="px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all"
                      style={{
                        backgroundColor: deliveryMethod === 'delivery' ? 'rgba(79,140,255,0.15)' : 'var(--bg-elevated)',
                        border: deliveryMethod === 'delivery' ? '1px solid rgba(79,140,255,0.5)' : '1px solid var(--border)',
                        color: deliveryMethod === 'delivery' ? 'var(--blue)' : 'var(--text-secondary)',
                      }}
                    >
                      Courier Delivery
                    </button>
                  </div>
                  {deliveryMethod === 'delivery' && (
                    <select
                      value={buyerState}
                      onChange={e => setBuyerState(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Select your state</option>
                      {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                {/* Step 2: Bid amount */}
                {deliveryReady && (
                  <>
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Step 2: Enter bid amount (RM, whole number)
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

                    {/* Cost breakdown */}
                    {deliveryMethod === 'delivery' && buyerState && (
                      <div className="mb-3 rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        {quoteLoading ? (
                          <p className="text-center py-1" style={{ color: 'var(--text-muted)' }}>Getting delivery rate...</p>
                        ) : deliveryQuote ? (
                          <>
                            <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                              Estimated cost if you win {deliveryQuote.source === 'easyparcel' ? '(EasyParcel)' : '(estimated rate)'}:
                            </p>
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--text-muted)' }}>Your bid</span>
                              <span className="font-mono">RM {bidAmount.toFixed(0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--text-muted)' }}>
                                Delivery {deliveryQuote.source === 'easyparcel' ? `(${deliveryQuote.couriers[0]?.courierName})` : ''}
                              </span>
                              <span className="font-mono">RM {deliveryQuote.cheapest.toFixed(2)}</span>
                            </div>
                            {deliveryQuote.source === 'easyparcel' && deliveryQuote.couriers.length > 1 && (
                              <details className="mt-1">
                                <summary className="cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                                  View all couriers ({deliveryQuote.couriers.length})
                                </summary>
                                <div className="mt-1.5 space-y-1 pl-2">
                                  {deliveryQuote.couriers.slice(0, 5).map((c, i) => (
                                    <div key={i} className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                                      <span>{c.courierName} · {c.serviceName}</span>
                                      <span className="font-mono">RM {c.price.toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            )}
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--text-muted)' }}>Platform fee (15%)</span>
                              <span className="font-mono">RM {platformFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--teal)' }}>
                              <span>Total payment</span>
                              <span className="font-mono">RM {(bidAmount + deliveryQuote.cheapest + platformFee).toFixed(2)}</span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    )}
                    {deliveryMethod === 'pickup' && (
                      <div className="mb-3 rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Estimated cost if you win:</p>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Your bid</span>
                          <span className="font-mono">RM {bidAmount.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Delivery</span>
                          <span className="font-mono text-green-400">Free (self pick-up)</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Platform fee (15%)</span>
                          <span className="font-mono">RM {platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--teal)' }}>
                          <span>Total payment</span>
                          <span className="font-mono">RM {(bidAmount + platformFee).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
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

                {!currentUserId ? (
                  <Link href="/auth/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
                    Log In to Bid
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={bidLoading || isLastBidder || !deliveryReady}
                    className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    {bidLoading ? 'Placing bid...' : bidSuccess ? '✓ Bid Placed!' : quoteLoading ? 'Getting rate...' : !deliveryReady ? 'Choose delivery first' : isFirstBid ? `First Bid — You Might Win for Free!` : `Bid RM ${bidAmount}`}
                  </button>
                )}
              </form>
            )}

            {!isSwap && isEnded && (
              <div className="text-center py-4">
                <p className="text-lg font-bold" style={{ color: 'var(--red)' }}>Auction Has Ended</p>
                {listing.currentBidder === currentUserId && !flashTx && (
                  <div className="mt-3">
                    <p className="text-sm mb-3" style={{ color: 'var(--green)' }}>Congratulations! You are the winner!</p>
                    <CreditCheckoutButton listingId={listing.id} bidAmount={listing.currentBid} />
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
              Safe Escrow — Payment released only after item is received
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
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Replies &lt; 24h
                  </span>
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
                  ⚡ Flash — 30 Min Only
                </span>
              )}
              {listing.mode === 'SWAP' && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
                  🔄 Swap — 72hr Window
                </span>
              )}
            </div>

            {/* WhatsApp Seller — logged in + not own listing */}
            {currentUserId && !isOwnListing && (
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hi, I'm interested in ${listing.title} on KASSIM: https://kassim.app/listings/${listing.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#25D366', color: 'white' }}
              >
                💬 WhatsApp {listing.seller.name ?? 'Seller'}
              </a>
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

          {justPaid && !flashTx.pickupMethod && isBuyer && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.1)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--green)' }}>
              Payment successful! Please choose your collection method below.
            </div>
          )}

          {/* Pickup method selection — buyer only, before chosen */}
          {!flashTx.pickupMethod && isBuyer && (
            <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-3">Choose Collection Method</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSetPickup('PICKUP')}
                  disabled={pickupSaving}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-teal-400"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Home className="w-6 h-6" style={{ color: 'var(--teal)' }} />
                  <span className="text-sm font-semibold">Self Pick-Up</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Free · Arrange directly with seller</span>
                </button>
                <button
                  onClick={() => handleSetPickup('DELIVERY')}
                  disabled={pickupSaving}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-blue-400"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Truck className="w-6 h-6" style={{ color: 'var(--blue)' }} />
                  <span className="text-sm font-semibold">Postal Delivery</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Seller will enter tracking number</span>
                </button>
              </div>
            </div>
          )}

          {/* Pickup mode — PICKUP */}
          {flashTx.pickupMethod === 'PICKUP' && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <Home className="w-4 h-4" style={{ color: 'var(--teal)' }} />
                <span className="text-sm font-semibold">Self Pick-Up</span>
                {flashTx.sellerPickupConfirmed ? (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)' }}>Completed</span>
                ) : (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--yellow)' }}>Waiting</span>
                )}
              </div>
              {flashTx.sellerPickupConfirmed ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                  <p className="font-semibold" style={{ color: 'var(--green)' }}>Transaction Completed</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Seller has confirmed pick-up. Payment released.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Contact the seller via chat to arrange time and place for pick-up.
                    {listing.seller.state && ` Seller location: ${listing.seller.state}.`}
                  </p>
                  {isBuyer && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', color: 'var(--yellow)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      Payment will be released to the seller once they confirm you have collected the item.
                    </p>
                  )}
                  {isSeller && !flashTx.sellerPickupConfirmed && (
                    <button
                      onClick={handlePickupConfirm}
                      disabled={pickupConfirming}
                      className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50"
                    >
                      {pickupConfirming ? 'Confirming...' : 'Confirm Buyer Has Picked Up'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Delivery mode — DELIVERY */}
          {flashTx.pickupMethod === 'DELIVERY' && (
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

          {/* No pickup method yet — seller sees waiting message */}
          {!flashTx.pickupMethod && isSeller && (
            <div className="rounded-xl p-5 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Waiting for buyer to choose collection method...</p>
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
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
