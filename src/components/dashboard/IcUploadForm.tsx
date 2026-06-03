'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Upload, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface Props {
  userId: string
  currentStatus: string
  currentIcPhoto: string | null
}

const STATUS_INFO = {
  UNVERIFIED: {
    icon: AlertCircle,
    color: 'var(--red)',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    title: 'IC Not Verified',
    desc: 'Upload your IC photo to get a "Verified" badge and increase buyer trust.',
  },
  PENDING: {
    icon: Clock,
    color: 'var(--yellow)',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.3)',
    title: 'Under Review',
    desc: 'Your IC is being reviewed by the KASSIM team. This process takes 1-2 business days.',
  },
  VERIFIED: {
    icon: CheckCircle,
    color: 'var(--green)',
    bg: 'rgba(0,217,165,0.08)',
    border: 'rgba(0,217,165,0.3)',
    title: 'IC Verified',
    desc: 'Congratulations! Your account has been verified. Buyers will be more confident bidding on your listings.',
  },
}

export function IcUploadForm({ userId, currentStatus, currentIcPhoto }: Props) {
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(currentIcPhoto ?? '')
  const [localStatus, setLocalStatus] = useState(currentStatus)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const info = STATUS_INFO[localStatus as keyof typeof STATUS_INFO] ?? STATUS_INFO.UNVERIFIED

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `ic/${userId}/${Date.now()}.${ext}`
    const { data, error: uploadError } = await supabase.storage.from('rehome-photos').upload(path, file)
    if (uploadError) { setError('Failed to upload photo. Please try again.'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('rehome-photos').getPublicUrl(data.path)
    setPhotoUrl(publicUrl)
    setUploading(false)
  }

  async function handleSubmit() {
    if (!photoUrl) { setError('Please upload your IC photo first.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/user/ic-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icPhotoUrl: photoUrl }),
      })
      if (res.ok) {
        setLocalStatus('PENDING')
        setSuccess(true)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Submission error.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: info.bg, border: `1px solid ${info.border}` }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${info.color}20` }}>
          <info.icon className="w-5 h-5" style={{ color: info.color }} />
        </div>
        <div>
          <h3 className="font-semibold">{info.title}</h3>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{info.desc}</p>
        </div>
      </div>

      {localStatus === 'UNVERIFIED' && (
        <div className="space-y-3">
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer" style={{ border: `2px dashed ${info.border}`, backgroundColor: 'var(--bg-card)' }}>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: info.color }} />
            ) : photoUrl ? (
              <>
                <CheckCircle className="w-6 h-6" style={{ color: 'var(--green)' }} />
                <span className="text-xs" style={{ color: 'var(--green)' }}>Photo uploaded successfully</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to change</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Upload IC photo (front)</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>JPG or PNG, maximum 5MB</span>
              </>
            )}
          </label>

          {error && (
            <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !photoUrl}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))' }}
          >
            {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending...</span> : 'Submit for Verification'}
          </button>
        </div>
      )}

      {localStatus === 'PENDING' && currentIcPhoto && (
        <div className="mt-2">
          <img src={currentIcPhoto} alt="Your IC" className="w-full max-w-sm rounded-lg object-cover" style={{ border: '1px solid var(--border)' }} />
        </div>
      )}
    </div>
  )
}
