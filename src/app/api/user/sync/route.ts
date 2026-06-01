import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail, sendReferralRewardEmail } from '@/lib/resend'
import { customAlphabet } from 'nanoid'
import { cookies } from 'next/headers'

const REFERRAL_CREDIT = 5
const genCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, referralCode: true },
  })

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name ?? user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
      referralCode: genCode(),
    },
    update: {
      name: user.user_metadata?.name,
      avatar: user.user_metadata?.avatar_url,
      // ensure existing users also get a code if missing
      ...(existing?.referralCode ? {} : { referralCode: genCode() }),
    },
  })

  const isNew = !existing

  if (isNew && user.email) {
    // Welcome email
    try {
      await sendWelcomeEmail(user.email, dbUser.name ?? 'Pengguna Baru')
    } catch { /* non-critical */ }

    // Process referral cookie
    try {
      const jar = await cookies()
      const refCode = jar.get('ballout_ref')?.value
      if (refCode) {
        const referrer = await prisma.user.findUnique({
          where: { referralCode: refCode },
          select: { id: true, email: true, name: true },
        })
        // Valid referrer, not themselves, and no prior referral for this user
        if (referrer && referrer.id !== user.id) {
          await prisma.$transaction([
            prisma.referral.create({
              data: { referrerId: referrer.id, referredId: user.id, rewardGiven: true },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { creditBalance: { increment: REFERRAL_CREDIT } },
            }),
            prisma.user.update({
              where: { id: referrer.id },
              data: { creditBalance: { increment: REFERRAL_CREDIT } },
            }),
          ])
          // Notify referrer
          if (referrer.email) {
            sendReferralRewardEmail(
              referrer.email, referrer.name ?? 'Pengguna',
              dbUser.name ?? user.email ?? 'Kawan anda', REFERRAL_CREDIT
            ).catch(() => {})
          }
        }
      }
    } catch { /* referral failure non-critical */ }
  }

  return NextResponse.json({ user: dbUser })
}
