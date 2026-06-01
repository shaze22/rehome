'use client'

import { useState, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { locales, type Locale } from '@/i18n/routing'

const LOCALE_LABELS: Record<Locale, string> = {
  en: '🇬🇧 English',
  ms: '🇲🇾 Melayu',
  id: '🇮🇩 Indonesia',
  zh: '🇨🇳 中文',
  ar: '🇸🇦 العربية',
}

function getLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/kassim_locale=([^;]+)/)
  const val = match?.[1] ?? 'en'
  return (locales as readonly string[]).includes(val) ? (val as Locale) : 'en'
}

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<Locale>('en')

  useEffect(() => {
    setCurrent(getLocaleCookie())
  }, [])

  function switchLocale(locale: Locale) {
    setOpen(false)
    document.cookie = `kassim_locale=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
    window.location.reload()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
        style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
        aria-label="Switch language"
      >
        <Globe className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-xs">{LOCALE_LABELS[current]}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1.5 z-50 rounded-xl py-1 min-w-[160px] shadow-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {locales.map(locale => (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                className="w-full text-left px-4 py-2 text-sm transition-colors hover:opacity-80"
                style={{
                  color: locale === current ? 'var(--teal)' : 'var(--text-secondary)',
                  fontWeight: locale === current ? 600 : 400,
                }}
              >
                {LOCALE_LABELS[locale]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
