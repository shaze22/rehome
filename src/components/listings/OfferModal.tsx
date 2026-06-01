'use client'

import { useState } from 'react'
import { X, Upload, Loader2, AlertCircle, DollarSign, ArrowLeftRight, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  listingId: string
  listingTitle: string
  swapValueEstimate: number | null
  swapAcceptCash: boolean
  swapWantedItem: string | null
  swapWantedCategory: string | null
  userId: string
  onClose: () => void
  onSuccess: () => void
}

type OfferType = 'CASH' | 'SWAP' | 'HYBRID'

export function OfferModal({
  listingId, listingTitle, swapValueEstimate,
  swapAcceptCash, swapWantedItem, swapWantedCategory,
  userId, onClose, onSuccess,
}: Props) {
  const [offerType, setOfferType] = useState<OfferType>(swapAcceptCash ? 'CASH' : 'SWAP')
  const [cashAmount, setCashAmount] = useState('')
  const [itemDesc, setItemDesc] = useState('')
  const [itemValue, setItemValue] = useState('')
  const [itemPhotos, setItemPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (itemPhotos.length + files.length > 5) { setError('Maksimum 5 foto.'); return }
    setPhotoUploading(true)
    const supabase = createClient()
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `offers/${userId}/${Date.now()}.${ext}`
      const { data, error: uploadErr } = await supabase.storage.from('rehome-photos').upload(path, file)
      if (!uploadErr && data) {
        const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
        setItemPhotos(prev => [...prev, publicUrl])
      }
    }
    setPhotoUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if ((offerType === 'SWAP' || offerType === 'HYBRID') && itemPhotos.length === 0) {
      setError('Sila muat naik sekurang-kurangnya 1 foto barang tawaran anda.')
      return
    }
    if ((offerType === 'CASH' || offerType === 'HYBRID') && !cashAmount) {
      setError('Sila masukkan jumlah wang tunai.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          offerType,
          offeredCashAmount: cashAmount ? Number(cashAmount) : undefined,
          offeredItemPhotos: itemPhotos,
          offeredItemDesc: itemDesc || undefined,
          offeredItemValue: itemValue ? Number(itemValue) : undefined,
          message: message || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Gagal hantar tawaran.'); return }
      onSuccess()
    } catch {
      setError('Ralat rangkaian. Sila cuba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  const allTabs: { type: OfferType; label: string; icon: React.ReactNode; show: boolean }[] = [
    { type: 'CASH' as OfferType, label: 'Wang', icon: <DollarSign className="w-4 h-4" />, show: swapAcceptCash },
    { type: 'SWAP' as OfferType, label: 'Barang', icon: <ArrowLeftRight className="w-4 h-4" />, show: true },
    { type: 'HYBRID' as OfferType, label: 'Barang + Wang', icon: <Layers className="w-4 h-4" />, show: true },
  ]
  const tabs = allTabs.filter(t => t.show)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-semibold">Buat Tawaran</h2>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{listingTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Value reference */}
          {swapValueEstimate && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm" style={{ backgroundColor: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Nilai anggaran item ini</span>
              <span className="font-bold font-mono" style={{ color: '#16a34a' }}>~RM {swapValueEstimate.toFixed(0)}</span>
            </div>
          )}

          {/* Wanted info */}
          {(swapWantedItem || swapWantedCategory) && (
            <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Pemilik mencari: </span>
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {[swapWantedItem, swapWantedCategory].filter(Boolean).join(' / ')}
              </span>
            </div>
          )}

          {/* Offer type tabs */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Jenis Tawaran</label>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
              {tabs.map(tab => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setOfferType(tab.type)}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all"
                  style={offerType === tab.type
                    ? { backgroundColor: '#16a34a', color: 'white' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cash amount */}
          {(offerType === 'CASH' || offerType === 'HYBRID') && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                {offerType === 'HYBRID' ? 'Tambahan wang tunai (RM)' : 'Jumlah wang tunai (RM)'} *
              </label>
              <input
                type="number" min={0} step={1} value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                required
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
          )}

          {/* Item offer (for SWAP / HYBRID) */}
          {(offerType === 'SWAP' || offerType === 'HYBRID') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Foto barang anda (maks 5) *
                </label>
                <label className="flex flex-col items-center gap-2 p-5 rounded-xl cursor-pointer" style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={itemPhotos.length >= 5} />
                  {photoUploading ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--teal)' }} /> : (
                    <>
                      <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Klik untuk muat naik ({itemPhotos.length}/5)</p>
                    </>
                  )}
                </label>
                {itemPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {itemPhotos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setItemPhotos(p => p.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: 'white' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Penerangan barang anda</label>
                <textarea
                  value={itemDesc} onChange={e => setItemDesc(e.target.value)}
                  placeholder="Jenama, model, keadaan, aksesori disertakan..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Anggaran nilai barang anda (RM)</label>
                <input
                  type="number" min={0} step={1} value={itemValue} onChange={e => setItemValue(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Total */}
          {(cashAmount || itemValue) && (
            <div className="flex justify-between items-center px-4 py-2.5 rounded-xl font-mono text-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Jumlah tawaran</span>
              <span className="font-bold" style={{ color: 'var(--teal)' }}>
                RM {((Number(cashAmount) || 0) + (Number(itemValue) || 0)).toFixed(0)}
              </span>
            </div>
          )}

          {/* Message */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nota kepada pemilik (pilihan)</label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Terangkan tawaran anda atau tanya soalan..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm disabled:opacity-60"
            style={{ backgroundColor: '#16a34a' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Menghantar...</span>
            ) : 'Hantar Tawaran'}
          </button>
        </form>
      </div>
    </div>
  )
}
