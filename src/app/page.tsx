import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { WasteCounter } from '@/components/home/WasteCounter'
import { HowItWorks } from '@/components/home/HowItWorks'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { ArrowRight, Leaf, Shield, Zap, TrendingUp } from 'lucide-react'

async function getFeaturedListings() {
  try {
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', endsAt: { gt: new Date() } },
      include: { seller: { select: { name: true, rehomeScore: true, icVerified: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    })
  } catch {
    return []
  }
}

async function getTotalCO2() {
  try {
    const result = await prisma.listing.aggregate({
      where: { status: 'SOLD' },
      _sum: { co2Saved: true },
    })
    return result._sum.co2Saved ?? 0
  } catch {
    return 0
  }
}

async function getTotalTransactions() {
  try {
    return await prisma.listing.count({ where: { status: 'SOLD' } })
  } catch {
    return 0
  }
}

export default async function HomePage() {
  const [listings, totalCO2, totalTransactions] = await Promise.all([
    getFeaturedListings(),
    getTotalCO2(),
    getTotalTransactions(),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
              <Leaf className="w-3.5 h-3.5" />
              Platform Ekonomi Pekeliling #1 Malaysia
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Jual, Beli &{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Selamatkan Alam
              </span>
            </h1>
            <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Lelongan progresif barangan terpakai. Harga AI dinamik. Escrow selamat. Setiap transaksi mengurangkan sisa dan menyelamatkan karbon.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/listings"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105"
              >
                Semak Imbas Lelongan
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sell"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
              >
                Mula Jual
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[
              { label: 'Item Dijual', value: `${totalTransactions.toLocaleString()}+`, icon: TrendingUp, color: 'var(--teal)' },
              { label: 'CO₂ Diselamatkan', value: `${Math.round(totalCO2)}kg`, icon: Leaf, color: 'var(--green)' },
              { label: 'Pembeli Aktif', value: '2,400+', icon: Shield, color: 'var(--blue)' },
              { label: 'Masa Purata Jual', value: '4.2 jam', icon: Zap, color: 'var(--purple)' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4 text-center card-hover" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waste Counter */}
      <WasteCounter totalCO2={totalCO2} totalTransactions={totalTransactions} />

      {/* Category Grid */}
      <CategoryGrid />

      {/* Featured Listings */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold">Lelongan Aktif</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Item dalam lelongan sekarang</p>
            </div>
            <Link
              href="/listings"
              className="flex items-center gap-1.5 text-sm font-medium hover:underline"
              style={{ color: 'var(--teal)' }}
            >
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Leaf className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--teal)' }} />
              <p className="text-lg font-medium mb-2">Belum ada lelongan aktif</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Jadilah yang pertama menjual barangan anda!</p>
              <Link href="/sell" className="px-6 py-2.5 rounded-lg font-medium text-white gradient-teal">
                Mula Jual Sekarang
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />
    </div>
  )
}
