import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rehome-eta.vercel.app'
const SITE_NAME = 'BALLOUT'
const DEFAULT_OG = `${BASE_URL}/api/og`

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'BALLOUT — Platform Lelongan & Tukar Barang Malaysia',
    template: '%s | BALLOUT',
  },
  description: 'Jual beli barangan terpakai melalui lelongan progresif 30 minit atau tukar barang secara langsung. Harga AI dinamik. Escrow selamat. Setiap transaksi menyelamatkan alam.',
  keywords: ['lelongan', 'tukar barang', 'barangan terpakai', 'second hand', 'malaysia', 'ballout', 'lelong', 'swap'],
  authors: [{ name: 'BALLOUT' }],
  creator: 'BALLOUT',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ms_MY',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: 'BALLOUT — Platform Lelongan & Tukar Barang Malaysia',
    description: 'Jual beli barangan terpakai melalui lelongan progresif atau tukar barang. Harga AI, escrow selamat, jimat alam.',
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: 'BALLOUT Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BALLOUT — Platform Lelongan & Tukar Barang Malaysia',
    description: 'Jual beli barangan terpakai melalui lelongan progresif atau tukar barang.',
    images: [DEFAULT_OG],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ms" className="h-full">
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
