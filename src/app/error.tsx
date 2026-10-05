'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Kassim } from '@/components/brand/Kassim'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Kassim pose="head-sigh" width={112} className="mx-auto mb-6" />
        <h1 className="text-4xl font-bold font-mono mb-4" style={{ color: 'var(--red)' }}>500</h1>
        <h2 className="text-2xl font-bold mb-3">Something Went Wrong</h2>
        <p className="mb-2" style={{ color: 'var(--text-secondary)' }}>
          Something didn&apos;t go right. We&apos;ve been notified and are working to fix it.
        </p>
        {error.digest && (
          <p className="text-xs font-mono mb-6" style={{ color: 'var(--text-muted)' }}>ID: {error.digest}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={reset} className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Try Again
          </button>
          <Link href="/" className="px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
