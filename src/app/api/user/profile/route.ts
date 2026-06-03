import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^(\+?6?01)[0-46-9]-?[0-9]{7,8}$/, 'Invalid Malaysian phone number').optional(),
  state: z.string().optional(),
})

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    return NextResponse.json({ error: issues[0]?.message ?? 'Invalid input.' }, { status: 400 })
  }

  const { name, phone, state } = parsed.data
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(state !== undefined ? { state } : {}),
    },
    select: { id: true, name: true, phone: true, state: true },
  })

  return NextResponse.json({ success: true, user: updated })
}
