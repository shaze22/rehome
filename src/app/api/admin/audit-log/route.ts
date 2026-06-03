import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createClient as supabaseAdmin } from '@supabase/supabase-js'

const admin = supabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await admin
    .from('AuditLog')
    .select('*')
    .order('createdAt', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs: data ?? [] })
}
