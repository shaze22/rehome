import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateConnectAccount, createOnboardingLink } from '@/lib/connect'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login?next=/dashboard', request.url))

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, stripeAccountId: true },
  })
  if (!dbUser?.email) return NextResponse.redirect(new URL('/dashboard?payouts=error', request.url))

  try {
    const accountId = await getOrCreateConnectAccount(dbUser)
    const url = await createOnboardingLink(accountId)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/onboard]', err)
    return NextResponse.redirect(new URL('/dashboard?payouts=error', request.url))
  }
}
