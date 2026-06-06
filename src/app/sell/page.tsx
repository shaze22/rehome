import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  if (!user) redirect('/auth/login')

  const params = await searchParams
  const isWelcome = params.welcome === '1'

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
          Fill in your item details. AI will suggest a fair starting price.
        </p>
      </div>
      <SellForm userId={user.id} />
    </div>
  )
}
