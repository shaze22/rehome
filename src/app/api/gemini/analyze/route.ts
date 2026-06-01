import { NextRequest, NextResponse } from 'next/server'
import { analyzeItemPhotos } from '@/lib/gemini'
import { z } from 'zod'

const Schema = z.object({
  photoUrls: z.array(z.string().url()).min(1).max(5),
  category: z.string(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Data tidak sah.' }, { status: 400 })

  try {
    const result = await analyzeItemPhotos(parsed.data.photoUrls, parsed.data.category)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Gemini analyze error:', err)
    return NextResponse.json({ error: 'AI tidak tersedia sekarang.' }, { status: 500 })
  }
}
