'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, X, Zap, ArrowLeftRight } from 'lucide-react'
import { MALAYSIAN_STATES } from '@/lib/delivery'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'BOOKS', label: 'Books' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'OTHERS', label: 'Others' },
]

interface Props {
  listing: {
    id: string
    title: string
    description: string
    category: string
    condition: number
    originalPrice: number
    state: string
    weightKg: number
    mode: string
    photos: string[]
    swapWantedItem: string | null
    swapWantedCategory: string | null
    swapOpenOffers: boolean
    swapAcceptCash: boolean
    swapMinCashTopup: number | null
    hasScratch: boolean
    isFunctional: boolean
    hasCompleteParts: boolean
    hasOriginalBox: boolean
    hasWarranty: boolean
    _count: { bids: number; offers: number }
  }
  userId: string
}

export function EditListingForm({ listing, userId }: Props) {
  const router = useRouter()

  const [mode, setMode] = useState<'FLASH' | 'SWAP'>(listing.mode as 'FLASH' | 'SWAP')
  const [title, setTitle] = useState(listing.title)
  const [description, setDescription] = useState(listing.description)
  const [category, setCategory] = useState(listing.category)
  const [condition, setCondition] = useState(listing.condition)
  const [originalPrice, setOriginalPrice] = useState(String(listing.originalPrice))
  const [state, setState] = useState(listing.state)
  const [weightKg, setWeightKg] = useState(String(listing.weightKg))
  const [photos, setPhotos] = useState<string[]>(listing.photos)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [swapWantedItem, setSwapWantedItem] = useState(listing.swapWantedItem ?? '')
  const [swapWantedCategory, setSwapWantedCategory] = useState(listing.swapWantedCategory ?? '')
  const [swapOpenOffers, setSwapOpenOffers] = useState(listing.swapOpenOffers)
  const [swapAcceptCash, setSwapAcceptCash] = useState(listing.swapAcceptCash)
  const [swapMinCashTopup, setSwapMinCashTopup] = useState(String(listing.swapMinCashTopup ?? ''))
  const [hasScratch, setHasScratch] = useState(listing.hasScratch)
  const [isFunctional, setIsFunctional] = useState(listing.isFunctional)
  const [hasCompleteParts, setHasCompleteParts] = useState(listing.hasCompleteParts)
  const [hasOriginalBox, setHasOriginalBox] = useState(listing.hasOriginalBox)
  const [hasWarranty, setHasWarranty] = useState(listing.hasWarranty)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSwitchMode = mode === 'FLASH'
    ? listing._count.bids === 0
    : listing._count.offers === 0

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 5) { alert('Maximum 5 photos only.'); return }
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setError('Only image files are allowed.'); return }
    }
    setPhotoUploading(true)
    const supabase = createClient()
    for (const file of files) {
      let blob: Blob = file
      try {
        blob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image()
          const objectUrl = URL.createObjectURL(file)
          img.onload = () => {
            URL.revokeObjectURL(objectUrl)
            const MAX = 1200
            let { width, height } = img
            if (width > MAX || height > MAX) {
              if (width > height) { height = Math.round(height * MAX / width); width = MAX }
              else { width = Math.round(width * MAX / height); height = MAX }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width; canvas.height = height
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), 'image/jpeg', 0.82)
          }
          img.onerror = reject
          img.src = objectUrl
        })
      } catch { blob = file }
      const path = `listings/${userId}/${Date.now()}.jpg`
      const { data, err } = await supabase.storage.from('rehome-photos').upload(path, blob, { contentType: 'image/jpeg' }) as any
      if (err) { setError(`Upload failed: ${err.message}`); setPhotoUploading(false); return }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
        setPhotos(prev => [...prev, publicUrl])
      }
    }
    setPhotoUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!state) { setError('Please select a state.'); return }
    if (photos.length === 0) { setError('Please keep at least 1 photo.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category, condition, originalPrice, state,
          weightKg, mode, photos,
          swapWantedItem, swapWantedCategory, swapOpenOffers, swapAcceptCash,
          swapMinCashTopup: swapMinCashTopup || null,
          hasScratch, isFunctional, hasCompleteParts, hasOriginalBox, hasWarranty,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save changes.'); return }
      router.push('/dashboard')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">

      {/* Mode switch */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4">Listing Type</h2>
        {!canSwitchMode && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(234,179,8,0.08)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}>
            Cannot switch type — listing has active {listing.mode === 'FLASH' ? 'bids' : 'offers'}.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(['FLASH', 'SWAP'] as const).map(m => (
            <button
              key={m} type="button"
              onClick={() => canSwitchMode && setMode(m)}
              disabled={!canSwitchMode}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: mode === m ? (m === 'FLASH' ? 'rgba(20,184,166,0.15)' : 'rgba(22,163,74,0.15)') : 'var(--bg-elevated)',
                color: mode === m ? (m === 'FLASH' ? 'var(--teal)' : 'var(--green)') : 'var(--text-muted)',
                border: `1px solid ${mode === m ? (m === 'FLASH' ? 'rgba(20,184,166,0.4)' : 'rgba(22,163,74,0.4)') : 'var(--border)'}`,
                opacity: !canSwitchMode && mode !== m ? 0.4 : 1,
              }}
            >
              {m === 'FLASH' ? <Zap className="w-4 h-4" /> : <ArrowLeftRight className="w-4 h-4" />}
              {m === 'FLASH' ? 'Flash Bid' : 'Swap Bid'}
            </button>
          ))}
        </div>
      </section>

      {/* Basic info */}
      <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold">Item Details</h2>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description *</label>
          <textarea required value={description} onChange={e => setDescription(e.target.value)}
            rows={4} className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category *</label>
            <select required value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>State *</label>
            <select required value={state} onChange={e => setState(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">Select State</option>
              {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Weight (kg) — for delivery quote
          </label>
          <div className="flex items-center gap-3">
            <input type="range" min={0.1} max={30} step={0.1} value={weightKg}
              onChange={e => setWeightKg(e.target.value)} className="flex-1 accent-teal-400" />
            <span className="text-sm font-mono font-bold w-14 text-right" style={{ color: 'var(--teal)' }}>
              {Number(weightKg).toFixed(1)} kg
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Original Price (RM) *</label>
          <input type="number" required min={0} step={0.01} value={originalPrice}
            onChange={e => setOriginalPrice(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
        </div>
      </section>

      {/* Swap-specific fields */}
      {mode === 'SWAP' && (
        <section className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 className="text-lg font-semibold">Swap Preferences</h2>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>What are you looking for? (optional)</label>
            <input type="text" value={swapWantedItem} onChange={e => setSwapWantedItem(e.target.value)}
              placeholder="e.g. MacBook, Bicycle, DSLR Camera..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category you are looking for (optional)</label>
            <select value={swapWantedCategory} onChange={e => setSwapWantedCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <input type="checkbox" checked={swapOpenOffers} onChange={e => setSwapOpenOffers(e.target.checked)} className="w-4 h-4 accent-green-600" />
            <div>
              <p className="text-sm font-medium">Accept any offer</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open to all offer types</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <input type="checkbox" checked={swapAcceptCash} onChange={e => setSwapAcceptCash(e.target.checked)} className="w-4 h-4 accent-green-600" />
            <div>
              <p className="text-sm font-medium">Accept cash offers</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Allow cash-only offers</p>
            </div>
          </label>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Min. cash top-up for swap + cash (RM, optional)</label>
            <input type="number" min={0} step={0.01} value={swapMinCashTopup}
              onChange={e => setSwapMinCashTopup(e.target.value)}
              placeholder="0" className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono" style={inputStyle} />
          </div>
        </section>
      )}

      {/* Condition */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4">Condition</h2>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Item condition</span>
          <span className="text-2xl font-bold font-mono" style={{ color: condition >= 7 ? 'var(--green)' : condition >= 4 ? 'var(--yellow)' : 'var(--orange)' }}>
            {condition}/10
          </span>
        </div>
        <input type="range" min={1} max={10} value={condition} onChange={e => setCondition(Number(e.target.value))}
          className="w-full accent-teal-500 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Has scratches/dents', value: hasScratch, setter: setHasScratch },
            { label: 'Fully functional', value: isFunctional, setter: setIsFunctional },
            { label: 'All parts complete', value: hasCompleteParts, setter: setHasCompleteParts },
            { label: 'Has original box', value: hasOriginalBox, setter: setHasOriginalBox },
            { label: 'Still under warranty', value: hasWarranty, setter: setHasWarranty },
          ].map(item => (
            <label key={item.label} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <input type="checkbox" checked={item.value} onChange={e => item.setter(e.target.checked)} className="w-4 h-4 accent-teal-500" />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Photos */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4">Photos (Max 5)</h2>
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {photos.map((url, i) => (
              <div key={url} className="relative aspect-square rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 5 && (
          <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-colors"
            style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            {photoUploading
              ? <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--teal)' }} />
              : <>
                <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Click to add more photos</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{photos.length}/5 photos</p>
              </>
            }
          </label>
        )}
      </section>

      {error && (
        <p className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 flex gap-3" style={{ backgroundColor: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}
          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--teal)', color: 'white', opacity: submitting ? 0.7 : 1 }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </button>
      </div>
    </form>
  )
}
