import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tiada Sambungan | BALLOUT' }

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold mb-3">Tiada Sambungan Internet</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Semak sambungan internet anda dan cuba lagi. Halaman yang pernah dilawati tersedia secara offline.
        </p>
        <div className="flex flex-col gap-3">
          {/* Use a link to self — forces SW to retry the navigation */}
          <a
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal inline-block"
          >
            Cuba Lagi
          </a>
          <Link href="/listings" className="text-sm" style={{ color: 'var(--teal)' }}>
            Semak Lelongan
          </Link>
        </div>
      </div>
    </div>
  )
}
