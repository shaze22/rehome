'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, X, MessageSquare, ArrowLeftRight, DollarSign, Layers, ChevronDown, ChevronUp } from 'lucide-react'

interface OfferBidder {
  name: string | null
  rehomeScore: number
  swapScore?: number | null
  successfulSwaps?: number
  swapVerified?: boolean
}

interface Offer {
  id: string
  offerType: 'CASH' | 'SWAP' | 'HYBRID'
  offeredCashAmount: number | null
  offeredItemPhotos: string[]
  offeredItemDesc: string | null
  offeredItemValue: number | null
  totalOfferValue: number | null
  message: string | null
  status: 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  counterRounds: number
  createdAt: string
  bidder: OfferBidder
  counterOffers: Offer[]
}

interface Props {
  listingId: string
  listingTitle: string
  swapValueEstimate?: number | null
}

const OFFER_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CASH: { label: 'Wang Tunai', icon: <DollarSign className="w-3.5 h-3.5" />, color: 'var(--yellow)' },
  SWAP: { label: 'Tukar Barang', icon: <ArrowLeftRight className="w-3.5 h-3.5" />, color: '#16a34a' },
  HYBRID: { label: 'Barang + Wang', icon: <Layers className="w-3.5 h-3.5" />, color: 'var(--teal)' },
}

function CounterModal({
  offerId, onClose, onDone,
}: { offerId: string; onClose: () => void; onDone: () => void }) {
  const [cashAmount, setCashAmount] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/offers/${offerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'counter',
          offeredCashAmount: cashAmount ? Number(cashAmount) : undefined,
          message: message || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal counter.'); return }
      onDone()
    } catch {
      setError('Ralat rangkaian.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Counter Tawaran</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Cadangkan jumlah wang (RM)</label>
            <input type="number" min={0} step={1} value={cashAmount} onChange={e => setCashAmount(e.target.value)}
              placeholder="Kosongkan jika tiada perubahan"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pesanan</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Terangkan syarat counter tawaran anda..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
          <button type="submit" disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--teal)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Hantar Counter'}
          </button>
        </form>
      </div>
    </div>
  )
}

function calcOfferScore(offer: Offer, listingValue: number | null): number | null {
  if (!listingValue || listingValue === 0) return null
  const offerVal = offer.totalOfferValue ?? offer.offeredCashAmount ?? offer.offeredItemValue ?? 0
  if (offerVal === 0) return null
  const ratio = offerVal / listingValue
  const reputationBonus = Math.min((offer.bidder.successfulSwaps ?? 0) * 2, 10)
  const score = Math.min(Math.round(ratio * 80) + reputationBonus, 100)
  return Math.max(score, 5)
}

