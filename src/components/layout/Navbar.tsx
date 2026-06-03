'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Heart, User as UserIcon, Menu, X, Plus, LayoutDashboard } from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="KASSIM" height={36} style={{ height: '36px', width: 'auto' }} />
            <p className="text-xs hidden md:block leading-none" style={{ color: 'var(--text-muted)' }}>Bid Fast. Swap Smart.</p>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Browse
            </Link>
            <Link href="/jual" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Sell
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-1.5 text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/dashboard/watchlist" className="flex items-center gap-1.5 text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  <Heart className="w-4 h-4" />
                  Saved
                </Link>
                <Link
                  href="/sell"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white gradient-teal"
                >
                  <Plus className="w-4 h-4" />
                  Sell
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  <UserIcon className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-teal"
                >
                  Register
                </Link>
              </div>
            )}
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          {/* Language Switcher + Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/listings" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
              Browse
            </Link>
            <Link href="/jual" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
              Sell
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={handleSignOut} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  Sign In
                </Link>
                <Link href="/auth/register" className="block px-3 py-2 rounded-lg text-sm font-medium text-white gradient-teal" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
