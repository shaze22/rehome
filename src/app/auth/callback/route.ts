import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  let dest = next

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      const meta = data.user.user_metadata ?? {}
      const existing = await prisma.user.findUnique({ where: { id: data.user.id }, select: { id: true } })
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: {
          name: meta.name ?? undefined,
          ...(meta.phone ? { phone: meta.phone } : {}),
          ...(meta.state ? { state: meta.state } : {}),
        },
        create: {
          id: data.user.id,
          email: data.user.email!,
          name: meta.name ?? data.user.email?.split('@')[0],
          phone: meta.phone ?? null,
          state: meta.state ?? null,
        },
      })
      if (!existing) dest = '/sell?welcome=1'
    }
  }

  return NextResponse.redirect(`${origin}${dest}`)
}