function OfferCard({ offer, onAction, listingValue }: { offer: Offer; onAction: () => void; listingValue?: number | null }) {
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing] = useState(false)
  const [showCounter, setShowCounter] = useState(false)
  const info = OFFER_TYPE_LABELS[offer.offerType]
  const score = calcOfferScore(offer, listingValue ?? null)

  async function act(action: 'accept' | 'reject') {
    setActing(true)
    await fetch(`/api/offers/${offer.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(false)
    onAction()
  }

  const isActive = offer.status === 'PENDING' || offer.status === 'COUNTERED'
  const latestOffer = offer.counterOffers.length > 0 ? offer.counterOffers[0] : offer

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{offer.bidder.name ?? 'Pengguna'}</span>
              {offer.bidder.swapVerified && (
                <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>
                  ✓ Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Skor: {offer.bidder.rehomeScore}</span>
              {(offer.bidder.successfulSwaps ?? 0) > 0 && (
                <span>{offer.bidder.successfulSwaps} swap berjaya</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {score !== null && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: score >= 80 ? 'rgba(22,163,74,0.15)' : score >= 60 ? 'rgba(251,191,36,0.15)' : 'rgba(100,100,100,0.15)',
                  color: score >= 80 ? '#16a34a' : score >= 60 ? 'var(--yellow)' : 'var(--text-muted)',
                }}>
                Match {score}%
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--bg-card)', color: info.color }}>
              {info.icon}
              {info.label}
            </div>
          </div>
        </div>

        {/* Offer details */}
        <div className="space-y-1.5 mb-3">
          {latestOffer.offeredCashAmount != null && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Wang tunai</span>
              <span className="font-mono font-bold" style={{ color: 'var(--yellow)' }}>RM {latestOffer.offeredCashAmount}</span>
            </div>
          )}
          {latestOffer.offeredItemValue != null && (
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>Nilai barang</span>
              <span className="font-mono font-bold" style={{ color: '#16a34a' }}>~RM {latestOffer.offeredItemValue}</span>
            </div>
          )}
          {latestOffer.totalOfferValue != null && (
            <div className="flex justify-between text-sm font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}>
              <span>Jumlah</span>
              <span className="font-mono" style={{ color: 'var(--teal)' }}>RM {latestOffer.totalOfferValue}</span>
            </div>
          )}
        </div>

        {/* Item photos */}
        {latestOffer.offeredItemPhotos.length > 0 && (
          <div className="flex gap-2 mb-3">
            {latestOffer.offeredItemPhotos.slice(0, 3).map((url, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            {latestOffer.offeredItemPhotos.length > 3 && (
              <div className="w-16 h-16 rounded-lg flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                +{latestOffer.offeredItemPhotos.length - 3}
              </div>
            )}
          </div>
        )}

        {latestOffer.message && (
          <p className="text-xs px-3 py-2 rounded-lg mb-3 italic" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
            "{latestOffer.message}"
          </p>
        )}

        {/* Counter history toggle */}
        {offer.counterOffers.length > 0 && (
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {offer.counterOffers.length} pusingan rundingan
          </button>
        )}

        {/* Actions */}
        {isActive && (
          <div className="flex gap-2">
            <button onClick={() => act('accept')} disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: '#16a34a' }}>
              {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Terima
            </button>
            <button onClick={() => setShowCounter(true)} disabled={acting || offer.counterRounds >= 3}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ border: '1px solid var(--teal)', color: 'var(--teal)' }}>
              <MessageSquare className="w-3.5 h-3.5" />
              Counter
            </button>
            <button onClick={() => act('reject')} disabled={acting}
              className="py-2 px-3 rounded-lg disabled:opacity-60"
              style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isActive && (
          <div className="text-center py-1">
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: offer.status === 'ACCEPTED' ? 'rgba(22,163,74,0.15)' : 'rgba(100,100,100,0.15)',
                color: offer.status === 'ACCEPTED' ? '#16a34a' : 'var(--text-muted)',
              }}>
              {offer.status === 'ACCEPTED' ? '✓ Diterima' : offer.status === 'REJECTED' ? 'Ditolak' : 'Tamat tempoh'}
            </span>
          </div>
        )}
      </div>

      {/* Counter history expanded */}
      {expanded && offer.counterOffers.length > 0 && (
        <div className="border-t space-y-2 p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Sejarah rundingan</p>
          {[offer, ...offer.counterOffers].map((o, idx) => (
            <div key={o.id} className="text-xs flex gap-2 items-start">
              <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{idx + 1}</span>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>{o.bidder?.name ?? 'Pemilik'}: </span>
                {o.offeredCashAmount != null && <span className="font-mono">RM {o.offeredCashAmount} </span>}
                {o.message && <span className="italic" style={{ color: 'var(--text-muted)' }}>"{o.message}"</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCounter && (
        <CounterModal offerId={offer.id} onClose={() => setShowCounter(false)} onDone={() => { setShowCounter(false); onAction() }} />
      )}
    </div>
  )
}

export function OwnerOffersPanel({ listingId, listingTitle, swapValueEstimate }: Props) {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)

  async function loadOffers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/offers?listingId=${listingId}`)
      const data = await res.json()
      setOffers(data.offers ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadOffers() }, [listingId])

  const cashOffers = offers.filter(o => o.offerType === 'CASH')
  const swapOffers = offers.filter(o => o.offerType === 'SWAP' || o.offerType === 'HYBRID')
  const activeCount = offers.filter(o => o.status === 'PENDING' || o.status === 'COUNTERED').length

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--teal)' }} /></div>
  }

  if (offers.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium mb-1">Belum ada tawaran</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tawaran akan muncul di sini apabila seseorang membuat tawaran.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tawaran Masuk</h3>
        <span className="text-sm px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.15)', color: '#16a34a' }}>
          {activeCount} aktif
        </span>
      </div>

      {cashOffers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tawaran Wang ({cashOffers.length})</p>
          {cashOffers.map(o => <OfferCard key={o.id} offer={o} onAction={loadOffers} listingValue={swapValueEstimate} />)}
        </div>
      )}

      {swapOffers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tawaran Tukar ({swapOffers.length})</p>
          {swapOffers.map(o => <OfferCard key={o.id} offer={o} onAction={loadOffers} listingValue={swapValueEstimate} />)}
        </div>
      )}
    </div>
  )
}
