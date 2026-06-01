import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  icPhotoUrl: z.string().url(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid photo URL.' }, { status: 400 })

  await prisma.user.update({
    where: { id: user.id },
    data: { icPhoto: parsed.data.icPhotoUrl, icStatus: 'PENDING' },
  })

  return NextResponse.json({ success: true, status: 'PENDING' })
}
