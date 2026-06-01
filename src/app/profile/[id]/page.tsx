import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ListingCard } from '@/components/listings/ListingCard'
import { getUserBadges } from '@/lib/badges'
import { CheckCircle, Star, Package, MapPin, Calendar, Award, ArrowLeftRight } from 'lucide-react'

async function getProfile(id: string) {
  try {
    const [profile, soldCount, boughtCount, co2Result, swapHistory] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: {
          listings: {
            where: { status: 'ACTIVE' },
            include: {
              seller: { select: { name: true, rehomeScore: true, icVerified: true } },
              _count: { select: { bids: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 12,
          },
          _count: { select: { listings: true, bids: true } },
        },
      }),
      prisma.listing.count({ where: { sellerId: id, status: 'SOLD' } }),
      prisma.bid.findMany({ where: { bidderId: id }, select: { listingId: true } })
        .then(bids => new Set(bids.map(b => b.listingId)).size),
      prisma.listing.aggregate({ where: { sellerId: id, status: 'SOLD' }, _sum: { co2Saved: true } }),
      prisma.swapTransaction.findMany({
        where: { OR: [{ sellerId: id }, { buyerId: id }], escrowStatus: 'COMPLETED' },
        include: {
          listing: { select: { id: true, title: true, category: true, photos: true } },
          seller: { select: { id: true, name: true } },
          buyer: { select: { id: true, name: true } },
        },
        orderBy: { resolvedAt: 'desc' },
        take: 6,
      }),
    ])
    return profile ? { ...profile, soldCount, boughtCount, totalCO2: co2Result._sum.co2Saved ?? 0, swapHistory } : null
  } catch {
    return null
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getProfile(id)
  if (!profile) notFound()

  const scoreColor = profile.rehomeScore >= 70 ? 'var(--green)' : profile.rehomeScore >= 40 ? 'var(--yellow)' : 'var(--red)'
  const earnedBadges = getUserBadges({
    soldCount: profile.soldCount,
    boughtCount: profile.boughtCount,
    rehomeScore: profile.rehomeScore,
    icVerified: profile.icVerified,
    totalCO2: profile.totalCO2,
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile header */}
      <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl gradient-teal flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {profile.name?.[0]?.toUpperCase() ?? '?'}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{profile.name ?? 'Pengguna Tanpa Nama'}</h1>
              {profile.icVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)', border: '1px solid rgba(0,217,165,0.3)' }}>
                  <CheckCircle className="w-3 h-3" /> IC Disahkan
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {profile.state && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {profile.state}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Ahli sejak {new Date(profile.createdAt).toLocaleDateString('ms-MY', { year: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-row sm:flex-col gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold font-mono" style={{ color: scoreColor }}>{profile.rehomeScore}</p>
              <p className="text-xs flex items-center gap-1 justify-center mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                <Star className="w-3 h-3" style={{ color: 'var(--yellow)' }} /> Ballout Score
              </p>
            </div>
            {profile.swapScore != null && (
              <div className="text-center">
                <p className="text-2xl font-bold font-mono" style={{ color: '#16a34a' }}>{profile.swapScore.toFixed(1)}</p>
                <p className="text-xs mt-0.5 flex items-center gap-1 justify-center" style={{ color: 'var(--text-secondary)' }}>
                  <ArrowLeftRight className="w-3 h-3" /> Swap Score
                </p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold font-mono" style={{ color: 'var(--teal)' }}>{profile._count.listings}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Listing</p>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Ballout Score</span>
            <span className="font-mono">{profile.rehomeScore}/100</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${profile.rehomeScore}%`, backgroundColor: scoreColor }} />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Berdasarkan sejarah transaksi, masa respons dan rekod pertikaian
          </p>
        </div>
      </div>

      {/* Badges */}
      {earnedBadges.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: 'var(--yellow)' }} />
            Lencana ({earnedBadges.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {earnedBadges.map(badge => (
              <div key={badge.id} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}40` }}>
                <span className="text-lg">{badge.emoji}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: badge.color }}>{badge.nameMs}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swap Badges */}
      {(profile.swapVerified || profile.successfulSwaps > 0) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {profile.swapVerified && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)' }}>
              <ArrowLeftRight className="w-4 h-4" style={{ color: '#16a34a' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#16a34a' }}>Verified Swapper</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.successfulSwaps} swap berjaya</p>
              </div>
            </div>
          )}
          {!profile.swapVerified && profile.successfulSwaps > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
              <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--teal)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{profile.successfulSwaps} swap berjaya · {5 - profile.successfulSwaps} lagi untuk Verified</p>
            </div>
          )}
        </div>
      )}

      {/* Swap History */}
      {profile.swapHistory.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" style={{ color: '#16a34a' }} />
            Sejarah Pertukaran ({profile.swapHistory.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.swapHistory.map(tx => {
              const isSeller = tx.seller.id === profile.id
              const partner = isSeller ? tx.buyer : tx.seller
              return (
                <a key={tx.id} href={`/listings/${tx.listing.id}`} className="block rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <div className="aspect-video relative bg-[var(--bg-elevated)]">
                    {tx.listing.photos[0] && (
                      <img src={tx.listing.photos[0]} alt={tx.listing.title} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: 'rgba(22,163,74,0.9)', color: 'white' }}>
                      ✓ Selesai
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium line-clamp-1">{tx.listing.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {isSeller ? 'Ditukar kepada' : 'Ditukar dari'} {partner.name ?? 'Pengguna'}
                    </p>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Listings */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" style={{ color: 'var(--teal)' }} />
        Listing Aktif ({profile.listings.length})
      </h2>

      {profile.listings.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Tiada listing aktif pada masa ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {profile.listings.map(listing => (
            <ListingCard key={listing.id} listing={listing as any} />
          ))}
        </div>
      )}
    </div>
  )
}
