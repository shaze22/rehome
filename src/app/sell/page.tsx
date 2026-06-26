import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { SellForm } from '@/components/sell/SellForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sell Item',
  description: 'List your pre-loved item for auction or swap. AI will suggest a fair starting price.',
  robots: { index: false, follow: false },
}

export default async function SellPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/sell')

  const params = await searchParams
  const isWelcome = params.welcome === '1'

  // Sellers need a complete address — it's printed on the shipping label (sender/return).
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, state: true, postcode: true, savedAddress: true },
  })
  const addressIncomplete = !dbUser?.phone?.trim() || !dbUser?.state?.trim() ||
    !dbUser?.postcode?.trim() || !dbUser?.savedAddress || dbUser.savedAddress.trim().length < 5

  if (addressIncomplete) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-bold mb-2">One step before you sell</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add your <strong>phone number, state, postcode, and full address</strong> to your profile first. We print it on the shipping label so couriers know where each parcel is sent from. It only takes a minute.
          </p>
          <Link href="/dashboard#profile"
            className="inline-block px-5 py-2.5 rounded-xl font-semibold text-white gradient-teal">
            Complete my address
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {isWelcome && (
        <div className="mb-6 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(22,163,74,0.08))', border: '1px solid rgba(20,184,166,0.3)' }}>
          <p className="font-bold text-base mb-1" style={{ color: 'var(--teal)' }}>Welcome to KASSIM!</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>List your first item below. It takes under 3 minutes and goes live instantly.</p>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Sell an Item</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Upload photos first — AI fills your listing automatically.
        </p>
      </div>
      <SellForm userId={user.id} />
    </div>
  )
}
