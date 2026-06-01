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

  const BASE = typeof window !== 'undefined' ? window.location.origin : 'https://rehome-eta.vercel.app'
  const referralLink = data.referralCode ? `${BASE}/r/${data.referralCode}` : null

  async function copyLink() {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!referralLink) return
    const text = `Jom jual/beli barang terpakai dekat BALLOUT! Daftar dapat RM5 credit percuma: ${referralLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5" style={{ color: 'var(--teal)' }} />
        <h2 className="text-xl font-bold">Program Referral</h2>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Credit balance + stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--teal)' }}>
              RM{data.creditBalance.toFixed(0)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Credit tersedia</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-center gap-1">
              <Users className="w-4 h-4" style={{ color: 'var(--purple)' }} />
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--purple)' }}>{data.referralCount}</p>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Kawan dijemput</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <p className="text-2xl font-bold font-mono" style={{ color: 'var(--green)' }}>
              RM{data.totalRewards.toFixed(0)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Total diterima</p>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--teal)' }}>Cara kerja</p>
          <ol className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>1. Kongsi link unik anda kepada kawan</li>
            <li>2. Kawan daftar menggunakan link anda</li>
            <li>3. Anda + kawan masing-masing dapat <strong style={{ color: 'var(--teal)' }}>RM5 credit</strong></li>
            <li>4. Credit boleh digunakan sebagai diskaun semasa bid lelongan Flash</li>
          </ol>
        </div>

        {/* Referral link */}
        {referralLink && (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Link referral anda</p>
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
                {copied ? 'Disalin!' : 'Salin'}
              </button>
            </div>

            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white text-sm transition-all hover:scale-[1.02]"
              style={{ backgroundColor: '#25D366' }}
            >
              <Share2 className="w-4 h-4" />
              Kongsi via WhatsApp
            </button>
          </div>
        )}

        {data.creditBalance > 0 && (
          <div className="mt-4 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308' }}>
            💡 Anda ada <strong>RM{data.creditBalance.toFixed(0)} credit</strong>. Credit akan ditolak secara automatik semasa checkout lelongan Flash.
          </div>
        )}
      </div>
    </div>
  )
}
