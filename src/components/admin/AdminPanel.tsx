'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Shield, Users, Package, TrendingUp, CheckCircle, XCircle, Clock, Eye
} from 'lucide-react'

interface PendingIC {
  id: string
  name: string | null
  email: string
  icPhoto: string | null
  icStatus: string
  createdAt: string
}

interface Listing {
  id: string
  title: string
  status: string
  currentBid: number
  createdAt: string
  seller: { name: string | null; icVerified: boolean }
  _count: { bids: number }
}

interface Stats {
  totalUsers: number
  activeListings: number
  soldListings: number
  totalVolume: number
}

interface Props {
  pendingICs: PendingIC[]
  recentListings: Listing[]
  stats: Stats
}

export function AdminPanel({ pendingICs, recentListings, stats }: Props) {
  const [verifying, setVerifying] = useState<string | null>(null)
  const [localPending, setLocalPending] = useState(pendingICs)

  async function handleVerify(userId: string, approve: boolean) {
    setVerifying(userId)
    try {
      const res = await fetch('/api/admin/verify-ic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve }),
      })
      if (res.ok) {
        setLocalPending(p => p.filter(u => u.id !== userId))
      }
    } finally {
      setVerifying(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Panel Admin</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jumlah Pengguna', value: stats.totalUsers, icon: Users, color: 'var(--blue)' },
          { label: 'Listing Aktif', value: stats.activeListings, icon: Package, color: 'var(--teal)' },
          { label: 'Item Dijual', value: stats.soldListings, icon: CheckCircle, color: 'var(--green)' },
          { label: 'Jumlah Volum', value: `RM ${stats.totalVolume.toFixed(0)}`, icon: TrendingUp, color: 'var(--purple)' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <stat.icon className="w-5 h-5 mb-2" style={{ color: stat.color }} />
            <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pending IC Verifications */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: 'var(--orange)' }} />
          Pengesahan IC Tertunda
          {localPending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono" style={{ backgroundColor: 'rgba(255,107,53,0.2)', color: 'var(--orange)' }}>
              {localPending.length}
            </span>
          )}
        </h2>

        {localPending.length === 0 ? (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--green)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Tiada pengesahan IC tertunda</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {localPending.map((user, i) => (
              <div
                key={user.id}
                className="flex items-center justify-between px-4 py-4"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderBottom: i < localPending.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div>
                  <p className="font-medium">{user.name ?? 'Tanpa Nama'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Dimohon: {new Date(user.createdAt).toLocaleDateString('ms-MY')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {user.icPhoto && (
                    <a href={user.icPhoto} target="_blank" rel="noreferrer" className="p-2 rounded-lg transition-colors" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                      <Eye className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleVerify(user.id, false)}
                    disabled={verifying === user.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}
                  >
                    <XCircle className="w-4 h-4" /> Tolak
                  </button>
                  <button
                    onClick={() => handleVerify(user.id, true)}
                    disabled={verifying === user.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}
                  >
                    <CheckCircle className="w-4 h-4" /> Sahkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Listings */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: 'var(--teal)' }} />
          Listing Terkini
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {recentListings.map((listing, i) => (
            <div
              key={listing.id}
              className="flex items-center justify-between px-4 py-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderBottom: i < recentListings.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/listings/${listing.id}`} className="text-sm font-medium hover:underline line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {listing.title}
                  </Link>
                  <span
                    className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs"
                    style={{
                      backgroundColor: listing.status === 'ACTIVE' ? 'rgba(0,217,165,0.1)' : 'rgba(148,163,184,0.1)',
                      color: listing.status === 'ACTIVE' ? 'var(--green)' : 'var(--text-muted)',
                    }}
                  >
                    {listing.status}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {listing.seller.name ?? 'Tanpa Nama'} · {listing._count.bids} bids · RM {listing.currentBid.toFixed(0)}
                </p>
              </div>
              <p className="text-xs flex-shrink-0 ml-4" style={{ color: 'var(--text-muted)' }}>
                {new Date(listing.createdAt).toLocaleDateString('ms-MY')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
