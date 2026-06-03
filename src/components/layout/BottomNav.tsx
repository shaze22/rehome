'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, LayoutDashboard, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function BottomNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around px-1 pt-2 pb-2">
        {/* Home */}
        <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: isActive('/') ? 'var(--teal)' : 'var(--text-muted)' }}>
          <Home className="w-5 h-5" />
          <span className="text-xs">Home</span>
        </Link>

        {/* Browse */}
        <Link href="/listings" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: isActive('/listings') ? 'var(--teal)' : 'var(--text-muted)' }}>
          <Search className="w-5 h-5" />
          <span className="text-xs">Browse</span>
        </Link>

        {/* Sell — center floating CTA */}
        <Link href="/sell" className="flex flex-col items-center gap-0.5" style={{ marginTop: '-20px' }}>
          <div className="w-13 h-13 w-[52px] h-[52px] rounded-full flex items-center justify-center gradient-teal shadow-lg" style={{ boxShadow: '0 4px 16px rgba(20,184,166,0.45)' }}>
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sell</span>
        </Link>

        {/* Saved — only when logged in */}
        {isLoggedIn ? (
          <Link href="/dashboard/watchlist" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: isActive('/dashboard/watchlist') ? 'var(--teal)' : 'var(--text-muted)' }}>
            <Heart className="w-5 h-5" />
            <span className="text-xs">Saved</span>
          </Link>
        ) : (
          <Link href="/auth/login" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: 'var(--text-muted)' }}>
            <Heart className="w-5 h-5" />
            <span className="text-xs">Saved</span>
          </Link>
        )}

        {/* Dashboard / Login */}
        {isLoggedIn ? (
          <Link href="/dashboard" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: isActive('/dashboard') ? 'var(--teal)' : 'var(--text-muted)' }}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">Account</span>
          </Link>
        ) : (
          <Link href="/auth/login" className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl" style={{ color: 'var(--text-muted)' }}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-xs">Login</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
