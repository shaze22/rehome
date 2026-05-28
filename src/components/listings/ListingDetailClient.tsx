'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Gavel, Leaf, Shield, CheckCircle, MapPin, Star,
  AlertCircle, Package, ChevronLeft, ChevronRight, Truck, Bot
} from 'lucide-react'
import { calculateDeliveryQuote } from '@/lib/delivery'

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
  endsAt: string
  co2Saved: number
  hasScratch: boolean
  isFunctional: boolean
  hasCompleteParts: boolean
  hasOriginalBox: boolean
  hasWarranty: boolean
  aiSuggestedMin: number | null
  aiSuggestedMax: number | null
  aiReasoning: string | null
  seller: Seller
  bids: Bid[]
  _count: { bids: number }
}

interface Props {
  listing: Listing
  currentUserId: string | null
  currentUserEmail: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  FURNITURE: 'Perabot', ELECTRONICS: 'Elektronik', FASHION: 'Fesyen',
  BOOKS: 'Buku', SPORTS: 'Sukan', KITCHEN: 'Dapur', OTHERS: 'Lain-lain',
}

function useCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [isEnded, setIsEnded] = useState(false)

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setIsEnded(true); setTimeLeft('Lelongan Tamat'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setIsUrgent(diff < 300000)
      if (h > 0) setTimeLeft(`${h} jam ${m} min ${s} saat`)
      else if (m > 0) setTimeLeft(`${m} min ${s} saat`)
      else setTimeLeft(`${s} saat`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  return { timeLeft, isUrgent, isEnded }
}

export function ListingDetailClient({ listing: initialListing, currentUserId, currentUserEmail }: Props) {
  const [listing, setListing] = useState(initialListing)
  const [bids, setBids] = useState(initialListing.bids)
  const [bidAmount, setBidAmount] = useState(Math.max(initialListing.currentBid + 1, initialListing.startingBid + 1, 1))
  const [bidError, setBidError] = useState('')
  const [bidLoading, setBidLoading] = useState(false)
  const [bidSuccess, setBidSuccess] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [buyerState, setBuyerState] = useState('')
  const { timeLeft, isUrgent, isEnded } = useCountdown(listing.endsAt)

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
        }))
        setBidAmount(payload.currentBid + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [listing.id])

  const deliveryQuote = buyerState
    ? calculateDeliveryQuote(listing.state, buyerState)
    : null

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    setBidError('')
    if (!currentUserId) { setBidError('Sila log masuk untuk membida.'); return }
    if (bidAmount < 1 || !Number.isInteger(bidAmount)) { setBidError('Tawaran mesti nombor bulat (Ringgit sahaja).'); return }
    if (bidAmount <= listing.currentBid) { setBidError(`Tawaran mesti lebih tinggi daripada RM ${listing.currentBid}.`); return }

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
              Laporan Keadaan (Rehome Shield)
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
            <h1 className="text-2xl font-bold mb-2">{listing.title}</h1>
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

          {/* Bid Box */}
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {/* Timer */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : 'var(--teal)' }} />
                <span className={`text-sm font-mono font-bold ${isUrgent ? 'timer-urgent' : ''}`} style={{ color: isUrgent ? 'var(--red)' : 'var(--text-primary)' }}>
                  {timeLeft}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {listing._count.bids} tawaran
              </span>
            </div>

            {/* Current bid */}
            <div className="mb-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                {listing.currentBid > 0 ? 'Tawaran Tertinggi' : 'Tawaran Permulaan'}
              </p>
              <p className="text-4xl font-bold font-mono" style={{ color: 'var(--teal)' }}>
                RM {currentBidDisplay.toFixed(0)}
              </p>
              {listing.originalPrice > 0 && (
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

            {/* Bid form */}
            {!isEnded && !isOwnListing && (
              <form onSubmit={handleBid}>
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Tawaran Anda (RM, nombor bulat sahaja)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>RM</span>
                      <input
                        type="number"
                        min={listing.currentBid + 1}
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
                    disabled={bidLoading || isLastBidder}
                    className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                  >
                    {bidLoading ? 'Menghantar...' : bidSuccess ? '✓ Tawaran Dihantar!' : `Bida RM ${bidAmount}`}
                  </button>
                )}
              </form>
            )}

            {isEnded && (
              <div className="text-center py-4">
                <p className="text-lg font-bold" style={{ color: 'var(--red)' }}>Lelongan Telah Tamat</p>
                {listing.currentBidder === currentUserId && (
                  <div className="mt-3">
                    <p className="text-sm mb-3" style={{ color: 'var(--green)' }}>Tahniah! Anda pemenang!</p>
                    <Link href={`/api/payment/checkout?listingId=${listing.id}`} className="block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal">
                      Buat Pembayaran
                    </Link>
                  </div>
                )}
              </div>
            )}

            {isOwnListing && (
              <div className="text-center py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                Ini adalah listing anda sendiri.
              </div>
            )}

            {/* Fee info */}
            <p className="text-xs text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              15% fi platform · Pembayaran escrow selamat
            </p>
          </div>

          {/* Delivery Quote */}
          <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4" style={{ color: 'var(--blue)' }} />
              <span className="text-sm font-semibold">Anggaran Penghantaran</span>
            </div>
            <div className="flex gap-2">
              <select
                value={buyerState}
                onChange={e => setBuyerState(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Pilih negeri anda</option>
                {['Johor','Kedah','Kelantan','Kuala Lumpur','Labuan','Melaka','Negeri Sembilan','Pahang','Perak','Perlis','Pulau Pinang','Putrajaya','Sabah','Sarawak','Selangor','Terengganu'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {deliveryQuote !== null && (
                <div className="flex items-center px-4 rounded-lg font-bold font-mono" style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: 'var(--blue)', border: '1px solid rgba(79,140,255,0.3)', whiteSpace: 'nowrap' }}>
                  RM {deliveryQuote}
                </div>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Dari: {listing.state} · Anggaran sahaja
            </p>
          </div>

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

      {/* Bid History */}
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
    </div>
  )
}
