import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { EditListingForm } from '@/components/sell/EditListingForm'

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { _count: { select: { bids: true, offers: true } } },
  })

  if (!listing) notFound()
  if (listing.sellerId !== user.id) notFound()
  if (listing.status !== 'ACTIVE') redirect('/dashboard')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-lg font-bold">Edit Listing</h1>
      </div>
      <EditListingForm listing={listing as any} userId={user.id} />
    </div>
  )
}
