import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logAdminAction } from '@/lib/audit'

const Schema = z.object({
  userId: z.string().min(1),
  approve: z.boolean(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (admin?.role !== 'ADMIN') return NextResponse.json({ error: 'Access denied.' }, { status: 403 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const { userId, approve } = parsed.data

  await prisma.user.update({
    where: { id: userId },
    data: {
      icStatus: approve ? 'VERIFIED' : 'UNVERIFIED',
      icVerified: approve,
    },
  })

  void logAdminAction(user.id, approve ? 'IC_APPROVED' : 'IC_REJECTED', userId, 'User')

  return NextResponse.json({ success: true })
}
