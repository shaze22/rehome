import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'No Connection | KASSIM' }

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold mb-3">No Internet Connection</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Check your internet connection and try again. Previously visited pages are available offline.
        </p>
        <div className="flex flex-col gap-3">
          {/* Use a link to self — forces SW to retry the navigation */}
          <a
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal inline-block"
          >
            Try Again
          </a>
          <Link href="/listings" className="text-sm" style={{ color: 'var(--teal)' }}>
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  )
}
