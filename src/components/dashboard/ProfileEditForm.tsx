'use client'

import { useState } from 'react'
import { User, Phone, MapPin, Save, CheckCircle } from 'lucide-react'

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

interface Props {
  initialName: string
  initialPhone: string
  initialState: string
  missingPhone: boolean
}

export function ProfileEditForm({ initialName, initialPhone, initialState, missingPhone }: Props) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [state, setState] = useState(initialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(missingPhone)

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, state }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      if (missingPhone) setOpen(false)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: missingPhone && open ? '1px solid rgba(251,191,36,0.4)' : '1px solid var(--border)' }}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" style={{ color: 'var(--teal)' }} />
          <span className="font-semibold text-sm">My Profile</span>
          {missingPhone && open === false && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: 'var(--yellow)' }}>
              ⚠ Phone required for delivery
            </span>
          )}
          {!missingPhone && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{initialPhone}</span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'var(--border)' }}>
          {missingPhone && (
            <p className="text-xs pt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(251,191,36,0.08)', color: 'var(--yellow)', border: '1px solid rgba(251,191,36,0.2)' }}>
              ⚠ Your phone number is required for courier delivery booking. Please add it before placing a bid.
            </p>
          )}

          {/* Name */}
          <div className="pt-2">
            <label className="text-xs font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <User className="w-3 h-3" /> Display name
            </label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Phone className="w-3 h-3" /> Phone number <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0123456789"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used for courier delivery booking only</p>
          </div>

          {/* State */}
          <div>
            <label className="text-xs font-medium block mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <MapPin className="w-3 h-3" /> Your state
            </label>
            <select
              value={state} onChange={e => setState(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="">Select state</option>
              {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !phone.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white gradient-teal disabled:opacity-50 transition-all"
          >
            {saved
              ? <><CheckCircle className="w-4 h-4" /> Saved!</>
              : saving
              ? 'Saving...'
              : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>
        </div>
      )}
    </div>
  )
}
