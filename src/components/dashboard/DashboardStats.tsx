import { Star, Package, Gavel, TrendingUp, Shield, Info } from 'lucide-react'

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
  const icLabels: Record<string, string> = { VERIFIED: 'IC Verified', PENDING: 'Under Review', UNVERIFIED: 'Not Verified' }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* KASSIM Score */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4" style={{ color: 'var(--yellow)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>KASSIM Score</span>
          <div className="relative group ml-auto cursor-pointer">
            <Info className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <div className="absolute right-0 top-5 w-56 text-xs rounded-lg p-2.5 z-10 hidden group-hover:block" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              Starts at 50. Increases with successful transactions, good reviews, and fast response. Decreases if disputes are raised against you.
            </div>
          </div>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: scoreColor }}>{rehomeScore}</p>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="h-full rounded-full" style={{ width: `${rehomeScore}%`, backgroundColor: scoreColor }} />
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>out of 100</p>
      </div>

      {/* Listings */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" style={{ color: 'var(--teal)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Listings</span>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: 'var(--teal)' }}>{totalListings}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{activeListings} active</p>
      </div>

      {/* Won Auctions */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Gavel className="w-4 h-4" style={{ color: 'var(--orange)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Won</span>
        </div>
        <p className="text-3xl font-bold font-mono" style={{ color: 'var(--orange)' }}>{wonAuctions}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>auctions</p>
      </div>

      {/* Earnings */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Earnings</span>
        </div>
        <p className="text-2xl font-bold font-mono" style={{ color: 'var(--green)' }}>RM {totalEarnings.toFixed(0)}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>after platform fee</p>
      </div>

      {/* IC Status */}
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" style={{ color: icColors[icStatus] ?? 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>IC Status</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: icColors[icStatus] ?? 'var(--text-muted)' }}>
          {icLabels[icStatus] ?? icStatus}
        </p>
        {icStatus === 'UNVERIFIED' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Verify to get trust badge</p>
        )}
        {icStatus === 'PENDING' && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Usually 1-2 business days</p>
        )}
      </div>
    </div>
  )
}
