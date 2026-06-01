'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ms">
      <body style={{ margin: 0, fontFamily: 'sans-serif', backgroundColor: '#0a0a0f', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <h1 style={{ fontSize: '64px', fontWeight: 800, color: '#ef4444', margin: '0 0 16px' }}>500</h1>
          <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Ralat Kritikal</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>Aplikasi mengalami masalah. Sila cuba lagi.</p>
          <button
            onClick={reset}
            style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#14b8a6', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '16px' }}
          >
            Cuba Lagi
          </button>
        </div>
      </body>
    </html>
  )
}
