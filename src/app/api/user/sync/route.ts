import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendWelcomeEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const existing = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })

  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name ?? user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url,
    },
    update: {
      name: user.user_metadata?.name,
      avatar: user.user_metadata?.avatar_url,
    },
  })

  // Send welcome email only on first registration
  if (!existing && user.email) {
    try {
      await sendWelcomeEmail(user.email, dbUser.name ?? 'Pengguna Baru')
    } catch { /* non-critical */ }
  }

  return NextResponse.json({ user: dbUser })
}
