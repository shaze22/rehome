import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SellForm } from '@/components/sell/SellForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sell Item',
  description: 'List your pre-loved item for auction or swap. AI will suggest a fair starting price.',
  robots: { index: false, follow: false },
}

export default async function SellPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
