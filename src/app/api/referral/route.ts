import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [dbUser, referralCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true, creditBalance: true },
    }),
    prisma.referral.count({ where: { referrerId: user.id } }),
  ])

  return NextResponse.json({
    referralCode: dbUser?.referralCode ?? null,
    creditBalance: dbUser?.creditBalance ?? 0,
    referralCount,
    totalRewards: referralCount * 5,
  })
}
