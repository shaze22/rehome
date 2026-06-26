import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Path inside the private `ic-verification` bucket (not a public URL). Must be the user's own folder.
const Schema = z.object({
  icPath: z.string().min(5).max(300).regex(/^ic\//, 'Invalid IC path.'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid IC photo.' }, { status: 400 })

  // Defence in depth: the path must be in the caller's own folder (ic/<uid>/...).
  if (parsed.data.icPath.split('/')[1] !== user.id) {
    return NextResponse.json({ error: 'Invalid IC path.' }, { status: 403 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { icPhoto: parsed.data.icPath, icStatus: 'PENDING' },
  })

  return NextResponse.json({ success: true, status: 'PENDING' })
}
