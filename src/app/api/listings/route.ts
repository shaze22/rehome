import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAIPriceSuggestion } from '@/lib/gemini'
import { calculateCO2Saved } from '@/lib/co2'
import { z } from 'zod'

const ListingSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(['FURNITURE','ELECTRONICS','FASHION','BOOKS','SPORTS','KITCHEN','OTHERS']),
  condition: z.number().int().min(1).max(10),
  originalPrice: z.number().min(0),
  startingBid: z.number().int().min(0),
  photos: z.array(z.string().url()).max(5),
  state: z.string().min(1),
  durationHours: z.number().int().refine(v => [1,3,6,12,24,48,72].includes(v)),
  hasScratch: z.boolean(),
  isFunctional: z.boolean(),
  hasCompleteParts: z.boolean(),
  hasOriginalBox: z.boolean(),
  hasWarranty: z.boolean(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = ListingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const data = parsed.data

  // Get or create user record
  // Upsert user and auto-elevate to SELLER
  const dbUser = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name ?? user.email?.split('@')[0],
      role: 'SELLER',
    },
    update: { role: 'SELLER' },
  })

  // AI pricing
  let aiSuggestedMin: number | null = null
  let aiSuggestedMax: number | null = null
  let aiReasoning: string | null = null

  try {
    const ai = await getAIPriceSuggestion({
      category: data.category,
      condition: data.condition,
      originalPrice: data.originalPrice,
      state: data.state,
    })
    aiSuggestedMin = ai.suggested_min
    aiSuggestedMax = ai.suggested_max
    aiReasoning = ai.reasoning
  } catch {
    // AI failure shouldn't block listing creation
  }

  const co2Saved = calculateCO2Saved(data.category)
  const endsAt = new Date(Date.now() + data.durationHours * 3600 * 1000)

  const listing = await prisma.listing.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      originalPrice: data.originalPrice,
      startingBid: data.startingBid,
      photos: data.photos,
      sellerId: user.id,
      state: data.state,
      endsAt,
      aiSuggestedMin,
      aiSuggestedMax,
      aiReasoning,
      co2Saved,
      hasScratch: data.hasScratch,
      isFunctional: data.isFunctional,
      hasCompleteParts: data.hasCompleteParts,
      hasOriginalBox: data.hasOriginalBox,
      hasWarranty: data.hasWarranty,
    },
  })

  return NextResponse.json({ listing }, { status: 201 })
}
