import Link from 'next/link'
import { Kassim } from '@/components/brand/Kassim'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <Kassim pose="head-shock" width={128} className="mx-auto mb-6" />
        <h1 className="text-6xl font-bold font-mono mb-4" style={{ color: 'var(--teal)' }}>404</h1>
        <h2 className="text-2xl font-bold mb-3">Even Kassim can&apos;t find this one</h2>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          He has kept everything for years, but this page is not in the treasure cave. It may have been moved or sold.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Back to Home
          </Link>
          <Link href="/listings" className="px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  )
}
