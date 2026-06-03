import Link from 'next/link'
import { Leaf, Shield, Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="KASSIM" height={32} style={{ height: '32px', width: 'auto' }} />
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Malaysia&apos;s best place to buy, sell &amp; swap pre-loved items — safe, simple, and money in your pocket.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--green)' }}>
                <Leaf className="w-3.5 h-3.5" />
                Eco-friendly
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--teal)' }}>
                <Shield className="w-3.5 h-3.5" />
                Safe & Secure
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--blue)' }}>
                <Zap className="w-3.5 h-3.5" />
                Real-time
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Platform</h4>
            <ul className="space-y-2">
              {[
                { href: '/listings', label: 'Browse' },
                { href: '/sell', label: 'Sell' },
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/impact', label: 'Our Impact' },
                { href: '/how-it-works', label: 'How It Works' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Account</h4>
            <ul className="space-y-2">
              {[
                { href: '/auth/login', label: 'Sign In' },
                { href: '/auth/register', label: 'Register' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2026 KASSIM. All rights reserved. Built for a greener Malaysia.
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link href="/terms" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Terms</Link>
            <Link href="/privacy" className="hover:underline" style={{ color: 'var(--text-muted)' }}>Privacy</Link>
            <span>15% platform fee · Secure escrow</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
