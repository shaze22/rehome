import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { refreshOnboardStatus } from '@/lib/connect'

// Re-checks live onboarding status from Stripe and persists it. Used by the
// dashboard "Refresh status" action (onboarding can complete out-of-band).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })
  if (!dbUser?.stripeAccountId) return NextResponse.json({ onboarded: false, hasAccount: false })

  try {
    const onboarded = await refreshOnboardStatus(user.id, dbUser.stripeAccountId)
    return NextResponse.json({ onboarded, hasAccount: true })
  } catch {
    return NextResponse.json({ onboarded: dbUser.stripeOnboarded, hasAccount: true })
  }
}
