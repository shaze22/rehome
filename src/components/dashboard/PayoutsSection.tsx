'use client'

import { useState } from 'react'
import { Banknote, CheckCircle, Loader2, ArrowRight } from 'lucide-react'

export function PayoutsSection({ onboarded: initialOnboarded, hasAccount }: { onboarded: boolean; hasAccount: boolean }) {
  const [onboarded, setOnboarded] = useState(initialOnboarded)
  const [checking, setChecking] = useState(false)

  async function refresh() {
    setChecking(true)
    try {
      const r = await fetch('/api/connect/status')
      const d = await r.json()
      setOnboarded(!!d.onboarded)
    } catch { /* ignore */ }
    setChecking(false)
  }

  return (
    <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Banknote className="w-4 h-4" style={{ color: 'var(--teal)' }} />
        <h2 className="text-sm font-bold">Seller Payouts</h2>
        {onboarded && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)' }}>
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        )}
      </div>

      {onboarded ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Payouts are active. You are paid automatically to your bank when a buyer confirms they received the item.
          </p>
          <a href="/api/connect/login"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Manage payouts & bank details <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Set up payouts to receive your sales automatically. Stripe securely collects your bank details and handles the bank-in. Until you set this up, payouts are processed manually and may be slower.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/connect/onboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-white gradient-teal">
              {hasAccount ? 'Finish payout setup' : 'Set up payouts'} <ArrowRight className="w-3.5 h-3.5" />
            </a>
            {hasAccount && (
              <button onClick={refresh} disabled={checking}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                I&apos;ve finished — refresh status
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
