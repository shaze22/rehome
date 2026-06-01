'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Recycle, Heart, User as UserIcon, Menu, X, Plus, LayoutDashboard } from 'lucide-react'

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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-teal">
              <Recycle className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--teal)' }}>BALLOUT</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/listings" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Semak Imbas
            </Link>
            <Link href="/jual" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Jual Barangan
            </Link>
            <Link href="/impact" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
              Impak
            </Link>
            {user ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="flex items-center gap-1.5 text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/dashboard/watchlist" className="flex items-center gap-1.5 text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  <Heart className="w-4 h-4" />
                  Simpanan
                </Link>
                <Link
                  href="/sell"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white gradient-teal"
                >
                  <Plus className="w-4 h-4" />
                  Jual
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  <UserIcon className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                  Log Masuk
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-teal"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
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
              Semak Imbas
            </Link>
            <Link href="/jual" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
              Jual Barangan
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <button onClick={handleSignOut} className="w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Log Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }} onClick={() => setMenuOpen(false)}>
                  Log Masuk
                </Link>
                <Link href="/auth/register" className="block px-3 py-2 rounded-lg text-sm font-medium text-white gradient-teal" onClick={() => setMenuOpen(false)}>
                  Daftar
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
