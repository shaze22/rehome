import { Star, Package, Gavel, TrendingUp, Shield, AlertCircle } from 'lucide-react'

interface Props {
  rehomeScore: number
  totalListings: number
  activeListings: number
  totalEarnings: number
  wonAuctions: number
  icStatus: string
}

export function DashboardStats({ rehomeScore, totalListings, activeListings, totalEarnings, wonAuctions, icStatus }: Props) {
  const scoreColor = rehomeScore >= 70 ? 'var(--green)' : rehomeScore >= 40 ? 'var(--yellow)' : 'var(--red)'
  const icColors: Record<string, string> = { VERIFIED: 'var(--green)', PENDING: 'var(--yellow)', UNVERIFIED: 'var(--red)' }
  const icLabels: Record<string, string> = { VERIFIED: 'IC Disahkan', PENDING: 'Sedang Disemak', UNVERIFIED: 'Belum Disahkan' }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Rehome Score */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4" style={{ color: 'var(--yellow)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Rehome Score</span>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: scoreColor }}>{rehomeScore}</p>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="h-full rounded-full" style={{ width: `${rehomeScore}%`, backgroundColor: scoreColor }} />
        </div>
      </div>

      {/* Listings */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" style={{ color: 'var(--teal)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Listing</span>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: 'var(--teal)' }}>{totalListings}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{activeListings} aktif</p>
      </div>

      {/* Won Auctions */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Gavel className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Menang</span>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: 'var(--orange)' }}>{wonAuctions}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>lelongan</p>
      </div>

      {/* Earnings */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pendapatan</span>
        </div>
        <p className="text-2xl font-bold font-mono" style={{ color: 'var(--green)' }}>RM {totalEarnings.toFixed(0)}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>selepas fi</p>
      </div>

      {/* IC Status */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" style={{ color: icColors[icStatus] ?? 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Status IC</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: icColors[icStatus] ?? 'var(--text-muted)' }}>
          {icLabels[icStatus] ?? icStatus}
        </p>
        {icStatus === 'UNVERIFIED' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sahkan untuk dipercayai</p>
        )}
      </div>
    </div>
  )
}
