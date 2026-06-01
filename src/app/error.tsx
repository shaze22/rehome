'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <AlertTriangle className="w-10 h-10" style={{ color: 'var(--red)' }} />
        </div>
        <h1 className="text-4xl font-bold font-mono mb-4" style={{ color: 'var(--red)' }}>500</h1>
        <h2 className="text-2xl font-bold mb-3">Ralat Berlaku</h2>
        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
          Sesuatu tidak berjalan dengan baik. Kami sudah dimaklumkan dan sedang menyelesaikannya.
        </p>
        {error.digest && (
          <p className="text-xs font-mono mb-6" style={{ color: 'var(--text-muted)' }}>ID: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={reset} className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Cuba Lagi
          </button>
          <Link href="/" className="px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Laman Utama
          </Link>
        </div>
      </div>
    </div>
  )
}
