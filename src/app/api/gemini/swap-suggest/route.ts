import { NextRequest, NextResponse } from 'next/server'
import { getSwapSuggestions } from '@/lib/gemini'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1).max(100),
  category: z.string().min(1),
  condition: z.number().int().min(1).max(10),
  estimatedValue: z.number().min(0),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  try {
    const suggestion = await getSwapSuggestions(parsed.data)
    return NextResponse.json(suggestion)
  } catch {
    return NextResponse.json({ error: 'AI tidak dapat membuat cadangan. Sila cuba lagi.' }, { status: 500 })
  }
}
