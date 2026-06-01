import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Analytics } from '@vercel/analytics/next'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { PWASetup } from '@/components/pwa/PWASetup'
import { createClient } from '@/lib/supabase/server'
import { PushPermission } from '@/components/pwa/PushPermission'

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
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BALLOUT',
  },
  formatDetection: { telephone: false },
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="ms" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/api/pwa-icon?size=192" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <FeedbackWidget />
        <Analytics />
        <PWASetup />
        {user && <PushPermission userId={user.id} />}
      </body>
    </html>
  )
}
