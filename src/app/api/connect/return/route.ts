import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { refreshOnboardStatus } from '@/lib/connect'

// Stripe redirects here after the seller finishes (or exits) onboarding.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login?next=/dashboard', request.url))

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeAccountId: true },
  })

  if (dbUser?.stripeAccountId) {
    try {
      const onboarded = await refreshOnboardStatus(user.id, dbUser.stripeAccountId)
      return NextResponse.redirect(new URL(`/dashboard?payouts=${onboarded ? 'done' : 'pending'}`, request.url))
    } catch (err) {
      console.error('[connect/return]', err)
    }
  }
  return NextResponse.redirect(new URL('/dashboard?payouts=pending', request.url))
}
