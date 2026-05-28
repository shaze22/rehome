import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = {
  title: 'REHOME — Platform Ekonomi Pekeliling Malaysia',
  description: 'Jual beli barangan terpakai melalui lelongan progresif. Jimat wang, selamatkan alam.',
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
