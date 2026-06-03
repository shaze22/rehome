'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Bell, Heart, Menu, X, Plus, LayoutDashboard, LogOut, UserCircle } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const avatarInitial = user?.user_metadata?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

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
          <div className="hidden md:flex items-center gap-5">
            <Link href="/listings" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Browse
            </Link>
            <Link href="/how-it-works" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              How It Works
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Watchlist */}
                <Link href="/dashboard/watchlist" className="flex items-center gap-1.5 text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  <Heart className="w-4 h-4" />
                </Link>

                {/* Notification bell */}
                <Link href="/dashboard" className="relative" style={{ color: 'var(--text-secondary)' }}>
                  <Bell className="w-4 h-4" />
                </Link>

                {/* Sell CTA */}
                <Link href="/sell" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white gradient-teal">
                  <Plus className="w-4 h-4" />
                  Sell
                </Link>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(p => !p)}
                    className="w-8 h-8 rounded-full gradient-teal flex items-center justify-center text-white text-sm font-bold"
                  >
                    {avatarInitial}
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-10 w-48 rounded-xl shadow-xl py-1.5 z-50" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold truncate">{user.user_metadata?.name ?? user.email}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                      <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
                        <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                      </Link>
                      <Link href="/dashboard/watchlist" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
                        <Heart className="w-3.5 h-3.5" /> Saved Items
                      </Link>
                      <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors" style={{ color: 'var(--red)' }}>
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  Sign In
                </Link>
                <Link href="/auth/register" className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-teal">
                  Register
                </Link>
              </div>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile: theme + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            <Link href="/listings" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
              Browse Listings
            </Link>
            <Link href="/how-it-works" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
              How It Works
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/dashboard/watchlist" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  <Heart className="w-4 h-4" /> Saved Items
                </Link>
                <Link href="/sell" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white gradient-teal" onClick={() => setMenuOpen(false)}>
                  <Plus className="w-4 h-4" /> List an Item
                </Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--red)' }}>
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  <UserCircle className="w-4 h-4" /> Sign In
                </Link>
                <Link href="/auth/register" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-white gradient-teal" onClick={() => setMenuOpen(false)}>
                  Register Free
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
