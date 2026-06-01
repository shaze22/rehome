import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { SwapListingCard } from '@/components/listings/SwapListingCard'
import { WasteCounter } from '@/components/home/WasteCounter'
import { HowItWorks } from '@/components/home/HowItWorks'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { ArrowRight, Leaf, Shield, Zap, TrendingUp, ArrowLeftRight } from 'lucide-react'

async function getFeaturedListings() {
  try {
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', mode: 'FLASH', OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      include: { seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } }, _count: { select: { bids: true, offers: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getFeaturedSwapListings() {
  try {
    return await prisma.listing.findMany({
      where: { status: 'ACTIVE', mode: 'SWAP', endsAt: { gt: new Date() } },
      include: { seller: { select: { name: true, rehomeScore: true, icVerified: true, swapScore: true, swapVerified: true } }, _count: { select: { bids: true, offers: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    })
  } catch {
    return []
  }
}

async function getStats() {
  try {
    const [sold, swapDone, co2Result] = await Promise.all([
      prisma.listing.count({ where: { status: 'SOLD' } }),
      prisma.swapTransaction.count({ where: { escrowStatus: 'COMPLETED' } }),
      prisma.listing.aggregate({ where: { status: 'SOLD' }, _sum: { co2Saved: true } }),
    ])
    return { sold, swapDone, co2: co2Result._sum.co2Saved ?? 0 }
  } catch {
    return { sold: 0, swapDone: 0, co2: 0 }
  }
}

export default async function HomePage() {
  const [flashListings, swapListings, stats] = await Promise.all([
    getFeaturedListings(),
    getFeaturedSwapListings(),
    getStats(),
  ])
  const { sold: totalTransactions, swapDone, co2: totalCO2 } = stats

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
              <Leaf className="w-3.5 h-3.5" />
              Platform Lelongan Barangan Terpakai #1 Malaysia
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
              { label: 'Item Dijual', value: totalTransactions > 0 ? `${totalTransactions.toLocaleString()}+` : 'Jadi Yang Pertama!', icon: TrendingUp, color: 'var(--teal)' },
              { label: 'CO₂ Diselamatkan', value: `${Math.round(totalCO2)}kg`, icon: Leaf, color: 'var(--green)' },
              { label: 'Pertukaran Selesai', value: swapDone > 0 ? `${swapDone}+` : 'Mula Tukar!', icon: ArrowLeftRight, color: 'var(--purple)' },
              { label: 'Masa Purata Jual', value: '< 30 min', icon: Zap, color: 'var(--yellow)' },
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

      {/* Flash Listings */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: 'var(--orange)' }} />
                Lelong Pantas
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Bida sekarang, menang dalam 30 minit</p>
            </div>
            <Link href="/listings?mode=flash" className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: 'var(--teal)' }}>
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {flashListings.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Zap className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium mb-2">Belum ada lelongan aktif</p>
              <Link href="/sell" className="text-sm px-4 py-2 rounded-lg font-medium text-white gradient-teal inline-block mt-2">Mula Jual</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {flashListings.map(listing => (
                <ListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Swap Listings */}
      <section className="py-8 px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" style={{ color: '#16a34a' }} />
                Tukar Barang
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Pertukaran barang terpakai tanpa wang</p>
            </div>
            <Link href="/listings?mode=swap" className="flex items-center gap-1.5 text-sm font-medium hover:underline" style={{ color: '#16a34a' }}>
              Lihat Semua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {swapListings.length === 0 ? (
            <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
              <ArrowLeftRight className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium mb-2">Belum ada tawaran tukar barang</p>
              <Link href="/sell" className="text-sm px-4 py-2 rounded-lg font-medium text-white inline-block mt-2" style={{ backgroundColor: '#16a34a' }}>Tawar Barang</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {swapListings.map(listing => (
                <SwapListingCard key={listing.id} listing={listing as any} />
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
