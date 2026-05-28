import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SellForm } from '@/components/sell/SellForm'

export default async function SellPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Jual Barangan</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Isi butiran item anda. AI akan cadangkan harga permulaan yang adil.
        </p>
      </div>
      <SellForm userId={user.id} />
    </div>
  )
}
