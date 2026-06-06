'use client'

import { useEffect, useState } from 'react'
import { Gift, Copy, Check, Share2, Users } from 'lucide-react'

interface ReferralData {
  referralCode: string | null
  creditBalance: number
  referralCount: number
  totalRewards: number
}

export function ReferralSection() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return null

  const referralLink = data.referralCode ? `https://kassim.app/r/${data.referralCode}` : null

  async function copyLink() {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!referralLink) return
    const text = `Join me on KASSIM! Sign up and get RM5 credit free: ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5" style={{ color: 'var(--teal)' }} />
        <h2 className="text-xl font-bold">Referral Program</h2>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Credit balance + stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--teal)' }}>
              RM{data.creditBalance.toFixed(0)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Available credit</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-4 h-4" style={{ color: 'var(--purple)' }} />
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--purple)' }}>{data.referralCount}</p>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Friends invited</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--green)' }}>
              RM{data.totalRewards.toFixed(0)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Total earned</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--teal)' }}>How it works</p>
          <ol className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>1. Share your unique link with friends</li>
            <li>2. Friend signs up using your link</li>
            <li>3. You + friend each get <strong style={{ color: 'var(--teal)' }}>RM5 credit</strong></li>
            <li>4. Credit can be used as a discount when bidding on Flash auctions</li>
          </ol>
        </div>

        {/* Referral link */}
        {referralLink && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Your referral link</p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-xl text-xs font-mono truncate"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {referralLink}
              </div>
              <button
                onClick={copyLink}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors"
                style={{ backgroundColor: copied ? 'rgba(0,217,165,0.15)' : 'var(--bg-elevated)', color: copied ? 'var(--teal)' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white text-sm transition-all hover:scale-[1.02]"
              style={{ backgroundColor: '#25D366' }}
            >
              <Share2 className="w-4 h-4" />
              Share on WhatsApp
            </button>
          </div>
        )}

        {data.creditBalance > 0 && (
          <div className="mt-4 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308' }}>
            💡 You have <strong>RM{data.creditBalance.toFixed(0)} credit</strong>. Credit will be automatically applied at Flash auction checkout.
          </div>
        )}
      </div>
    </div>
  )
}
