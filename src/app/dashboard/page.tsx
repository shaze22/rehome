import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { SellerListingCard } from '@/components/dashboard/SellerListingCard'
import { IcUploadForm } from '@/components/dashboard/IcUploadForm'
import { OrderCard } from '@/components/dashboard/OrderCard'
import { ReferralSection } from '@/components/dashboard/ReferralSection'
import { Gavel, Package, Plus, CheckCircle, Clock, ShoppingBag } from 'lucide-react'

async function getDashboardData(userId: string) {
  const [user, myListings, myBids, transactions, sellerOrders, buyerOrders] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.listing.findMany({
      where: { sellerId: userId },
      include: {
        seller: { select: { name: true, rehomeScore: true, icVerified: true } },
        _count: { select: { bids: true, offers: true } },
      },
      orderBy: { createdAt: 'desc' },
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
    }),
    // Orders as buyer
    prisma.transaction.findMany({
      where: { buyerId: userId },
      orderBy: { createdAt: 'desc' },
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

  return { user, myListings, myBids, transactions, sellerOrders: sellerOrdersWithTitle, buyerOrders: buyerOrdersWithTitle }
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  let { user: dbUser, myListings, myBids, transactions, sellerOrders, buyerOrders } = await getDashboardData(user.id)

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {params.payment === 'success' && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(0,217,165,0.1)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--green)' }}>
          <CheckCircle className="w-5 h-5" />
          Payment successful! Your item will be shipped shortly.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Welcome, <span style={{ color: 'var(--teal)' }}>{dbUser?.name ?? user.email}</span>
          </p>
        </div>
        <Link
          href="/sell"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white gradient-teal"
        >
          <Plus className="w-4 h-4" /> Sell Item
        </Link>
      </div>

      {/* Stats */}
      <DashboardStats
        rehomeScore={dbUser?.rehomeScore ?? 50}
        totalListings={myListings.length}
        activeListings={activeListings.length}
        totalEarnings={totalEarnings}
        wonAuctions={wonBids.length}
        icStatus={dbUser?.icStatus ?? 'UNVERIFIED'}
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
              {myListings.slice(0, 5).map(listing => (
                <SellerListingCard key={listing.id} listing={listing as any} />
              ))}
              {myListings.length > 5 && (
                <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
                  And {myListings.length - 5} more listings...
                </p>
              )}
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
              }} />
            ))}
            {(buyerOrders as any[]).map(o => (
              <OrderCard key={o.id} order={{
                listingId: o.listingId, title: o.listingTitle,
                amount: o.amount, sellerPayout: o.sellerPayout,
                status: o.status, shippingStatus: o.shippingStatus,
                trackingNumber: o.trackingNumber, deliveryConfirmed: o.deliveryConfirmed,
                isSeller: false,
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Referral Program */}
      <ReferralSection />
    </div>
  )
}
