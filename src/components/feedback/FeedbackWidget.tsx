'use client'

import { useState } from 'react'
import { MessageSquare, X, Send, CheckCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'bug' | 'suggestion' | 'other'>('bug')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const pathname = usePathname()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, page: pathname }),
      })
      setSent(true)
      setTimeout(() => { setSent(false); setOpen(false); setMessage('') }, 2500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button — small icon only */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-11 h-11 rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{ backgroundColor: 'var(--teal)', boxShadow: '0 4px 16px rgba(20,184,166,0.35)' }}
        aria-label="Beta feedback"
        title="Beta Feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Beta Feedback</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sent ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--green)' }} />
                <p className="font-semibold" style={{ color: 'var(--green)' }}>Thank you! Feedback received.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <div className="flex gap-2">
                    {(['bug', 'suggestion', 'other'] as const).map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setType(t)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                        style={{
                          backgroundColor: type === t ? 'rgba(20,184,166,0.15)' : 'var(--bg-elevated)',
                          border: `1px solid ${type === t ? 'rgba(20,184,166,0.5)' : 'var(--border)'}`,
                          color: type === t ? 'var(--teal)' : 'var(--text-secondary)',
                        }}
                      >
                        {t === 'bug' ? '🐛 Bug' : t === 'suggestion' ? '💡 Suggestion' : '💬 Other'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Describe your issue or suggestion..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Sending...' : 'Send Feedback'}
                </button>

                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Your feedback helps us improve KASSIM for all users.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
