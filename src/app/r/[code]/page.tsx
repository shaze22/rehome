import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Gift, Shield, Zap, ArrowLeftRight, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Jemputan Khas | BALLOUT' }

const FEATURES = [
  { icon: Zap, label: 'Lelong Pantas 30 min', color: 'var(--teal)' },
  { icon: ArrowLeftRight, label: 'Tukar Barang Percuma', color: '#16a34a' },
  { icon: Shield, label: 'Escrow Selamat', color: 'var(--purple)' },
  { icon: CheckCircle, label: 'Penjual IC Disahkan', color: 'var(--orange)' },
]

export default async function ReferralLandingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params

  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { name: true },
  })

  if (!referrer) notFound()

  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rehome-eta.vercel.app'
  const setCookieUrl = `${BASE}/api/referral/set-cookie?code=${code}`

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Top gradient band */}
          <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--teal), var(--green))' }} />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <span className="text-2xl font-bold" style={{ color: 'var(--teal)' }}>⚡ BALLOUT</span>
            </div>

            {/* Invite message */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full gradient-teal flex items-center justify-center text-3xl mx-auto mb-4">
                🎁
              </div>
              <h1 className="text-2xl font-bold mb-2">
                <span style={{ color: 'var(--teal)' }}>{referrer.name ?? 'Kawan anda'}</span> ajak anda ke BALLOUT!
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Platform lelongan dan tukar barang #1 Malaysia
              </p>
            </div>

            {/* Credit reward */}
            <div className="rounded-xl p-5 mb-6 text-center" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(22,163,74,0.1))', border: '1px solid rgba(20,184,166,0.3)' }}>
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Hadiah selamat datang</p>
              <p className="text-4xl font-bold font-mono" style={{ color: 'var(--teal)' }}>RM5</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                Credit percuma bila daftar sekarang
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {FEATURES.map(f => (
                <div key={f.label} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <f.icon className="w-4 h-4 flex-shrink-0" style={{ color: f.color }} />
                  {f.label}
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={setCookieUrl}
              className="block w-full text-center px-6 py-4 rounded-xl font-bold text-white gradient-teal glow-teal text-lg transition-all hover:scale-105"
            >
              Daftar & Dapat RM5 Credit
            </a>

            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
              Sudah ada akaun?{' '}
              <Link href="/auth/login" className="hover:underline" style={{ color: 'var(--teal)' }}>
                Log masuk
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Credit RM5 akan dikreditkan selepas pendaftaran. Guna semasa bid lelongan Flash.
        </p>
      </div>
    </div>
  )
}
