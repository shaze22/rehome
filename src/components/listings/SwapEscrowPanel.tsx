'use client'

import { useEffect, useState } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle, Package, Truck, X, ArrowLeftRight, DollarSign, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SwapTx {
  id: string
  listingId: string
  offerType: 'CASH' | 'SWAP' | 'HYBRID'
  escrowStatus: 'PENDING' | 'BOTH_SHIPPED' | 'COMPLETED' | 'DISPUTED'
  sellerItemShipped: boolean
  buyerItemShipped: boolean | null
  sellerItemReceived: boolean
  buyerItemReceived: boolean
  sellerPhotos: string[]
  buyerPhotos: string[]
  sellerTracking: string | null
  buyerTracking: string | null
  sellerCourier: string | null
  buyerCourier: string | null
  disputeReason: string | null
  resolvedAt: string | null
  seller: { id: string; name: string | null }
  buyer: { id: string; name: string | null }
  acceptedOffer: {
    offerType: string
    offeredCashAmount: number | null
    offeredItemPhotos: string[]
    offeredItemDesc: string | null
    offeredItemValue: number | null
    totalOfferValue: number | null
  }
}

interface Props {
  listingId: string
  currentUserId: string
  listingTitle: string
}

function ShipModal({
  txId, userId, onClose, onDone,
}: { txId: string; userId: string; onClose: () => void; onDone: () => void }) {
  const [photos, setPhotos] = useState<string[]>([])
  const [tracking, setTracking] = useState('')
  const [courier, setCourier] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 5) return
    setUploading(true)
    const supabase = createClient()
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `escrow/${userId}/${Date.now()}.${ext}`
      const { data, error: err } = await supabase.storage.from('rehome-photos').upload(path, file)
      if (!err && data) {
        const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
        setPhotos(p => [...p, publicUrl])
      }
    }
    setUploading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (photos.length === 0) { setError('Sila muat naik sekurang-kurangnya 1 foto.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/swap-transactions/${txId}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos, trackingNumber: tracking || undefined, courier: courier || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal.'); return }
      onDone()
    } catch { setError('Ralat rangkaian.') }
    finally { setSubmitting(false) }
  }

  const inputStyle = { backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Truck className="w-4 h-4" /> Hantar Barang</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>Foto barang sebelum dihantar (maks 5) *</label>
            <label className="flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer" style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
              <input type="file" accept="image/*" multiple onChange={uploadPhoto} className="hidden" disabled={photos.length >= 5} />
              {uploading ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--teal)' }} /> : (
                <><Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Klik untuk muat naik ({photos.length}/5)</p></>
              )}
            </label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: 'white' }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Kurier</label>
            <select value={courier} onChange={e => setCourier(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">Pilih kurier (pilihan)</option>
              {['J&T Express', 'Pos Laju', 'DHL Express', 'GDex', 'Ninja Van', 'Lalamove', 'Grab Express', 'Lain-lain'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Nombor tracking (pilihan)</label>
            <input type="text" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="cth: JT1234567890" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 gradient-teal">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sahkan Penghantaran'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DisputeModal({ txId, onClose, onDone }: { txId: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/swap-transactions/${txId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal.'); return }
      onDone()
    } catch { setError('Ralat rangkaian.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-red-400"><AlertCircle className="w-4 h-4" /> Laporkan Masalah</h3>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Terangkan masalah anda *</label>
            <textarea required value={reason} onChange={e => setReason(e.target.value)} rows={4}
              placeholder="cth: Barang tidak sampai selepas 7 hari, atau barang tidak seperti yang diterangkan..."
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--red)' }}>{error}</p>}
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--red)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Hantar Laporan'}
          </button>
        </form>
      </div>
    </div>
  )
}

const OFFER_TYPE_ICON: Record<string, React.ReactNode> = {
  CASH: <DollarSign className="w-3.5 h-3.5" />,
  SWAP: <ArrowLeftRight className="w-3.5 h-3.5" />,
  HYBRID: <Layers className="w-3.5 h-3.5" />,
}

export function SwapEscrowPanel({ listingId, currentUserId, listingTitle }: Props) {
  const [tx, setTx] = useState<SwapTx | null>(null)
  const [loading, setLoading] = useState(true)
  const [showShip, setShowShip] = useState(false)
  const [showDispute, setShowDispute] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/swap-transactions?listingId=${listingId}`)
      const data = await res.json()
      setTx(data.transaction ?? null)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [listingId])

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--teal)' }} /></div>
  if (!tx) return null

  const isSeller = tx.seller.id === currentUserId
  const isBuyer = tx.buyer.id === currentUserId
  const isSwapOrHybrid = tx.offerType === 'SWAP' || tx.offerType === 'HYBRID'

  const myShipped = isSeller ? tx.sellerItemShipped : tx.buyerItemShipped
  const myReceived = isSeller ? tx.sellerItemReceived : tx.buyerItemReceived
  const theirShipped = isSeller ? (tx.buyerItemShipped ?? true) : tx.sellerItemShipped

  // Steps: accepted → shipped → received → done
  const steps = [
    { label: 'Tawaran Diterima', done: true },
    {
      label: isSeller ? 'Hantar Barang Anda' : 'Penjual Hantar Barang',
      done: tx.sellerItemShipped,
      mine: isSeller && !tx.sellerItemShipped,
      tracking: isSeller ? null : tx.sellerTracking,
      courier: isSeller ? null : tx.sellerCourier,
    },
    ...(isSwapOrHybrid ? [{
      label: isBuyer ? 'Hantar Barang Anda' : 'Pembeli Hantar Barang',
      done: tx.buyerItemShipped === true,
      mine: isBuyer && !tx.buyerItemShipped,
      tracking: isBuyer ? null : tx.buyerTracking,
      courier: isBuyer ? null : tx.buyerCourier,
    }] : []),
    {
      label: isBuyer ? 'Sahkan Terima Barang' : 'Tunggu Pembeli Sahkan',
      done: tx.buyerItemReceived,
      mine: isBuyer && tx.escrowStatus === 'BOTH_SHIPPED' && !tx.buyerItemReceived,
    },
    ...(isSwapOrHybrid ? [{
      label: isSeller ? 'Sahkan Terima Barang' : 'Tunggu Penjual Sahkan',
      done: tx.sellerItemReceived,
      mine: isSeller && tx.escrowStatus === 'BOTH_SHIPPED' && !tx.sellerItemReceived,
    }] : []),
    { label: 'Selesai', done: tx.escrowStatus === 'COMPLETED' },
  ]

  const canShip = (isSeller && !tx.sellerItemShipped) ||
    (isBuyer && isSwapOrHybrid && tx.buyerItemShipped === false)

  const canReceive = tx.escrowStatus === 'BOTH_SHIPPED' &&
    ((isBuyer && !tx.buyerItemReceived) || (isSeller && isSwapOrHybrid && !tx.sellerItemReceived))

  async function confirmReceive() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/swap-transactions/${tx!.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionOk: true }),
      })
      if (res.ok) load()
    } finally { setActionLoading(false) }
  }

  // Status banners
  if (tx.escrowStatus === 'DISPUTED') {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5" style={{ color: 'var(--red)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--red)' }}>Pertikaian Difailkan</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Pasukan BALLOUT sedang menyemak kes ini. Sila tunggu makluman melalui emel.
        </p>
        {tx.disputeReason && (
          <p className="text-xs mt-2 italic px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            "{tx.disputeReason}"
          </p>
        )}
      </div>
    )
  }

  if (tx.escrowStatus === 'COMPLETED') {
    return (
      <div className="rounded-xl p-5" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5" style={{ color: '#16a34a' }} />
          <h3 className="font-semibold" style={{ color: '#16a34a' }}>Pertukaran Berjaya!</h3>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tahniah! Pertukaran "{listingTitle}" telah selesai dengan jayanya. Skor Swap anda telah dikemas kini.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(22,163,74,0.3)', backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" style={{ color: '#16a34a' }} />
            <h3 className="font-semibold text-sm">Status Pertukaran</h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
            {OFFER_TYPE_ICON[tx.offerType]}
            {tx.offerType === 'CASH' ? 'Wang Tunai' : tx.offerType === 'SWAP' ? 'Tukar Barang' : 'Barang + Wang'}
          </div>
        </div>

        {/* Offer summary */}
        {tx.acceptedOffer && (
          <div className="px-5 py-3 flex gap-4 text-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            {tx.acceptedOffer.offeredCashAmount != null && (
              <div><span style={{ color: 'var(--text-muted)' }}>Wang: </span><span className="font-mono font-bold" style={{ color: 'var(--yellow)' }}>RM {tx.acceptedOffer.offeredCashAmount}</span></div>
            )}
            {tx.acceptedOffer.offeredItemValue != null && (
              <div><span style={{ color: 'var(--text-muted)' }}>Nilai barang: </span><span className="font-mono font-bold" style={{ color: '#16a34a' }}>~RM {tx.acceptedOffer.offeredItemValue}</span></div>
            )}
            {tx.acceptedOffer.offeredItemPhotos.length > 0 && (
              <div className="flex gap-1">
                {tx.acceptedOffer.offeredItemPhotos.slice(0, 3).map((url, i) => (
                  <div key={i} className="w-8 h-8 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress steps */}
        <div className="p-5">
          <div className="space-y-3 mb-5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all`}
                  style={{
                    backgroundColor: step.done ? '#16a34a' : 'var(--bg-elevated)',
                    border: step.done ? 'none' : step.mine ? '2px solid #16a34a' : '2px solid var(--border)',
                    color: step.done ? 'white' : step.mine ? '#16a34a' : 'var(--text-muted)',
                  }}>
                  {step.done ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: step.done ? 'var(--text-primary)' : step.mine ? '#16a34a' : 'var(--text-muted)', fontWeight: step.mine ? 600 : 400 }}>
                    {step.label}
                    {step.mine && ' ← Tindakan anda'}
                  </p>
                  {'tracking' in step && step.tracking && (
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {step.courier && `${step.courier} · `}{step.tracking}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {canShip && (
              <button onClick={() => setShowShip(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#16a34a' }}>
                <Truck className="w-4 h-4" />
                Hantar Barang Saya
              </button>
            )}

            {canReceive && (
              <button onClick={confirmReceive} disabled={actionLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: 'var(--teal)' }}>
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Sahkan Terima Barang
              </button>
            )}

            {!['PENDING', 'COMPLETED'].includes(tx.escrowStatus as string) && (
              <button onClick={() => setShowDispute(true)}
                className="w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                <AlertCircle className="w-3.5 h-3.5" />
                Laporkan Masalah
              </button>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="px-5 py-3 flex justify-between text-xs" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Penjual: </span><span className="font-medium">{tx.seller.name ?? 'Pengguna'}</span></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Pembeli: </span><span className="font-medium">{tx.buyer.name ?? 'Pengguna'}</span></div>
        </div>
      </div>

      {showShip && <ShipModal txId={tx.id} userId={currentUserId} onClose={() => setShowShip(false)} onDone={() => { setShowShip(false); load() }} />}
      {showDispute && <DisputeModal txId={tx.id} onClose={() => setShowDispute(false)} onDone={() => { setShowDispute(false); load() }} />}
    </>
  )
}
