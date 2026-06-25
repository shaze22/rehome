import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { SellerListingCard } from '@/components/dashboard/SellerListingCard'
import { IcUploadForm } from '@/components/dashboard/IcUploadForm'
import { OrderCard } from '@/components/dashboard/OrderCard'
import { ReferralSection } from '@/components/dashboard/ReferralSection'
import { ProfileEditForm } from '@/components/dashboard/ProfileEditForm'
import { PayoutsSection } from '@/components/dashboard/PayoutsSection'
import { Gavel, Package, Plus, CheckCircle, Clock, ShoppingBag, BarChart2, Eye, Heart, Star, TrendingUp, AlertTriangle, Zap, Truck } from 'lucide-react'
import { DeleteAccountButton } from '@/components/dashboard/DeleteAccountButton'

async function getDashboardData(userId: string) {
  const [user, myListings, myBids, transactions, sellerOrders, buyerOrders, watchlistCount, avgRating] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.listing.findMany({
      where: { sellerId: userId, hiddenBySeller: false },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.bid.findMany({
      where: { bidderId: userId },
      distinct: ['listingId'],
      include: {
        listing: {
          include: {
            seller: { select: { name: true, rehomeScore: true, icVerified: true } },
            _count: { select: { bids: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { sellerId: userId, status: 'RELEASED' },
    }),
    // Orders as seller
    prisma.transaction.findMany({
      where: { sellerId: userId, status: 'ESCROWED' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Orders as buyer
    prisma.transaction.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    // Watchlist count on user's listings
    prisma.watchlist.count({
      where: { listing: { sellerId: userId } },
    }),
    // Average review rating
    prisma.review.aggregate({
      where: { listing: { sellerId: userId } },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ])

  // Attach listing titles
  const allListingIds = [...new Set([...sellerOrders, ...buyerOrders].map(o => o.listingId))]
  const listingTitles = allListingIds.length > 0
    ? await prisma.listing.findMany({ where: { id: { in: allListingIds } }, select: { id: true, title: true } })
    : []
  const titleMap = Object.fromEntries(listingTitles.map(l => [l.id, l.title]))

  const sellerOrdersWithTitle = sellerOrders.map(o => ({ ...o, listingTitle: titleMap[o.listingId] ?? o.listingId }))
  const buyerOrdersWithTitle  = buyerOrders.map(o => ({ ...o, listingTitle: titleMap[o.listingId] ?? o.listingId }))

  const totalViews = myListings.reduce((sum, l) => sum + (l.viewCount ?? 0), 0)

  return {
    user, myListings, myBids, transactions,
    sellerOrders: sellerOrdersWithTitle, buyerOrders: buyerOrdersWithTitle,
    totalViews, watchlistCount,
    avgRating: avgRating._avg.rating ?? 0,
    reviewCount: avgRating._count.rating,
  }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  let { user: dbUser, myListings, myBids, transactions, sellerOrders, buyerOrders, totalViews, watchlistCount, avgRating, reviewCount } = await getDashboardData(user.id)

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name ?? user.email?.split('@')[0],
      },
    })
  }

  const totalEarnings = transactions.reduce((sum, t) => sum + t.sellerPayout, 0)
  const activeListings = myListings.filter(l => l.status === 'ACTIVE')
  const wonBids = myBids.filter(b => b.listing.currentBidder === user.id && b.listing.status !== 'ACTIVE')
  const unpaidWins = wonBids.filter(b => b.listing.status === 'ENDED')

  const isNewUser = myListings.length === 0 && myBids.length === 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {params.payment === 'success' && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(0,217,165,0.1)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--green)' }}>
          <CheckCircle className="w-5 h-5" />
          Payment successful! Your item will be shipped shortly.
        </div>
      )}

      {/* Urgent: unpaid wins */}
      {unpaidWins.length > 0 && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '2px solid var(--orange)', boxShadow: '0 0 24px rgba(255,107,53,0.2)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(255,107,53,0.12)' }}>
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--orange)' }} />
            <p className="font-bold text-sm" style={{ color: 'var(--orange)' }}>You won {unpaidWins.length === 1 ? 'an auction' : `${unpaidWins.length} auctions`}! Complete your purchase.</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {unpaidWins.map(bid => (
              <div key={bid.id} className="px-5 py-4 flex items-center justify-between gap-4" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{bid.listing.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Winning bid: <span className="font-mono font-bold" style={{ color: 'var(--orange)' }}>RM {bid.amount}</span></p>
                </div>
                <Link href={`/listings/${bid.listingId}`} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white animate-pulse" style={{ backgroundColor: 'var(--orange)' }}>
                  Pay Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent: seller action — ship (delivery) vs arrange meet-up (self-pickup) */}
      {(() => {
        const shipOrders = (sellerOrders as { pickupMethod?: string | null }[]).filter(o => o.pickupMethod !== 'PICKUP')
        const pickupOrders = (sellerOrders as { pickupMethod?: string | null }[]).filter(o => o.pickupMethod === 'PICKUP')
        return (
          <>
            {shipOrders.length > 0 && (
              <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '2px solid var(--teal)', boxShadow: '0 0 24px rgba(20,184,166,0.15)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(20,184,166,0.1)' }}>
                  <Truck className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--teal)' }} />
                  <p className="font-bold text-sm" style={{ color: 'var(--teal)' }}>Action required: Ship {shipOrders.length === 1 ? 'your item' : `${shipOrders.length} items`} to the buyer.</p>
                </div>
                <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Buyer has paid. Pack your item and enter the tracking number below in Orders.</p>
                </div>
              </div>
            )}
            {pickupOrders.length > 0 && (
              <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '2px solid var(--green)', boxShadow: '0 0 24px rgba(0,217,165,0.15)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(0,217,165,0.1)' }}>
                  <Package className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />
                  <p className="font-bold text-sm" style={{ color: 'var(--green)' }}>Action required: Arrange pickup for {pickupOrders.length === 1 ? 'your sold item' : `${pickupOrders.length} sold items`}.</p>
                </div>
                <div className="px-5 py-3" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Buyer has paid and will collect in person (Lalamove does not cover their area). Contact the buyer in Orders to arrange a safe meet-up.</p>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Welcome back, <span style={{ color: 'var(--teal)' }}>{dbUser?.name ?? user.email}</span>
          </p>
        </div>
        <Link
          href="/sell"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white gradient-teal"
        >
          <Plus className="w-4 h-4" /> List Item
        </Link>
      </div>

      {/* New user onboarding */}
      {isNewUser && (
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.07),rgba(22,163,74,0.07))', border: '1px solid rgba(20,184,166,0.25)' }}>
          <h2 className="text-lg font-bold mb-4">Welcome to KASSIM! Here&apos;s how to get started:</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', emoji: '📸', title: 'List Your First Item', desc: 'Take photos, set a price, and go live in under 3 minutes.', href: '/sell', cta: 'Start Selling' },
              { step: '2', emoji: '🔍', title: 'Browse Auctions', desc: 'Find pre-loved items from Malaysians near you. Bid from RM0.', href: '/listings', cta: 'Browse Now' },
              { step: '3', emoji: '✅', title: 'Verify Your IC', desc: 'Get a trust badge that makes buyers 3x more likely to bid on your items.', href: '/dashboard', cta: 'Verify Below' },
            ].map(item => (
              <Link key={item.step} href={item.href} className="flex flex-col gap-2 p-4 rounded-xl transition-all hover:scale-[1.02]" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white gradient-teal">{item.step}</span>
                  <span className="text-lg">{item.emoji}</span>
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                <span className="text-xs font-medium mt-auto" style={{ color: 'var(--teal)' }}>{item.cta} →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <DashboardStats
        rehomeScore={dbUser?.rehomeScore ?? 50}
        totalListings={myListings.length}
        activeListings={activeListings.length}
        totalEarnings={totalEarnings}
        wonAuctions={wonBids.length}
        icStatus={dbUser?.icStatus ?? 'UNVERIFIED'}
      />

      {/* Referral Program — shown prominently above listings */}
      <div className="mt-8">
        <ReferralSection />
      </div>

      {/* My Performance — seller analytics */}
      {myListings.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5" style={{ color: 'var(--teal)' }} />
            My Performance
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                icon: Eye, label: 'Total Views', color: 'var(--blue)',
                value: totalViews.toLocaleString(),
              },
              {
                icon: Heart, label: 'Watchlisted', color: 'var(--red)',
                value: watchlistCount.toLocaleString(),
              },
              {
                icon: TrendingUp, label: 'Total Earnings', color: 'var(--teal)',
                value: `RM ${totalEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
              },
              {
                icon: Package, label: 'Active / Sold', color: 'var(--green)',
                value: `${activeListings.length} / ${myListings.filter((l: { status: string }) => l.status === 'SOLD').length}`,
              },
              {
                icon: Star, label: `Avg Rating${reviewCount > 0 ? ` (${reviewCount})` : ''}`, color: 'var(--yellow)',
                value: reviewCount > 0 ? avgRating.toFixed(1) + ' ★' : 'N/A',
              },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <stat.icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                <p className="text-xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile — phone required for EasyParcel delivery booking */}
      <ProfileEditForm
        initialName={dbUser?.name ?? ''}
        initialPhone={dbUser?.phone ?? ''}
        initialState={dbUser?.state ?? ''}
        initialPostcode={dbUser?.postcode ?? ''}
        initialSavedAddress={dbUser?.savedAddress ?? ''}
        missingPhone={!dbUser?.phone}
      />

      {/* IC Verification */}
      {dbUser?.icStatus !== 'VERIFIED' && (
        <div className="mt-8">
          <IcUploadForm
            userId={user.id}
            currentStatus={dbUser?.icStatus ?? 'UNVERIFIED'}
            currentIcPhoto={dbUser?.icPhoto ?? null}
          />
        </div>
      )}

      {/* Tabs content */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Listings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5" style={{ color: 'var(--teal)' }} />
              My Listings
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              {myListings.length}
            </span>
          </div>
          {myListings.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>You have no listings yet.</p>
              <Link href="/sell" className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-teal">
                Start Selling
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myListings.map(listing => (
                <SellerListingCard key={listing.id} listing={listing as any} />
              ))}
            </div>
          )}
        </div>

        {/* My Bids */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gavel className="w-5 h-5" style={{ color: 'var(--orange)' }} />
              My Bids
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              {myBids.length}
            </span>
          </div>
          {myBids.length === 0 ? (
            <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <Gavel className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>You have not placed any bids yet.</p>
              <Link href="/listings" className="px-4 py-2 rounded-lg text-sm font-medium text-white gradient-teal">
                Browse Listings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myBids.slice(0, 5).map(bid => (
                <Link key={bid.id} href={`/listings/${bid.listingId}`}>
                  <div className="rounded-xl p-4 transition-colors" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium line-clamp-1">{bid.listing.title}</p>
                      {bid.listing.currentBidder === user.id ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(0,217,165,0.1)', color: 'var(--green)' }}>Highest</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>Outbid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-mono" style={{ color: 'var(--teal)' }}>RM {bid.amount.toFixed(0)}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {bid.listing.status === 'ACTIVE' ? 'Active' : 'Ended'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Orders */}
      {(myListings.length > 0 || dbUser.stripeAccountId) && (
        <PayoutsSection onboarded={!!dbUser.stripeOnboarded} hasAccount={!!dbUser.stripeAccountId} />
      )}

      {(sellerOrders.length > 0 || buyerOrders.length > 0) && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" style={{ color: 'var(--purple)' }} />
            Orders
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(sellerOrders as any[]).map(o => (
              <OrderCard key={o.id} order={{
                listingId: o.listingId, title: o.listingTitle,
                amount: o.amount, sellerPayout: o.sellerPayout,
                status: o.status, shippingStatus: o.shippingStatus,
                trackingNumber: o.trackingNumber, deliveryConfirmed: o.deliveryConfirmed,
                isSeller: true,
                courierName: o.courierName, courierService: o.courierService,
                buyerPostcode: o.buyerPostcode, buyerPhone: o.buyerPhone,
                buyerAddress: o.buyerAddress, deliveryFee: o.deliveryFee,
                easyparcelOrderId: o.easyparcelOrderId,
                lalamoveOrderId: o.lalamoveOrderId, deliveryTrackingUrl: o.deliveryTrackingUrl,
                pickupMethod: o.pickupMethod,
              }} />
            ))}
            {(buyerOrders as any[]).map(o => (
              <OrderCard key={o.id} order={{
                listingId: o.listingId, title: o.listingTitle,
                amount: o.amount, sellerPayout: o.sellerPayout,
                status: o.status, shippingStatus: o.shippingStatus,
                trackingNumber: o.trackingNumber, deliveryConfirmed: o.deliveryConfirmed,
                isSeller: false,
                courierName: o.courierName, deliveryFee: o.deliveryFee,
                deliveryTrackingUrl: o.deliveryTrackingUrl,
                pickupMethod: o.pickupMethod,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-12 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Danger Zone</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Permanently delete your account and personal data (PDPA right to erasure)</p>
          </div>
          <DeleteAccountButton />
        </div>
      </div>

    </div>
  )
}
