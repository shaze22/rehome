'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ── Service Worker Registration ───────────────────────────────────

function useServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
    }
  }, [])
}

// ── Install Prompt ────────────────────────────────────────────────

const DISMISS_KEY = 'kassim_install_dismissed'

export function PWASetup() {
  useServiceWorker()

  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    // Already dismissed
    if (localStorage.getItem(DISMISS_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show banner after 30 seconds
      setTimeout(() => setShowBanner(true), 30_000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    setShowBanner(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false)
    setDeferredPrompt(null)
  }

  if (installed || !showBanner || !deferredPrompt || pathname.startsWith('/auth')) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 rounded-2xl shadow-2xl p-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(20,184,166,0.4)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0 text-lg">
          ⚡
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Add KASSIM to your home screen</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Fast access, bid notifications, and offline use
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white gradient-teal"
            >
              <Download className="w-3.5 h-3.5" />
              Install
            </button>
            <button
              onClick={dismiss}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}
            >
              No thanks
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="flex-shrink-0 p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
