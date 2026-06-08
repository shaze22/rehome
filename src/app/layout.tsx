import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BottomNav } from '@/components/layout/BottomNav'
import { Analytics } from '@vercel/analytics/next'
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget'
import { WhatsAppSupport } from '@/components/layout/WhatsAppSupport'
import { PWASetup } from '@/components/pwa/PWASetup'
import { createClient } from '@/lib/supabase/server'
import { PushPermission } from '@/components/pwa/PushPermission'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-mono',
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
const SITE_NAME = 'KASSIM'
const DEFAULT_OG = `${BASE_URL}/api/og`

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'KASSIM | Buy, Sell & Swap in Malaysia',
    template: '%s | KASSIM',
  },
  description: 'Buy and sell pre-loved items through 30-minute progressive auctions or swap directly. AI pricing. Secure escrow. Every deal saves the planet.',
  keywords: ['auction', 'swap', 'second hand', 'preloved', 'malaysia', 'kassim', 'flash auction', 'item swap'],
  authors: [{ name: 'KASSIM' }],
  creator: 'KASSIM',
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/logo-square.svg', type: 'image/svg+xml' },
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/logo-512.png',
    shortcut: '/logo-square.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'KASSIM',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    locale: 'en_MY',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: 'KASSIM | Buy, Sell & Swap in Malaysia',
    description: 'Buy and sell pre-loved items through progressive auctions or item swaps. AI pricing, secure escrow, save the planet.',
    images: [{ url: DEFAULT_OG, width: 1200, height: 630, alt: 'KASSIM Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KASSIM | Buy, Sell & Swap in Malaysia',
    description: 'Buy and sell pre-loved items through progressive auctions or item swaps.',
    images: [DEFAULT_OG],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // getSession reads from cookie locally — no network round-trip to Supabase
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`h-full ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/api/pwa-icon?size=192" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar />
          {/* pb-16 md:pb-0 gives clearance for mobile bottom nav */}
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <FeedbackWidget />
          <WhatsAppSupport />
          <Analytics />
          <PWASetup />
          {user && <PushPermission userId={user.id} />}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
