import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createLoginLink } from '@/lib/connect'

// Opens the seller's Stripe Express dashboard (view payouts / update bank details).
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login?next=/dashboard', request.url))

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeAccountId: true, stripeOnboarded: true },
  })
  if (!dbUser?.stripeAccountId || !dbUser.stripeOnboarded) {
    return NextResponse.redirect(new URL('/api/connect/onboard', request.url))
  }

  try {
    const url = await createLoginLink(dbUser.stripeAccountId)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/login]', err)
    return NextResponse.redirect(new URL('/dashboard?payouts=error', request.url))
  }
}
