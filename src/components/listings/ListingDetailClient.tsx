'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Gavel, Leaf, Shield, CheckCircle, MapPin, Star,
  AlertCircle, ChevronLeft, ChevronRight, Bot, Share2, ArrowLeftRight,
  Package, Home, Truck
} from 'lucide-react'
import { calculateDeliveryQuote, calculateDeliveryMarkup, calculatePlatformFee, MALAYSIAN_STATES } from '@/lib/delivery'
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
  seller: Seller
  bids: Bid[]
  _count: { bids: number }
}

interface Props {
  listing: Listing
  currentUserId: string | null
  currentUserEmail: string | null
  watchlistButton?: React.ReactNode
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Perabot', ELECTRONICS: 'Elektronik', FASHION: 'Fesyen',
  BOOKS: 'Buku', SPORTS: 'Sukan', KITCHEN: 'Dapur', OTHERS: 'Lain-lain',
}

function useCountdown(endsAt: string | null) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isEnded, setIsEnded] = useState(false)
  const [isWaiting, setIsWaiting] = useState(!endsAt)

  useEffect(() => {
    if (!endsAt) {
      setIsWaiting(true)
      setTimeLeft('Menunggu bidder pertama...')
      return
    }
    setIsWaiting(false)
    function update() {
      const diff = new Date(endsAt as string).getTime() - Date.now()
      if (diff <= 0) { setIsEnded(true); setTimeLeft('Tamat'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setIsUrgent(diff < 3600000)
      if (d > 0) setTimeLeft(`${d} hari ${h} jam ${m} min`)
      else if (h > 0) setTimeLeft(`${h} jam ${m} min ${s} saat`)
      else if (m > 0) setTimeLeft(`${m} min ${s} saat`)
      else setTimeLeft(`${s} saat`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent, isEnded, isWaiting }
}

export function ListingDetailClient({ listing: initialListing, currentUserId, currentUserEmail, watchlistButton }: Props) {
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
  const { timeLeft, isUrgent, isEnded, isWaiting } = useCountdown(listing.endsAt)
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

  const isSwap = listing.mode === 'SWAP'
  const isSeller = currentUserId === listing.seller.id
  const isBuyer = !!(flashTx && currentUserId === flashTx.buyerId)

  // Trigger expiry when timer hits zero (client-side fallback for cron)
  useEffect(() => {
    if (isEnded && listing.status === 'ACTIVE') {
      fetch(`/api/listings/${listing.id}/expire`, { method: 'POST' }).catch(() => {})
    }
  }, [isEnded, listing.id, listing.status])

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

  const isFirstBid = listing._count.bids === 0
  const deliveryQuote = deliveryMethod === 'delivery' && buyerState
    ? calculateDeliveryQuote(listing.state, buyerState)
    : deliveryMethod === 'pickup' ? 0 : null
  const deliveryMarkup = deliveryMethod === 'delivery' && buyerState
    ? calculateDeliveryMarkup(listing.state, buyerState)
    : 0
  const platformFee = calculatePlatformFee(bidAmount)
  const totalIfWin = deliveryQuote !== null ? bidAmount + deliveryQuote + platformFee : null
  const deliveryReady = deliveryMethod === 'pickup' || (deliveryMethod === 'delivery' && buyerState !== '')

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setBidError('')
    if (!currentUserId) { setBidError('Sila log masuk untuk membida.'); return }
    if (!deliveryReady) { setBidError('Sila pilih kaedah penghantaran dahulu.'); return }
    if (!Number.isInteger(bidAmount) || bidAmount < 0) { setBidError('Tawaran mesti nombor bulat (Ringgit sahaja).'); return }
    if (isFirstBid && bidAmount < listing.startingBid) {
      setBidError(`Tawaran minimum ialah RM ${listing.startingBid}.`); return
    }
    if (!isFirstBid && bidAmount <= listing.currentBid) {
      setBidError(`Tawaran mesti lebih tinggi daripada RM ${listing.currentBid}.`); return
    }

    setBidLoading(true)
    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, amount: bidAmount }),
      })
      const data = await res.json()
      if (!res.ok) { setBidError(data.error ?? 'Ralat semasa membida.'); return }
      setBidSuccess(true)
      setTimeout(() => setBidSuccess(false), 2000)
    } catch {
      setBidError('Ralat rangkaian. Sila cuba lagi.')
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
        <Link href="/listings" className="hover:text-teal transition-colors">Lelongan</Link>
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
                  <Image src={photo} alt={`Foto ${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Condition Report */}
          <div className="mt-6 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" style={{ color: 'var(--teal)' }} />
              Laporan Keadaan (Ballout Shield)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Tiada Calar', value: !listing.hasScratch },
                { label: 'Berfungsi', value: listing.isFunctional },
                { label: 'Lengkap', value: listing.hasCompleteParts },
                { label: 'Kotak Asal', value: listing.hasOriginalBox },
                { label: 'Dalam Waranti', value: listing.hasWarranty },
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
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Skor keadaan barangan</p>
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
                  <CheckCircle className="w-3 h-3" /> IC Disahkan
                </span>
              )}
              {listing.co2Saved > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}>
                  <Leaf className="w-3 h-3" /> Jimat {listing.co2Saved}kg CO₂
                </span>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
              <button
                onClick={() => {
                  const url = window.location.href
                  const text = `🔥 *${listing.title}* — Tawaran semasa: *RM ${listing.currentBid || listing.startingBid}*\n\nLelongan di BALLOUT:\n${url}`
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: '#25D366', color: 'white' }}
                title="Share ke WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" /> WhatsApp
              </button>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{listing.description}</p>
          </div>

          {/* AI Pricing */}
          {listing.aiSuggestedMin && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-4 h-4" style={{ color: 'var(--purple)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--purple)' }}>Cadangan Harga AI</span>
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
                <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Tawaran telah diterima</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Proses pertukaran sedang berjalan</p>
              </div>
            )}

            {/* Swap mode header */}
            {isSwap && (
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <ArrowLeftRight className="w-4 h-4" style={{ color: '#16a34a' }} />
                <span className="text-sm font-bold" style={{ color: '#16a34a' }}>Tukar Barang</span>
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
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Pemilik mencari:</p>
                <p style={{ color: '#16a34a' }}>
                  {listing.swapOpenOffers ? 'Terbuka kepada semua tawaran' :
                    [listing.swapWantedItem, listing.swapWantedCategory].filter(Boolean).join(' / ')}
                </p>
                {listing.swapAcceptCash && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Juga menerima tawaran wang tunai</p>
                )}
                {listing.swapMinCashTopup && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Min tambahan wang: RM {listing.swapMinCashTopup}</p>
                )}
              </div>
            )}

            {/* Timer */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : isWaiting ? 'var(--text-muted)' : isSwap ? '#16a34a' : 'var(--teal)' }} />
                <span className={`text-sm font-mono font-bold ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : isWaiting ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  {timeLeft}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {isSwap ? `${listing._count.bids} tawaran masuk` : `${listing._count.bids} tawaran`}
              </span>
            </div>

            {isWaiting && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--text-secondary)' }}>
                Jadilah bidder pertama! Timer 30 minit akan bermula sebaik sahaja ada tawaran masuk.
              </div>
            )}

            {/* Current bid */}
            <div className="mb-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                {listing.currentBid > 0 ? 'Tawaran Tertinggi' : 'Tawaran Permulaan'}
              </p>
              <p className="text-4xl font-bold font-mono" style={{ color: 'var(--teal)' }}>
                RM {currentBidDisplay.toFixed(0)}
              </p>
              {listing.originalPrice > 0 && currentBidDisplay > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Harga asal: RM {listing.originalPrice.toFixed(0)} · Jimat {Math.round((1 - currentBidDisplay / listing.originalPrice) * 100)}%
                </p>
              )}
            </div>

            {/* Last bidder */}
            {lastBidder && (
              <div className="mb-4 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Penawar tertinggi: </span>
                <span className="font-medium">{lastBidder.name ?? 'Pengguna Tanpa Nama'}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded font-mono text-xs" style={{ backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)' }}>
                  Skor {lastBidder.rehomeScore}
                </span>
              </div>
            )}

            {/* Swap: Offer button (for non-owners, still active) */}
            {isSwap && listing.status === 'ACTIVE' && !isOwnListing && (
              <div className="space-y-3">
                {offerSubmitted ? (
                  <div className="text-center py-4 px-4 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#16a34a' }} />
                    <p className="text-sm font-medium" style={{ color: '#16a34a' }}>Tawaran dihantar!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Tunggu respons pemilik. Anda akan diberitahu melalui notifikasi.</p>
                    <button onClick={() => setOfferSubmitted(false)} className="mt-3 text-xs underline" style={{ color: 'var(--text-muted)' }}>
                      Buat tawaran baru
                    </button>
                  </div>
                ) : !currentUserId ? (
                  <Link href="/auth/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: '#16a34a' }}>
                    Log Masuk untuk Buat Tawaran
                  </Link>
                ) : (
                  <button
                    onClick={() => setShowOfferModal(true)}
                    className="w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    Buat Tawaran
                  </button>
                )}
              </div>
            )}

            {/* Swap: Owner sees offers panel here (when active) */}
            {isSwap && isOwnListing && listing.status === 'ACTIVE' && (
              <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                Ini listing anda. Tawaran dipaparkan di bawah.
              </div>
            )}

            {/* Flash Bid form */}
            {!isSwap && !isEnded && !isOwnListing && (
              <form onSubmit={handleBid}>
                {/* Step 1: Delivery method */}
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Langkah 1: Pilih kaedah penghantaran
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
                      Ambil Sendiri (Percuma)
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
                      Penghantaran Courier
                    </button>
                  </div>
                  {deliveryMethod === 'delivery' && (
                    <select
                      value={buyerState}
                      onChange={e => setBuyerState(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    >
                      <option value="">Pilih negeri anda</option>
                      {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                {/* Step 2: Bid amount */}
                {deliveryReady && (
                  <>
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        Langkah 2: Masukkan tawaran (RM, nombor bulat)
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
                    {totalIfWin !== null && (
                      <div className="mb-3 rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Anggaran kos jika menang:</p>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Tawaran anda</span>
                          <span className="font-mono">RM {bidAmount.toFixed(0)}</span>
                        </div>
                        {deliveryMethod === 'delivery' && buyerState && (
                          <>
                            <div className="flex justify-between">
                              <span style={{ color: 'var(--text-muted)' }}>Kos penghantaran</span>
                              <span className="font-mono">RM {deliveryQuote!.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                              <span className="pl-2">· Kadar asas + markup 30%</span>
                              <span className="font-mono">+RM {deliveryMarkup.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {deliveryMethod === 'pickup' && (
                          <div className="flex justify-between">
                            <span style={{ color: 'var(--text-muted)' }}>Penghantaran</span>
                            <span className="font-mono text-green-400">Percuma (ambil sendiri)</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-muted)' }}>Fi platform (15%)</span>
                          <span className="font-mono">RM {platformFee.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--teal)' }}>
                          <span>Jumlah bayaran</span>
                          <span className="font-mono">RM {totalIfWin.toFixed(2)}</span>
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
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Anda penawar tertinggi sekarang!
                  </div>
                )}

                {!currentUserId ? (
                  <Link href="/auth/login" className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
                    Log Masuk untuk Membida
                  </Link>
                ) : (
                  <button
                    type="submit"
                    disabled={bidLoading || isLastBidder || !deliveryReady}
                    className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    {bidLoading ? 'Menghantar...' : bidSuccess ? '✓ Tawaran Dihantar!' : !deliveryReady ? 'Pilih penghantaran dahulu' : `Bida RM ${bidAmount}`}
                  </button>
                )}
              </form>
            )}

            {!isSwap && isEnded && (
              <div className="text-center py-4">
                <p className="text-lg font-bold" style={{ color: 'var(--red)' }}>Lelongan Telah Tamat</p>
                {listing.currentBidder === currentUserId && !flashTx && (
                  <div className="mt-3">
                    <p className="text-sm mb-3" style={{ color: 'var(--green)' }}>Tahniah! Anda pemenang!</p>
                    <Link href={`/api/payment/checkout?listingId=${listing.id}`} className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
                      Buat Pembayaran
                    </Link>
                  </div>
                )}
              </div>
            )}

            {!isSwap && isOwnListing && (
              <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                Ini adalah listing anda sendiri.
              </div>
            )}

            {/* Fee info */}
            <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Escrow selamat · Pembayaran hanya selepas menang
            </p>
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
                  <p className="font-medium text-sm">{listing.seller.name ?? 'Penjual Tanpa Nama'}</p>
                  {listing.seller.icVerified && <CheckCircle className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />}
                </div>
                <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" style={{ color: 'var(--yellow)' }} />
                    Skor {listing.seller.rehomeScore}
                  </span>
                  {listing.seller.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {listing.seller.state}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/profile/${listing.seller.id}`} className="text-xs px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Profil
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Swap Escrow Panel — shown to both seller & buyer once offer accepted (listing SOLD) */}
      {isSwap && currentUserId && listing.status === 'SOLD' && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Status Escrow</h2>
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
            Status Transaksi
          </h2>

          {justPaid && !flashTx.pickupMethod && isBuyer && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.1)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--green)' }}>
              Pembayaran berjaya! Sila pilih kaedah pengambilan barangan di bawah.
            </div>
          )}

          {/* Pickup method selection — buyer only, before chosen */}
          {!flashTx.pickupMethod && isBuyer && (
            <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-semibold mb-3">Pilih Kaedah Pengambilan Barangan</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSetPickup('PICKUP')}
                  disabled={pickupSaving}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-teal-400"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Home className="w-6 h-6" style={{ color: 'var(--teal)' }} />
                  <span className="text-sm font-semibold">Ambil Sendiri</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Percuma · Atur terus dengan penjual</span>
                </button>
                <button
                  onClick={() => handleSetPickup('DELIVERY')}
                  disabled={pickupSaving}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:border-blue-400"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }}
                >
                  <Truck className="w-6 h-6" style={{ color: 'var(--blue)' }} />
                  <span className="text-sm font-semibold">Penghantaran Pos</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Penjual akan masukkan tracking</span>
                </button>
              </div>
            </div>
          )}

          {/* Pickup mode — PICKUP */}
          {flashTx.pickupMethod === 'PICKUP' && (
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <Home className="w-4 h-4" style={{ color: 'var(--teal)' }} />
                <span className="text-sm font-semibold">Ambil Sendiri</span>
                {flashTx.sellerPickupConfirmed ? (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)' }}>Selesai</span>
                ) : (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--yellow)' }}>Menunggu</span>
                )}
              </div>
              {flashTx.sellerPickupConfirmed ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--green)' }} />
                  <p className="font-semibold" style={{ color: 'var(--green)' }}>Transaksi Selesai</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Penjual telah mengesahkan pengambilan. Bayaran dilepaskan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Hubungi penjual melalui chat untuk atur masa dan tempat pengambilan.
                    {listing.seller.state && ` Lokasi penjual: ${listing.seller.state}.`}
                  </p>
                  {isBuyer && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', color: 'var(--yellow)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      Bayaran akan dilepaskan kepada penjual setelah beliau mengesahkan anda telah mengambil barangan.
                    </p>
                  )}
                  {isSeller && !flashTx.sellerPickupConfirmed && (
                    <button
                      onClick={handlePickupConfirm}
                      disabled={pickupConfirming}
                      className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50"
                    >
                      {pickupConfirming ? 'Mengesahkan...' : 'Sahkan Pembeli Telah Ambil'}
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
                <span className="text-sm font-semibold">Penghantaran Pos</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium" style={{
                  backgroundColor: flashTx.status === 'RELEASED' ? 'rgba(0,217,165,0.1)' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'rgba(79,140,255,0.1)' : 'rgba(251,191,36,0.1)',
                  color: flashTx.status === 'RELEASED' ? 'var(--green)' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'var(--blue)' : 'var(--yellow)',
                }}>
                  {flashTx.status === 'RELEASED' ? 'Selesai' :
                    flashTx.shippingStatus === 'SHIPPED' ? 'Sedang Dihantar' : 'Menunggu Penghantaran'}
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${flashTx.shippingStatus !== 'PENDING' ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ color: 'white' }}>
                    {flashTx.shippingStatus !== 'PENDING' ? '✓' : '1'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Penjual Hantar Barang</p>
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
                          placeholder="No. Tracking (pilihan)"
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        />
                        <button
                          onClick={handleShipItem}
                          disabled={shipConfirming}
                          className="w-full py-2.5 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 text-sm"
                        >
                          {shipConfirming ? 'Mengesahkan...' : 'Sahkan Telah Hantar'}
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
                    <p className="text-sm font-medium">Pembeli Sahkan Penerimaan</p>
                    {isBuyer && flashTx.shippingStatus === 'SHIPPED' && !flashTx.deliveryConfirmed && (
                      <button
                        onClick={handleConfirmReceive}
                        disabled={receiveConfirming}
                        className="mt-2 w-full py-2.5 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 text-sm"
                      >
                        {receiveConfirming ? 'Mengesahkan...' : 'Sahkan Barang Diterima'}
                      </button>
                    )}
                    {flashTx.deliveryConfirmed && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>Diterima · Bayaran dilepaskan kepada penjual</p>
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
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Menunggu pembeli memilih kaedah pengambilan...</p>
            </div>
          )}
        </div>
      )}

      {/* Bid History (Flash only) */}
      {!isSwap && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Sejarah Tawaran</h2>
          {bids.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Gavel className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Belum ada tawaran. Jadilah yang pertama!</p>
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
                      <p className="text-sm font-medium">{bid.bidder.name ?? 'Pengguna Tanpa Nama'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(bid.createdAt).toLocaleString('ms-MY')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono" style={{ color: i === 0 ? 'var(--teal)' : 'var(--text-secondary)' }}>
                      RM {bid.amount.toFixed(0)}
                    </p>
                    {i === 0 && <p className="text-xs" style={{ color: 'var(--green)' }}>Tertinggi</p>}
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
    </div>
  )
}
