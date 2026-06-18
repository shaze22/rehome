'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, X } from 'lucide-react'

export function DeleteAccountButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmation === 'DELETE'

  async function handleDelete() {
    if (!confirmed) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }

      // Signed-out — redirect to home
      router.push('/?account=deleted')
      router.refresh()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setOpen(false)
    setConfirmation('')
    setError(null)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        style={{ color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}
      >
        <Trash2 className="w-4 h-4" />
        Delete Account
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.4)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.12)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--red)' }} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Delete Account</h2>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>This action cannot be undone</p>
                </div>
              </div>
              <button onClick={handleClose} disabled={loading} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning list */}
            <div className="rounded-xl p-4 space-y-2 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="font-semibold" style={{ color: 'var(--red)' }}>The following will be permanently deleted:</p>
              <ul className="space-y-1 text-xs list-disc list-inside" style={{ color: 'var(--text-secondary)' }}>
                <li>Your profile, phone number, and address</li>
                <li>All your messages and saved items</li>
                <li>Push notification subscriptions</li>
                <li>Your login access to KASSIM</li>
              </ul>
              <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                Transaction records, bids, and reviews are kept for legal purposes.
              </p>
            </div>

            {/* Escrow warning */}
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Deletion is blocked if you have an active escrow or ongoing swap.
            </p>

            {/* Confirmation input */}
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm-delete">
                Type <span className="font-mono font-bold" style={{ color: 'var(--red)' }}>DELETE</span> to confirm
              </label>
              <input
                id="confirm-delete"
                type="text"
                value={confirmation}
                onChange={e => setConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${confirmed ? 'rgba(239,68,68,0.6)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}
                disabled={loading}
                autoComplete="off"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)' }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!confirmed || loading}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: 'var(--red)' }}
              >
                {loading ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
