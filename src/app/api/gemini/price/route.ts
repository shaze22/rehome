import { NextRequest, NextResponse } from 'next/server'
import { getAIPriceSuggestion } from '@/lib/gemini'
import { z } from 'zod'

const Schema = z.object({
  category: z.string(),
  condition: z.number().int().min(1).max(10),
  originalPrice: z.number().min(0),
  state: z.string(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })
  }

  try {
    const suggestion = await getAIPriceSuggestion(parsed.data)
    return NextResponse.json(suggestion)
  } catch (err) {
    console.error('Gemini error:', err)
    return NextResponse.json({ error: 'AI is not available right now.' }, { status: 500 })
  }
}
