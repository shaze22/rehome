'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Upload, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { MALAYSIAN_STATES } from '@/lib/delivery'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { value: 'FURNITURE', label: 'Perabot' },
  { value: 'ELECTRONICS', label: 'Elektronik' },
  { value: 'FASHION', label: 'Fesyen' },
  { value: 'BOOKS', label: 'Buku' },
  { value: 'SPORTS', label: 'Sukan' },
  { value: 'KITCHEN', label: 'Dapur' },
  { value: 'OTHERS', label: 'Lain-lain' },
]

const DURATIONS = [
  { value: 1, label: '1 Jam' },
  { value: 3, label: '3 Jam' },
  { value: 6, label: '6 Jam' },
  { value: 12, label: '12 Jam' },
  { value: 24, label: '1 Hari' },
  { value: 48, label: '2 Hari' },
  { value: 72, label: '3 Hari' },
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

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('ELECTRONICS')
  const [condition, setCondition] = useState(7)
  const [originalPrice, setOriginalPrice] = useState('')
  const [startingBid, setStartingBid] = useState('0')
  const [state, setState] = useState('')
  const [durationHours, setDurationHours] = useState(24)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [hasScratch, setHasScratch] = useState(false)
  const [isFunctional, setIsFunctional] = useState(true)
  const [hasCompleteParts, setHasCompleteParts] = useState(true)
  const [hasOriginalBox, setHasOriginalBox] = useState(false)
  const [hasWarranty, setHasWarranty] = useState(false)

  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function getAISuggestion() {
    if (!category || !originalPrice || !state) {
      setAiError('Sila isi kategori, harga asal dan negeri dahulu.')
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
      if (!res.ok) { setAiError(data.error ?? 'AI gagal.'); return }
      setAiSuggestion(data)
      setStartingBid(String(data.suggested_min))
    } catch {
      setAiError('Gagal menghubungi AI. Sila cuba lagi.')
    } finally {
      setAiLoading(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (photos.length + files.length > 5) {
      alert('Maksimum 5 foto sahaja.')
      return
    }
    setPhotoUploading(true)
    const supabase = createClient()
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `listings/${userId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('rehome-photos').upload(path, file)
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
        setPhotos(prev => [...prev, publicUrl])
      }
    }
    setPhotoUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!state) { setSubmitError('Sila pilih negeri.'); return }
    if (photos.length === 0) { setSubmitError('Sila muat naik sekurang-kurangnya 1 foto.'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, category, condition,
          originalPrice: Number(originalPrice),
          startingBid: Number(startingBid),
          photos, state, durationHours,
          hasScratch, isFunctional, hasCompleteParts, hasOriginalBox, hasWarranty,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? 'Gagal mencipta listing.'); return }
      router.push(`/listings/${data.listing.id}`)
    } catch {
      setSubmitError('Ralat rangkaian. Sila cuba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-5">Maklumat Asas</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tajuk Item *</label>
            <input
              type="text" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="cth: iPhone 13 Pro 256GB Space Gray"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Penerangan *</label>
            <textarea
              required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Terangkan keadaan, aksesori disertakan, sebab menjual..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Kategori *</label>
              <select
                required value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Negeri *</label>
              <select
                required value={state} onChange={e => setState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                <option value="">Pilih Negeri</option>
                {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Harga Asal (RM) *</label>
              <input
                type="number" required min={0} step={1} value={originalPrice} onChange={e => setOriginalPrice(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tempoh Lelongan *</label>
              <select
                value={durationHours} onChange={e => setDurationHours(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={inputStyle}
              >
                {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Condition */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-2">Skor Keadaan</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>1 = Sangat lusuh, 10 = Seperti baru</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Keadaan</span>
            <span className="text-2xl font-bold font-mono" style={{ color: condition >= 7 ? 'var(--green)' : condition >= 4 ? 'var(--yellow)' : 'var(--orange)' }}>
              {condition}/10
            </span>
          </div>
          <input
            type="range" min={1} max={10} value={condition} onChange={e => setCondition(Number(e.target.value))}
            className="w-full accent-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Ada calar?', value: hasScratch, setter: setHasScratch, reverse: true },
            { label: 'Masih berfungsi?', value: isFunctional, setter: setIsFunctional, reverse: false },
            { label: 'Bahagian lengkap?', value: hasCompleteParts, setter: setHasCompleteParts, reverse: false },
            { label: 'Ada kotak asal?', value: hasOriginalBox, setter: setHasOriginalBox, reverse: false },
            { label: 'Dalam waranti?', value: hasWarranty, setter: setHasWarranty, reverse: false },
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

      {/* AI Pricing */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="w-5 h-5" style={{ color: 'var(--purple)' }} />
          <h2 className="text-lg font-semibold">Cadangan Harga AI</h2>
        </div>

        <button
          type="button"
          onClick={getAISuggestion}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium mb-4 transition-all hover:scale-105"
          style={{ border: '1px solid rgba(168,85,247,0.5)', color: 'var(--purple)', backgroundColor: 'rgba(168,85,247,0.08)' }}
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {aiLoading ? 'AI sedang menganalisis...' : 'Dapatkan Cadangan AI'}
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
                { label: 'Rendah', value: aiSuggestion.low, color: 'var(--yellow)' },
                { label: 'Wajar', value: aiSuggestion.fair, color: 'var(--purple)' },
                { label: 'Tinggi', value: aiSuggestion.high, color: 'var(--green)' },
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
          </div>
        )}

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Tawaran Permulaan (RM, 0 = tiada harga minimum) *
          </label>
          <input
            type="number" required min={0} step={1} value={startingBid} onChange={e => setStartingBid(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none font-mono"
            style={inputStyle}
          />
        </div>
      </section>

      {/* Photos */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-lg font-semibold mb-4">Foto Item (Maks 5)</h2>

        <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl cursor-pointer transition-colors" style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
          <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={photos.length >= 5} />
          {photoUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--teal)' }} />
          ) : (
            <>
              <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Klik untuk muat naik foto</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{photos.length}/5 foto</p>
            </>
          )}
        </label>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {photos.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: 'white' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submit */}
      {submitError && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 rounded-xl font-semibold text-white gradient-teal disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-95 text-lg"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Mencipta Listing...
          </span>
        ) : (
          'Siarkan Lelongan'
        )}
      </button>
    </form>
  )
}
