'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield, Users, Package, TrendingUp, CheckCircle, XCircle, Eye,
  MessageCircle, Star, Gavel, DollarSign, ArrowLeftRight, AlertCircle, Loader2, ClipboardList
} from 'lucide-react'

interface PendingIC {
  id: string; name: string | null; email: string
  icPhoto: string | null; icPhotoUrl: string | null; icStatus: string; createdAt: string
}

interface Listing {
  id: string; title: string; status: string; currentBid: number; createdAt: string; isFeatured: boolean
  featuredUntil: string | null
  seller: { name: string | null; icVerified: boolean }; _count: { bids: number }
}

interface RecentUser {
  id: string; name: string | null; email: string; role: string
  rehomeScore: number; createdAt: string
}

interface Stats {
  totalUsers: number; activeListings: number; soldListings: number; endedListings: number
  totalVolume: number; totalRevenue: number; totalBids: number; totalMessages: number; avgRating: number
}

interface DisputedSwap {
  id: string
  listingId: string
  disputeReason: string | null
  createdAt: string
  updatedAt: string
  listing: { id: string; title: string }
  seller: { id: string; name: string | null; email: string }
  buyer: { id: string; name: string | null; email: string }
}

interface BetaUser {
  id: string; name: string | null; email: string; role: string
  rehomeScore: number; swapScore: number | null; icVerified: boolean
  createdAt: string; _count: { listings: number }
}

interface PendingPayout {
  id: string
  listingId: string
  sellerPayout: number
  amount: number
  courierName: string | null
  updatedAt: string
  listing: { id: string; title: string }
  seller: { id: string; name: string | null; email: string }
  buyer: { id: string; name: string | null; email: string }
}

interface Props {
  pendingICs: PendingIC[]
  recentListings: Listing[]
  recentUsers: RecentUser[]
  allUsers: BetaUser[]
  disputedSwaps: DisputedSwap[]
  pendingPayouts: PendingPayout[]
  stats: Stats
}

function FeaturedListingRow({ listing, isLast }: { listing: Listing; isLast: boolean }) {
  const [featured, setFeatured] = useState(listing.isFeatured)
  const [featuredUntil, setFeaturedUntil] = useState(listing.featuredUntil)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/feature-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, featured: !featured }),
      })
      if (res.ok) {
        const data = await res.json()
        setFeatured(data.isFeatured)
        setFeaturedUntil(data.featuredUntil ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  const expiryLabel = featuredUntil
    ? `Expires: ${new Date(featuredUntil).toLocaleDateString('en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : null

  return (
    <div className="flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--bg-card)', borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/listings/${listing.id}`} className="text-sm font-medium hover:underline line-clamp-1">
            {listing.title}
          </Link>
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs"
            style={{ backgroundColor: listing.status === 'ACTIVE' ? 'rgba(0,217,165,0.1)' : 'rgba(148,163,184,0.1)', color: listing.status === 'ACTIVE' ? 'var(--green)' : 'var(--text-muted)' }}>
            {listing.status}
          </span>
          {featured && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: '#ef4444', color: 'white' }}>⚡ FEATURED</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {listing.seller.name ?? 'Anonymous'} · {listing._count.bids} bids · RM {listing.currentBid.toFixed(0)}
          </p>
          {expiryLabel && (
            <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>{expiryLabel}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {new Date(listing.createdAt).toLocaleDateString('en-MY')}
        </p>
        <button
          onClick={toggle}
          disabled={loading}
          className="text-xs px-2 py-1 rounded font-medium transition-colors"
          style={{
            backgroundColor: featured ? 'rgba(239,68,68,0.15)' : 'rgba(20,184,166,0.1)',
            color: featured ? '#ef4444' : 'var(--teal)',
            border: `1px solid ${featured ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.3)'}`,
          }}
        >
          {loading ? '...' : featured ? 'Unfeature' : '⚡ Feature'}
        </button>
      </div>
    </div>
  )
}

