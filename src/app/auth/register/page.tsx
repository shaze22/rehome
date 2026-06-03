'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react'

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!agreed) { setError('You must agree to the Terms & Privacy Policy.'); return }
    setLoading(true)
    const { data, error: signUpError } = await createClient().auth.signUp({
      email,
      password,
      options: { data: { name, phone: phone || null, state: state || null } },
    })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // Save phone + state to profile if provided (for verified sessions only)
    if (data.session && (phone || state)) {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone || undefined, state: state || undefined }),
      }).catch(() => {})
    }

    setLoading(false)
    setSuccess(true)
  }

  async function handleGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(0,217,165,0.1)' }}>
            <CheckCircle className="w-8 h-8" style={{ color: 'var(--green)' }} />
          </div>
          <h1 className="text-2xl font-bold mb-3">Check Your Email!</h1>
          <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
            We&apos;ve sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <Link href="/auth/login" className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal inline-block">
            Back to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="KASSIM" height={40} style={{ height: '40px', width: 'auto', margin: '0 auto 16px' }} />
          <h1 className="text-2xl font-bold mb-2">Join KASSIM</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start your circular economy journey today</p>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-medium mb-6 transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Register with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid var(--border)' }} />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>or</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Phone Number <span style={{ color: 'var(--text-muted)' }}>(for delivery)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0123456789"
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>

            {/* State */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Your State <span style={{ color: 'var(--text-muted)' }}>(for delivery estimate)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <select value={state} onChange={e => setState(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 rounded-xl text-sm outline-none appearance-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: state ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  <option value="">Select your state</option>
                  {MALAYSIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-teal flex-shrink-0" />
              <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                I agree to the{' '}
                <a href="/terms" target="_blank" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>Privacy Policy</a>
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white gradient-teal disabled:opacity-60 transition-all hover:scale-105 active:scale-95">
              {loading ? 'Registering...' : 'Register Now'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--teal)' }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
