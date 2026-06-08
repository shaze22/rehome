'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('kassim_theme') as 'dark' | 'light' | null
    const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches
    const initial = saved ?? (systemLight ? 'light' : 'dark')
    setTheme(initial)
    document.documentElement.dataset.theme = initial === 'light' ? 'light' : ''
    setMounted(true)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('kassim_theme', next)
    document.documentElement.dataset.theme = next === 'light' ? 'light' : ''
  }

  if (!mounted) return (
    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
  )

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg transition-colors"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  )
}
