'use client'

import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function ListingError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--red)' }} />
      <h2 className="text-xl font-bold mb-2">Ralat Memuatkan Listing</h2>
      <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>{error.message}</p>
      <div className="flex gap-4 justify-center">
        <button onClick={reset} className="px-6 py-2.5 rounded-xl font-medium text-white gradient-teal">
          Cuba Lagi
        </button>
        <Link href="/listings" className="px-6 py-2.5 rounded-xl font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
          Kembali ke Lelongan
        </Link>
      </div>
    </div>
  )
}
