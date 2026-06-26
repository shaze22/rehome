import { NextRequest, NextResponse } from 'next/server'
import { analyzeItemPhotos } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

// Restrict to KASSIM-hosted photos — prevents SSRF (gemini.ts server-fetches these URLs).
const trustedPhotoUrl = z.string().url().refine((url) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? url.startsWith(`${base}/storage/v1/object/public/rehome-photos/`) : true
}, { message: 'Photos must be uploaded to KASSIM.' })

const Schema = z.object({
  photoUrls: z.array(trustedPhotoUrl).min(1).max(5),
  category: z.string().max(50),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const { allowed } = await rateLimit('ai', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many AI requests. Please slow down.' }, { status: 429 })

  const body = await request.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  try {
    const result = await analyzeItemPhotos(parsed.data.photoUrls, parsed.data.category)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Gemini analyze error:', err)
    return NextResponse.json({ error: 'AI is not available right now.' }, { status: 500 })
  }
}
