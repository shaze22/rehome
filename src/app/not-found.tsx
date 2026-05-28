import Link from 'next/link'
import { Recycle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl gradient-teal flex items-center justify-center mx-auto mb-6">
          <Recycle className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-6xl font-bold font-mono mb-4" style={{ color: 'var(--teal)' }}>404</h1>
        <h2 className="text-2xl font-bold mb-3">Halaman Tidak Dijumpai</h2>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
          Halaman yang anda cari tidak wujud atau telah dialihkan.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Kembali ke Laman Utama
          </Link>
          <Link href="/listings" className="px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Semak Imbas Lelongan
          </Link>
        </div>
      </div>
    </div>
  )
}
