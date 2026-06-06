import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^(\+?6?01)[0-46-9]-?[0-9]{7,8}$/, 'Invalid Malaysian phone number').optional(),
  state: z.string().optional(),
  postcode: z.string().regex(/^\d{5}$/, 'Postcode must be 5 digits').optional().or(z.literal('')),
  savedAddress: z.string().max(500).optional(),
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

  const { name, phone, state, postcode, savedAddress } = parsed.data
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(state !== undefined ? { state } : {}),
      ...(postcode !== undefined ? { postcode: postcode || null } : {}),
      ...(savedAddress !== undefined ? { savedAddress: savedAddress || null } : {}),
    },
    select: { id: true, name: true, phone: true, state: true, postcode: true, savedAddress: true },
  })

  return NextResponse.json({ success: true, user: updated })
}
