import { prisma } from '@/lib/prisma'
import { Leaf, TreePine, Droplets, Recycle, TrendingUp, Users, Award } from 'lucide-react'
import { BADGES } from '@/lib/badges'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Impak Alam',
  description: 'See the real impact of KASSIM: CO₂ saved, trees equivalent, and water conserved from pre-loved item transactions in Malaysia.',
}

async function getImpactStats() {
  try {
    const [co2Result, soldCount, totalUsers, topSellers] = await Promise.all([
      prisma.listing.aggregate({
        where: { status: 'SOLD' },
        _sum: { co2Saved: true },
      }),
      prisma.listing.count({ where: { status: 'SOLD' } }),
      prisma.user.count(),
      prisma.listing.groupBy({
        by: ['sellerId'],
        where: { status: 'SOLD' },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ])

    const totalCO2 = co2Result._sum.co2Saved ?? 0
    const trees = Math.round(totalCO2 / 21)
    const water = Math.round(soldCount * 400)

    return { totalCO2, trees, water, soldCount, totalUsers, topSellers }
  } catch {
    return { totalCO2: 0, trees: 0, water: 0, soldCount: 0, totalUsers: 0, topSellers: [] }
  }
}

export default async function ImpactPage() {
  const stats = await getImpactStats()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
          <Leaf className="w-3.5 h-3.5" />
          KASSIM Real Impact
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          Together We{' '}
          <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Change Malaysia
          </span>
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Every transaction on KASSIM is a step towards a greener, more sustainable, and more responsible Malaysia.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
        {[
          {
            icon: Leaf,
            value: `${Math.round(stats.totalCO2).toLocaleString()}kg`,
            label: 'CO₂ Diselamatkan',
            sublabel: 'berbanding membeli baru',
            color: 'var(--green)',
            border: 'rgba(0,217,165,0.2)',
          },
          {
            icon: TreePine,
            value: stats.trees.toLocaleString(),
            label: 'Pokok Bersamaan',
            sublabel: 'CO₂ diserap setiap tahun',
            color: 'var(--teal)',
            border: 'rgba(20,184,166,0.2)',
          },
          {
            icon: Droplets,
            value: `${stats.water.toLocaleString()}L`,
            label: 'Air Dijimatkan',
            sublabel: 'daripada pengeluaran baharu',
            color: 'var(--blue)',
            border: 'rgba(79,140,255,0.2)',
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${stat.border}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon className="w-7 h-7" style={{ color: stat.color }} />
            </div>
            <p className="text-4xl font-bold font-mono mb-2" style={{ color: stat.color }}>{stat.value}</p>
            <p className="font-semibold mb-1">{stat.label}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{stat.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { label: 'Item Dijual', value: stats.soldCount.toLocaleString(), icon: Recycle, color: 'var(--teal)' },
          { label: 'Pengguna', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'var(--purple)' },
          { label: 'Platform Fee', value: '15%', icon: TrendingUp, color: 'var(--yellow)' },
          { label: 'Lencana', value: BADGES.length.toString(), icon: Award, color: 'var(--orange)' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-2 text-center">Lencana Impak</h2>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-secondary)' }}>
          Kumpul lencana dengan menjual, membeli, dan menyumbang kepada ekosistem pekeliling
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BADGES.map(badge => (
            <div key={badge.id} className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}40` }}>
                  {badge.emoji}
                </div>
                <div>
                  <p className="font-semibold">{badge.nameMs}</p>
                  <p className="text-xs" style={{ color: badge.color }}>{badge.name}</p>
                </div>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{badge.description}</p>
              <p className="text-xs mt-2 px-2 py-1 rounded-md inline-block" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                {badge.requirement}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CO2 Methodology */}
      <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-xl font-bold mb-4">Kaedah Pengiraan CO₂</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Kami menganggar CO₂ diselamatkan berdasarkan jejak karbon pengeluaran kategori barangan baru berbanding pembelian barangan terpakai:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { cat: 'Perabot', co2: '40kg' },
            { cat: 'Elektronik', co2: '15kg' },
            { cat: 'Fesyen', co2: '5kg' },
            { cat: 'Buku', co2: '2kg' },
            { cat: 'Sukan', co2: '8kg' },
            { cat: 'Dapur', co2: '10kg' },
            { cat: 'Lain-lain', co2: '12kg' },
          ].map(item => (
            <div key={item.cat} className="rounded-lg p-3 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <p className="text-sm font-medium">{item.cat}</p>
              <p className="text-lg font-bold font-mono mt-1" style={{ color: 'var(--green)' }}>{item.co2}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>per item</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
          * Pengiraan berasaskan kajian Life Cycle Assessment (LCA) untuk barangan pengguna. Angka adalah anggaran dan mungkin berbeza mengikut jenama, bahan, dan jarak penghantaran.
        </p>
      </div>
    </div>
  )
}