function PayoutRow({ payout, onPaid }: { payout: PendingPayout; onPaid: (id: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  async function markPaid() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/mark-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: payout.id, note: note || undefined }),
      })
      if (res.ok) onPaid(payout.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link href={`/listings/${payout.listingId}`} className="text-sm font-medium hover:underline line-clamp-1">
            {payout.listing.title}
          </Link>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Seller: <strong>{payout.seller.name ?? 'Unknown'}</strong> ({payout.seller.email})
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Buyer paid: RM {payout.amount.toFixed(2)} · Payout to seller: <strong style={{ color: 'var(--teal)' }}>RM {payout.sellerPayout.toFixed(2)}</strong>
            {payout.courierName && ` · ${payout.courierName}`}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Released: {new Date(payout.updatedAt).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {showNote && (
            <input
              className="mt-2 w-full text-xs px-2 py-1 rounded"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Bank transfer ref / note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => setShowNote(v => !v)}
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            {showNote ? 'Hide' : '+ Note'}
          </button>
          <button
            onClick={markPaid}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ backgroundColor: 'rgba(0,217,165,0.15)', color: 'var(--teal)', border: '1px solid rgba(0,217,165,0.3)' }}
          >
            {loading ? '...' : 'Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AuditEntry {
  id: string; adminId: string; action: string
  targetId: string | null; targetType: string | null
  details: Record<string, unknown> | null; createdAt: string
}

export function AdminPanel({ pendingICs, recentListings, recentUsers, allUsers, disputedSwaps, pendingPayouts, stats }: Props) {
  const [verifying, setVerifying] = useState<string | null>(null)
  const [localPending, setLocalPending] = useState(pendingICs)
  const [localDisputes, setLocalDisputes] = useState(disputedSwaps)
  const [localPayouts, setLocalPayouts] = useState(pendingPayouts)
  const [resolving, setResolving] = useState<string | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditLoaded, setAuditLoaded] = useState(false)

  async function loadAuditLog() {
    if (auditLoaded) return
    setAuditLoading(true)
    try {
      const res = await fetch('/api/admin/audit-log')
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.logs ?? [])
        setAuditLoaded(true)
      }
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => { void loadAuditLog() }, [])

  async function handleResolveDispute(txId: string, resolution: 'complete' | 'cancel') {
    setResolving(txId)
    try {
      const res = await fetch('/api/admin/resolve-dispute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, resolution }),
      })
      if (res.ok) setLocalDisputes(d => d.filter(t => t.id !== txId))
    } finally { setResolving(null) }
  }

  async function handleVerify(userId: string, approve: boolean) {
    setVerifying(userId)
    try {
      const res = await fetch('/api/admin/verify-ic', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve }),
      })
      if (res.ok) setLocalPending(p => p.filter(u => u.id !== userId))
    } finally { setVerifying(null) }
  }

  const statCards = [
    { label: 'Users', value: stats.totalUsers, icon: Users, color: 'var(--blue)' },
    { label: 'Active Listings', value: stats.activeListings, icon: Package, color: 'var(--teal)' },
    { label: 'Items Sold', value: stats.soldListings, icon: CheckCircle, color: 'var(--green)' },
    { label: 'Total Bids', value: stats.totalBids, icon: Gavel, color: 'var(--orange)' },
    { label: 'Messages', value: stats.totalMessages, icon: MessageCircle, color: 'var(--purple)' },
    { label: 'Avg Rating', value: `${stats.avgRating}★`, icon: Star, color: 'var(--yellow)' },
    { label: 'Total GMV', value: `RM ${Math.round(stats.totalVolume).toLocaleString()}`, icon: TrendingUp, color: 'var(--teal)' },
    { label: 'Revenue (15%)', value: `RM ${Math.round(stats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: 'var(--green)' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <s.icon className="w-5 h-5 mb-2" style={{ color: s.color }} />
            <p className="text-2xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pending IC */}
        <div>
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
                <div key={user.id} className="flex items-center justify-between px-4 py-4"
                  style={{ backgroundColor: 'var(--bg-card)', borderBottom: i < localPending.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <p className="font-medium">{user.name ?? 'Tanpa Nama'}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.icPhotoUrl && (
                      <a href={user.icPhotoUrl} target="_blank" rel="noreferrer"
                        className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                        <Eye className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => handleVerify(user.id, false)} disabled={verifying === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}>
                      <XCircle className="w-4 h-4" /> Tolak
                    </button>
                    <button onClick={() => handleVerify(user.id, true)} disabled={verifying === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}>
                      <CheckCircle className="w-4 h-4" /> Sahkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--blue)' }} />
            Recent Users
          </h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {recentUsers.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: 'var(--bg-card)', borderBottom: i < recentUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p className="text-sm font-medium">{u.name ?? 'Tanpa Nama'}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded font-mono"
                    style={{ backgroundColor: u.role === 'SELLER' ? 'rgba(20,184,166,0.1)' : 'rgba(148,163,184,0.1)', color: u.role === 'SELLER' ? 'var(--teal)' : 'var(--text-secondary)' }}>
                    {u.role}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--yellow)' }}>⭐{u.rehomeScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: 'var(--teal)' }} />
          Listing Terkini
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {recentListings.map((listing, i) => (
            <FeaturedListingRow key={listing.id} listing={listing} isLast={i === recentListings.length - 1} />
          ))}
        </div>
      </div>

      {/* Pending Seller Payouts */}
      <div className="mt-8 rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(0,217,165,0.3)' }}>
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <DollarSign className="w-5 h-5" style={{ color: 'var(--teal)' }} />
          <h2 className="text-lg font-semibold">Pending Seller Payouts ({localPayouts.length})</h2>
        </div>
        {localPayouts.length === 0 ? (
          <p className="px-6 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>No pending payouts.</p>
        ) : (
          localPayouts.map(p => (
            <PayoutRow
              key={p.id}
              payout={p}
              onPaid={id => setLocalPayouts(prev => prev.filter(x => x.id !== id))}
            />
          ))
        )}
      </div>

      {/* Disputed Swap Transactions */}
      <div className="mt-8 rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="flex items-center gap-2 mb-5">
          <AlertCircle className="w-5 h-5" style={{ color: 'var(--red)' }} />
          <h2 className="text-lg font-semibold">Pertikaian Swap Aktif ({localDisputes.length})</h2>
        </div>
        {localDisputes.length === 0 ? (
          <div className="text-center py-8 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--green)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tiada pertikaian aktif</p>
          </div>
        ) : (
          <div className="space-y-4">
            {localDisputes.map(tx => (
              <div key={tx.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowLeftRight className="w-4 h-4" style={{ color: '#16a34a' }} />
                      <a href={`/listings/${tx.listing.id}`} className="font-medium text-sm hover:underline">{tx.listing.title}</a>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>Seller: <strong>{tx.seller.name ?? tx.seller.email}</strong></span>
                      <span>Buyer: <strong>{tx.buyer.name ?? tx.buyer.email}</strong></span>
                      <span>{new Date(tx.updatedAt).toLocaleDateString('ms-MY')}</span>
                    </div>
                  </div>
                </div>
                {tx.disputeReason && (
                  <p className="text-xs px-3 py-2 rounded-lg mb-3 italic" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--text-secondary)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    "{tx.disputeReason}"
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveDispute(tx.id, 'complete')}
                    disabled={resolving === tx.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: '#16a34a' }}
                  >
                    {resolving === tx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Selesai (Lulus)
                  </button>
                  <button
                    onClick={() => handleResolveDispute(tx.id, 'cancel')}
                    disabled={resolving === tx.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <XCircle className="w-3 h-3" />
                    Buka Semula
                  </button>
                  <a
                    href={`/listings/${tx.listing.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <Eye className="w-3 h-3" />
                    Lihat
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Beta Users — full list */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: 'var(--purple)' }} />
          Semua Beta Users ({allUsers.length})
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Nama', 'Email', 'Role', 'Skor', 'Listing', 'IC', 'Daftar'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, i) => (
                  <tr key={u.id} style={{ backgroundColor: 'var(--bg-card)', borderBottom: i < allUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td className="px-4 py-2.5 font-medium">{u.name ?? '-'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor: u.role === 'ADMIN' ? 'rgba(168,85,247,0.15)' : u.role === 'SELLER' ? 'rgba(20,184,166,0.1)' : 'rgba(148,163,184,0.1)', color: u.role === 'ADMIN' ? 'var(--purple)' : u.role === 'SELLER' ? 'var(--teal)' : 'var(--text-secondary)' }}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--yellow)' }}>⭐{u.rehomeScore}</td>
                    <td className="px-4 py-2.5 text-center text-xs">{u._count.listings}</td>
                    <td className="px-4 py-2.5 text-center">
                      {u.icVerified ? <CheckCircle className="w-4 h-4 inline" style={{ color: 'var(--green)' }} /> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString('ms-MY')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="w-5 h-5" style={{ color: 'var(--blue)' }} />
            Audit Log
          </h2>
          <button
            onClick={loadAuditLog}
            disabled={auditLoading}
            className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {auditLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Refresh
          </button>
        </div>
        {auditLogs.length === 0 && !auditLoading ? (
          <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <ClipboardList className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No admin actions recorded yet.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {auditLoading && auditLogs.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--teal)' }} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                      {['Time', 'Action', 'Target', 'Type'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => {
                      const actionColor = log.action.includes('APPROVED') || log.action.includes('COMPLETE') || log.action.includes('FEATURED')
                        ? 'var(--green)'
                        : log.action.includes('REJECTED') || log.action.includes('CANCEL')
                          ? 'var(--red)'
                          : 'var(--blue)'
                      return (
                        <tr key={log.id} style={{ backgroundColor: 'var(--bg-card)', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                            {new Date(log.createdAt).toLocaleString('en-MY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs font-mono font-semibold" style={{ color: actionColor }}>{log.action}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                            {log.targetId ? log.targetId.slice(0, 8) + '…' : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {log.targetType ?? '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
