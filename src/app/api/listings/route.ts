import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getAIPriceSuggestion } from '@/lib/gemini'
import { calculateCO2Saved } from '@/lib/co2'
import { z } from 'zod'

const FlashListingSchema = z.object({
  mode: z.literal('FLASH').optional().default('FLASH'),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(['FURNITURE','ELECTRONICS','FASHION','BOOKS','SPORTS','KITCHEN','OTHERS']),
  condition: z.number().int().min(1).max(10),
  originalPrice: z.number().min(0),
  startingBid: z.number().int().min(0),
  photos: z.array(z.string().url()).max(5),
  state: z.string().min(1),
  hasScratch: z.boolean(),
  isFunctional: z.boolean(),
  hasCompleteParts: z.boolean(),
  hasOriginalBox: z.boolean(),
  hasWarranty: z.boolean(),
})

const SwapListingSchema = z.object({
  mode: z.literal('SWAP'),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.enum(['FURNITURE','ELECTRONICS','FASHION','BOOKS','SPORTS','KITCHEN','OTHERS']),
  condition: z.number().int().min(1).max(10),
  originalPrice: z.number().min(0),
  photos: z.array(z.string().url()).min(1).max(5),
  state: z.string().min(1),
  hasScratch: z.boolean(),
  isFunctional: z.boolean(),
  hasCompleteParts: z.boolean(),
  hasOriginalBox: z.boolean(),
  hasWarranty: z.boolean(),
  swapWantedItem: z.string().max(255).optional(),
  swapWantedCategory: z.string().max(100).optional(),
  swapOpenOffers: z.boolean().default(false),
  swapAcceptCash: z.boolean().default(true),
  swapMinCashTopup: z.number().min(0).optional(),
})

const ListingSchema = z.discriminatedUnion('mode', [
  FlashListingSchema,
  SwapListingSchema,
]).or(FlashListingSchema)

type FlashData = z.infer<typeof FlashListingSchema>
type SwapData = z.infer<typeof SwapListingSchema>

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

  // Normalise: if mode not provided, default to FLASH
  if (typeof body === 'object' && body !== null && !('mode' in body)) {
    (body as Record<string, unknown>).mode = 'FLASH'
  }

  const parsed = ListingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const data = parsed.data

  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name ?? user.email?.split('@')[0],
      role: 'SELLER',
    },
    update: { role: 'SELLER' },
  })

  let aiSuggestedMin: number | null = null
  let aiSuggestedMax: number | null = null
  let aiReasoning: string | null = null
  let swapValueEstimate: number | null = null

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
    if (data.mode === 'SWAP') {
      swapValueEstimate = ai.fair
    }
  } catch {
    // AI failure shouldn't block listing creation
  }

  const co2Saved = calculateCO2Saved(data.category)
  const isSwap = data.mode === 'SWAP'

  const listing = await prisma.listing.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      condition: data.condition,
      originalPrice: data.originalPrice,
      startingBid: isSwap ? 0 : (data as FlashData).startingBid ?? 0,
      photos: data.photos,
      sellerId: user.id,
      state: data.state,
      mode: isSwap ? 'SWAP' : 'FLASH',
      // Swap: 72-hour timer set immediately; Flash: null until first bid
      endsAt: isSwap ? new Date(Date.now() + 72 * 60 * 60 * 1000) : null,
      firstBidAt: null,
      swapWantedItem: isSwap ? (data as SwapData).swapWantedItem ?? null : null,
      swapWantedCategory: isSwap ? (data as SwapData).swapWantedCategory ?? null : null,
      swapOpenOffers: isSwap ? (data as SwapData).swapOpenOffers ?? false : false,
      swapAcceptCash: isSwap ? (data as SwapData).swapAcceptCash ?? true : false,
      swapMinCashTopup: isSwap ? (data as SwapData).swapMinCashTopup ?? null : null,
      swapValueEstimate,
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
