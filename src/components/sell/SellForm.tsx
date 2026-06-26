'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Upload, Loader2, AlertCircle, Info, Zap, ArrowLeftRight, Sparkles, RotateCcw, ChevronDown } from 'lucide-react'
import { MALAYSIAN_STATES } from '@/lib/delivery'
import { dimsFor } from '@/lib/parcelDimensions'
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

interface AISuggestion {
  low: number
  fair: number
  high: number
  suggested_min: number
  suggested_max: number
  reasoning: string
}

interface Props {
  userId: string
}

export function SellForm({ userId }: Props) {
  const router = useRouter()

  const [mode, setMode] = useState<'FLASH' | 'SWAP'>('FLASH')
  const [showModeInfo, setShowModeInfo] = useState(false)

  // Common fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('ELECTRONICS')
  const [condition, setCondition] = useState(7)
  const [originalPrice, setOriginalPrice] = useState('')
  const [state, setState] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [hasScratch, setHasScratch] = useState(false)
  const [isFunctional, setIsFunctional] = useState(true)
  const [hasCompleteParts, setHasCompleteParts] = useState(true)
  const [hasOriginalBox, setHasOriginalBox] = useState(false)
  const [hasWarranty, setHasWarranty] = useState(false)

  // Common
  const [weightKg, setWeightKg] = useState('0.5')
  const [lengthCm, setLengthCm] = useState(String(dimsFor('ELECTRONICS').l))
  const [widthCm, setWidthCm] = useState(String(dimsFor('ELECTRONICS').w))
  const [heightCm, setHeightCm] = useState(String(dimsFor('ELECTRONICS').h))
  const [dimsTouched, setDimsTouched] = useState(false)
  // Pre-fill dimensions from the category default until the seller edits them.
  useEffect(() => {
    if (dimsTouched) return
    const d = dimsFor(category)
    setLengthCm(String(d.l)); setWidthCm(String(d.w)); setHeightCm(String(d.h))
  }, [category, dimsTouched])

  // Flash-only fields
  const [startingBid, setStartingBid] = useState('0')

  // Swap-only fields
  const [swapWantedItem, setSwapWantedItem] = useState('')
  const [swapWantedCategory, setSwapWantedCategory] = useState('')
  const [swapOpenOffers, setSwapOpenOffers] = useState(false)
  const [swapAcceptCash, setSwapAcceptCash] = useState(true)
  const [swapMinCashTopup, setSwapMinCashTopup] = useState('')
  const [swapAiLoading, setSwapAiLoading] = useState(false)
  const [swapAiSuggestion, setSwapAiSuggestion] = useState<{ suggestedItems: string[]; suggestedCategories: string[]; valueSuggestion: string; reasoning: string; confidence: string } | null>(null)

  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  // Photo AI analysis state
  const [photoAnalysing, setPhotoAnalysing] = useState(false)
  const [photoAnalysisError, setPhotoAnalysisError] = useState('')
  const [photoAnalysisDone, setPhotoAnalysisDone] = useState(false)
  // Track which fields were AI-populated (so we can show a badge)
  const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set())

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function markAiFilled(fields: string[]) {
    setAiFilledFields(prev => new Set([...prev, ...fields]))
  }

  function clearAiFilled(field: string) {
    setAiFilledFields(prev => { const s = new Set(prev); s.delete(field); return s })
  }

  // Accept optional URLs so we can call immediately after upload (before state update settles)
  async function analysePhotos(urlsToAnalyse?: string[]) {
    const urls = urlsToAnalyse ?? photos
    if (urls.length === 0) { setPhotoAnalysisError('Please upload at least 1 photo first.'); return }
    setPhotoAnalysing(true)
    setPhotoAnalysisError('')
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrls: urls, category }),
      })
      const data = await res.json()
      if (!res.ok) { setPhotoAnalysisError(data.error ?? 'AI analysis failed.'); return }
      if (!data.isPhotoValid) { setPhotoAnalysisError(`Photo unclear: ${data.invalidReason ?? 'Please upload a clearer photo.'}`); return }
      const filled: string[] = []
      if (data.title) { setTitle(data.title); filled.push('title') }
      if (data.description) { setDescription(data.description); filled.push('description') }
      if (data.conditionScore) { setCondition(data.conditionScore); filled.push('condition') }
      if (data.category) { setCategory(data.category); filled.push('category') }
      markAiFilled(filled)
      setPhotoAnalysisDone(true)
    } catch {
      setPhotoAnalysisError('Failed to contact AI. Please try again.')
    } finally {
      setPhotoAnalysing(false)
    }
  }

  async function getSwapAISuggestion() {
    if (!title || !category || !aiSuggestion) {
      setSwapAiSuggestion(null)
      return
    }
    setSwapAiLoading(true)
    try {
      const res = await fetch('/api/gemini/swap-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, condition, estimatedValue: aiSuggestion.fair }),
      })
      const data = await res.json()
      if (!res.ok) return
      setSwapAiSuggestion(data)
      if (data.suggestedItems?.[0] && !swapWantedItem) setSwapWantedItem(data.suggestedItems[0])
      if (data.suggestedCategories?.[0] && !swapWantedCategory) setSwapWantedCategory(data.suggestedCategories[0])
    } finally {
      setSwapAiLoading(false)
    }
  }

  async function getAISuggestion() {
    if (!category || !originalPrice || !state) {
      setAiError('Please fill in the category, original price, and state first.')
      return
    }
    setAiLoading(true)
    setAiError('')
    setAiSuggestion(null)
    try {
      const res = await fetch('/api/gemini/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, condition, originalPrice: Number(originalPrice), state }),
      })
      const data = await res.json()
      if (!res.ok) { setAiError(data.error ?? 'AI failed.'); return }
      setAiSuggestion(data)
    } catch {
      setAiError('Failed to contact AI. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 5) { alert('Maximum 5 photos only.'); return }
    for (const file of files) {
      if (!file.type.startsWith('image/')) { setSubmitError('Only image files are allowed.'); return }
    }
    setPhotoUploading(true)
    setSubmitError('')
    const supabase = createClient()
    const newUrls: string[] = []

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
            canvas.width = width
            canvas.height = height
            canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Compression failed')), 'image/jpeg', 0.82)
          }
          img.onerror = reject
          img.src = objectUrl
        })
      } catch { blob = file }

      const path = `listings/${userId}/${Date.now()}.jpg`
      const { data, error } = await supabase.storage.from('rehome-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) {
        setSubmitError(`Upload failed: ${error.message}`)
        setPhotoUploading(false)
        return
      }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
        newUrls.push(publicUrl)
      }
    }

    const allPhotos = [...photos, ...newUrls]
    setPhotos(allPhotos)
    setPhotoUploading(false)

    // Auto-trigger AI analysis on first upload
    if (newUrls.length > 0 && photos.length === 0) {
      await analysePhotos(allPhotos)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!state) { setSubmitError('Please select a state.'); return }
    if (photos.length === 0) { setSubmitError('Please upload at least 1 photo.'); return }
    if (mode === 'SWAP' && !swapOpenOffers && !swapWantedItem && !swapWantedCategory) {
      setSubmitError('Please specify an item or category you want, or enable "Accept any offer".')
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        mode,
        title, description, category, condition,
        originalPrice: Number(originalPrice),
        weightKg: Number(weightKg) || 1,
        lengthCm: Number(lengthCm) || undefined,
        widthCm: Number(widthCm) || undefined,
        heightCm: Number(heightCm) || undefined,
        photos, state,
        hasScratch, isFunctional, hasCompleteParts, hasOriginalBox, hasWarranty,
      }
      if (mode === 'FLASH') {
        payload.startingBid = Number(startingBid)
      } else {
        payload.swapWantedItem = swapWantedItem || undefined
        payload.swapWantedCategory = swapWantedCategory || undefined
        payload.swapOpenOffers = swapOpenOffers
        payload.swapAcceptCash = swapAcceptCash
        payload.swapMinCashTopup = swapMinCashTopup ? Number(swapMinCashTopup) : undefined
      }

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to create listing.'); return }
      router.push(`/listings/${data.listing.id}?new=1`)
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  function AiBadge() {
    return (
      <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: 'rgba(20,184,166,0.12)', color: 'var(--teal)', border: '1px solid rgba(20,184,166,0.25)' }}>
        <Sparkles className="w-2.5 h-2.5" />AI
      </span>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── 1. Mode Toggle ── */}
      <section className="rounded-2xl p-2" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setMode('FLASH')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all"
            style={mode === 'FLASH' ? { backgroundColor: 'var(--orange)', color: 'white' } : { color: 'var(--text-secondary)' }}
          >
            <Zap className="w-4 h-4" />
            Flash Bid
          </button>
          <button
            type="button"
            onClick={() => setMode('SWAP')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all"
            style={mode === 'SWAP' ? { backgroundColor: '#16a34a', color: 'white' } : { color: 'var(--text-secondary)' }}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap Bid
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2 pb-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {mode === 'FLASH' ? '30-minute auction after first bid. Get cash.' : '3-day offer period. Swap items, cash, or a combination.'}
          </p>
          <button
            type="button"
            onClick={() => setShowModeInfo(v => !v)}
            className="flex items-center gap-0.5 text-xs font-medium"
            style={{ color: 'var(--teal)' }}
          >
            What&apos;s the difference?
            <ChevronDown className={`w-3 h-3 transition-transform ${showModeInfo ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {showModeInfo && (
          <div className="mt-2 rounded-xl p-4 grid grid-cols-2 gap-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--orange)' }}>Flash Bid</p>
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <li>Get cash in your account</li>
                <li>30-min timer starts on first bid</li>
                <li>Starting bid always RM0</li>
                <li>15% platform fee on sale</li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: '#16a34a' }}>Swap Bid</p>
              <ul className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <li>Trade items, cash, or both</li>
                <li>Listing active for 72 hours</li>
                <li>You review and accept offers</li>
                <li>0% platform fee, completely free</li>
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* ── 2. Photos + Auto AI Analysis ── */}
      <section id="photos-section" className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Item Photos</h2>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{photos.length}/5</span>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Upload photos first — AI will automatically fill in your title, description and condition.
        </p>

        {/* Upload zone */}
        {photos.length < 5 && (
          <label
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-all"
            style={{
              border: `2px dashed ${photos.length === 0 ? 'var(--teal)' : 'var(--border)'}`,
              backgroundColor: photos.length === 0 ? 'rgba(20,184,166,0.04)' : 'var(--bg-elevated)',
            }}
          >
            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={photoUploading || photoAnalysing} />
            {photoUploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--teal)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--teal)' }}>Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8" style={{ color: photos.length === 0 ? 'var(--teal)' : 'var(--text-muted)' }} />
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: photos.length === 0 ? 'var(--teal)' : 'var(--text-secondary)' }}>
                    {photos.length === 0 ? 'Upload photos to start' : 'Add more photos'}
                  </p>
                  {photos.length === 0 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      AI will generate your listing automatically
                    </p>
                  )}
                </div>
              </>
            )}
          </label>
        )}

        {/* Thumbnails */}
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    const next = photos.filter((_, j) => j !== i)
                    setPhotos(next)
                    if (next.length === 0) { setPhotoAnalysisDone(false); setAiFilledFields(new Set()) }
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'rgba(239,68,68,0.85)', color: 'white' }}
                >
                  ×
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs px-1 rounded font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: 'white' }}>Cover</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI analysis status */}
        {photoAnalysing && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.25)' }}>
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--teal)' }} />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--teal)' }}>AI is analysing your photos...</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Generating title, description and condition score</p>
            </div>
          </div>
        )}

        {photoAnalysisDone && !photoAnalysing && (
          <div className="mt-4 flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--teal)' }}>
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">AI filled your listing details</span>
              <span style={{ color: 'var(--text-muted)' }}>— review and edit below</span>
            </div>
            <button
              type="button"
              onClick={() => analysePhotos()}
              disabled={photoAnalysing}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <RotateCcw className="w-3 h-3" />
              Re-analyse
            </button>
          </div>
        )}

        {photoAnalysisError && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mt-3" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {photoAnalysisError}
          </div>
        )}

        {/* Manual trigger if photos exist but analysis not done */}
        {photos.length > 0 && !photoAnalysisDone && !photoAnalysing && (
          <button
            type="button"
            onClick={() => analysePhotos()}
            className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
            style={{ border: '1px solid rgba(20,184,166,0.5)', color: 'var(--teal)', backgroundColor: 'rgba(20,184,166,0.08)' }}
          >
            <Bot className="w-4 h-4" />
            Auto-fill from photos (AI)
          </button>
        )}
      </section>

      {/* ── 3. Listing Details ── */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-5">Listing Details</h2>

        <div className="space-y-4">
          <div>
            <label className="flex items-center text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Item Title *
              {aiFilledFields.has('title') && <AiBadge />}
            </label>
            <input
              type="text" required value={title}
              onChange={e => { setTitle(e.target.value); clearAiFilled('title') }}
              placeholder={photos.length === 0 ? 'Upload photos first — AI will generate this' : 'e.g. iPhone 13 Pro 256GB Space Gray'}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ ...inputStyle, borderColor: aiFilledFields.has('title') ? 'rgba(20,184,166,0.4)' : undefined }}
            />
          </div>

          <div>
            <label className="flex items-center text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Description *
              {aiFilledFields.has('description') && <AiBadge />}
            </label>
            <textarea
              required value={description}
              onChange={e => { setDescription(e.target.value); clearAiFilled('description') }}
              placeholder={photos.length === 0 ? 'Upload photos first — AI will generate this' : 'Describe condition, accessories, reason for selling...'}
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ ...inputStyle, borderColor: aiFilledFields.has('description') ? 'rgba(20,184,166,0.4)' : undefined }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category *</label>
              <select
                required value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>State *</label>
              <select
                required value={state} onChange={e => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Select State</option>
                {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Estimated Weight (kg) — for delivery quote
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0.1} max={30} step={0.1}
                value={weightKg} onChange={e => setWeightKg(e.target.value)}
                className="flex-1 accent-teal-400"
              />
              <span className="text-sm font-mono font-bold w-14 text-right" style={{ color: 'var(--teal)' }}>
                {Number(weightKg).toFixed(1)} kg
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: 'Phone', kg: '0.2' },
                { label: 'Clothes', kg: '0.5' },
                { label: 'Book', kg: '0.5' },
                { label: 'Laptop', kg: '2' },
                { label: 'Chair', kg: '8' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setWeightKg(p.kg)}
                  className="px-2.5 py-1 rounded-lg text-xs transition-all"
                  style={{
                    border: '1px solid var(--border)',
                    backgroundColor: weightKg === p.kg ? 'rgba(20,184,166,0.12)' : 'var(--bg-elevated)',
                    color: weightKg === p.kg ? 'var(--teal)' : 'var(--text-muted)',
                  }}
                >
                  {p.label} ({p.kg}kg)
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Parcel size (cm) — for accurate delivery
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([['Length', lengthCm, setLengthCm], ['Width', widthCm, setWidthCm], ['Height', heightCm, setHeightCm]] as [string, string, (v: string) => void][]).map(([lbl, val, set]) => (
                <div key={lbl}>
                  <span className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{lbl}</span>
                  <input
                    type="number" inputMode="numeric" min={1} max={200} value={val}
                    onChange={e => { set(e.target.value); setDimsTouched(true) }}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Auto-filled from category. Adjust for bulky or oversized items — couriers charge by parcel size as well as weight.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Original Price (RM) *</label>
            <input
              type="number" required min={0} step={0.01} value={originalPrice} onChange={e => setOriginalPrice(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>What you originally paid — needed for AI price estimate.</p>
          </div>

          <div className="px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: mode === 'SWAP' ? 'rgba(22,163,74,0.08)' : 'rgba(20,184,166,0.08)', border: `1px solid ${mode === 'SWAP' ? 'rgba(22,163,74,0.2)' : 'rgba(20,184,166,0.2)'}`, color: 'var(--text-secondary)' }}>
            {mode === 'FLASH'
              ? 'Listing stays active until the first bidder. After that, auction lasts only 30 minutes.'
              : 'Listing stays active for 3 days (72 hours). All offers accepted within this period.'}
          </div>
        </div>
      </section>

      {/* ── 4. Condition ── */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold">Condition Score</h2>
          {aiFilledFields.has('condition') && <AiBadge />}
        </div>
        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>1 = Very worn, 10 = Like new</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Condition</span>
            <span className="text-2xl font-bold font-mono" style={{ color: condition >= 7 ? 'var(--green)' : condition >= 4 ? 'var(--yellow)' : 'var(--orange)' }}>
              {condition}/10
            </span>
          </div>
          <input
            type="range" min={1} max={10} value={condition}
            onChange={e => { setCondition(Number(e.target.value)); clearAiFilled('condition') }}
            className="w-full accent-teal-500"
          />
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Make sure your checkboxes match your score above.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Has scratches?', value: hasScratch, setter: setHasScratch },
            { label: 'Still functional?', value: isFunctional, setter: setIsFunctional },
            { label: 'Complete parts?', value: hasCompleteParts, setter: setHasCompleteParts },
            { label: 'Original box?', value: hasOriginalBox, setter: setHasOriginalBox },
            { label: 'Under warranty?', value: hasWarranty, setter: setHasWarranty },
          ].map(item => (
            <label key={item.label} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <input
                type="checkbox"
                checked={item.value}
                onChange={e => item.setter(e.target.checked)}
                className="w-4 h-4 accent-teal-500"
              />
              <span className="text-sm">{item.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── 5. Swap Settings ── */}
      {mode === 'SWAP' && (
        <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight className="w-5 h-5" style={{ color: '#16a34a' }} />
            <h2 className="text-lg font-semibold">Swap Settings</h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-5 text-xs" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)', color: 'var(--text-secondary)' }}>
            <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#16a34a' }} />
            Your listing stays active for <strong className="mx-1">72 hours</strong> from when you publish. After that it expires automatically.
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={getSwapAISuggestion}
              disabled={swapAiLoading || !title}
              title={!title ? 'Fill in your item title first' : undefined}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: '1px solid rgba(22,163,74,0.5)', color: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)' }}
            >
              {swapAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
              {swapAiLoading ? 'AI is finding suggestions...' : '✨ AI Suggest Swap Items'}
            </button>

            {swapAiSuggestion && (
              <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
                <p className="text-xs font-medium" style={{ color: '#16a34a' }}>AI Suggestion ({swapAiSuggestion.confidence} confidence):</p>
                <div className="flex flex-wrap gap-2">
                  {swapAiSuggestion.suggestedItems.map((item, i) => (
                    <button key={i} type="button" onClick={() => setSwapWantedItem(item)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105"
                      style={{ backgroundColor: swapWantedItem === item ? '#16a34a' : 'var(--bg-elevated)', color: swapWantedItem === item ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {item}
                    </button>
                  ))}
                </div>
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{swapAiSuggestion.reasoning}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>What are you looking for? (optional)</label>
              <input
                type="text" value={swapWantedItem} onChange={e => setSwapWantedItem(e.target.value)}
                placeholder="e.g. MacBook Laptop, Bicycle, DSLR Camera..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category you are looking for (optional)</label>
              <select
                value={swapWantedCategory} onChange={e => setSwapWantedCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <input type="checkbox" checked={swapOpenOffers} onChange={e => setSwapOpenOffers(e.target.checked)} className="w-4 h-4 accent-green-600" />
                <div>
                  <p className="text-sm font-medium">Accept any offer</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Open to all offer types even if category differs</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <input type="checkbox" checked={swapAcceptCash} onChange={e => setSwapAcceptCash(e.target.checked)} className="w-4 h-4 accent-green-600" />
                <div>
                  <p className="text-sm font-medium">Accept cash offers</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Allow cash-only offers as a last resort</p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Minimum cash top-up (RM) for swap + cash (optional)</label>
              <input
                type="number" min={0} step={0.01} value={swapMinCashTopup} onChange={e => setSwapMinCashTopup(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>If swap + cash, the bidder must add at least this amount in RM.</p>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. AI Price Suggestion ── */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-5 h-5" style={{ color: 'var(--purple)' }} />
          <h2 className="text-lg font-semibold">
            {mode === 'FLASH' ? 'Estimated Selling Price' : 'AI Value Estimate'}
          </h2>
        </div>
        {mode === 'FLASH' && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            See what your item may realistically sell for — for your reference only. Starting bid is always RM0.
          </p>
        )}

        <button
          type="button"
          onClick={getAISuggestion}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-4 transition-all hover:scale-105"
          style={{ border: '1px solid rgba(168,85,247,0.5)', color: 'var(--purple)', backgroundColor: 'rgba(168,85,247,0.08)' }}
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {aiLoading ? 'AI is analysing...' : mode === 'FLASH' ? 'See Estimated Selling Price' : 'Estimate Item Value'}
        </button>

        {aiError && (
          <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {aiError}
          </div>
        )}

        {aiSuggestion && (
          <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Low', value: aiSuggestion.low, color: 'var(--yellow)' },
                { label: 'Fair', value: aiSuggestion.fair, color: 'var(--purple)' },
                { label: 'High', value: aiSuggestion.high, color: 'var(--green)' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                  <p className="font-bold font-mono" style={{ color: s.color }}>RM {s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ backgroundColor: 'rgba(168,85,247,0.08)' }}>
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--purple)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>{aiSuggestion.reasoning}</p>
            </div>
            {mode === 'SWAP' && (
              <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
                This fair value will be displayed to bidders as a reference.
              </p>
            )}
          </div>
        )}

        {mode === 'FLASH' && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(255,107,53,0.08)', border: '1px solid rgba(255,107,53,0.25)' }}>
            <span className="text-2xl font-black font-mono" style={{ color: '#ff6b35' }}>RM 0</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#ff6b35' }}>Starting bid is always RM0</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Anyone who bids wins — even at RM0 if they are the only bidder.</p>
            </div>
          </div>
        )}
      </section>

      {submitError && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
        </div>
      )}

      <button
        type={photos.length === 0 ? 'button' : 'submit'}
        disabled={submitting}
        onClick={photos.length === 0 ? () => {
          document.getElementById('photos-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } : undefined}
        className="w-full py-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-95 text-lg disabled:opacity-60"
        style={{ backgroundColor: mode === 'SWAP' ? '#16a34a' : 'var(--orange)', opacity: !submitting && photos.length === 0 ? 0.6 : undefined }}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            {mode === 'FLASH' ? 'Creating Auction...' : 'Publishing Swap...'}
          </span>
        ) : photos.length === 0 ? 'Upload photos to continue' : (
          mode === 'FLASH' ? 'Publish Flash Bid' : 'Publish Swap Bid'
        )}
      </button>
    </form>
  )
}
