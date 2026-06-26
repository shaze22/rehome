import { NextRequest, NextResponse } from 'next/server'
import { getSwapSuggestions } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  condition: z.number().int().min(1).max(10),
  estimatedValue: z.number().min(0),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { allowed } = await rateLimit('ai', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many AI requests. Please slow down.' }, { status: 429 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  try {
    const suggestion = await getSwapSuggestions(parsed.data)
    return NextResponse.json(suggestion)
  } catch {
    return NextResponse.json({ error: 'AI could not generate suggestions. Please try again.' }, { status: 500 })
  }
}
