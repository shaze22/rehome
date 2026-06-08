import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const FETCH_TIMEOUT_MS = 8000

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
    return { data: Buffer.from(buffer).toString('base64'), mimeType }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export interface PhotoAnalysis {
  conditionScore: number
  issues: string[]
  title: string
  description: string
  category?: string
  isPhotoValid: boolean
  invalidReason?: string
}

export async function analyzeItemPhotos(photoUrls: string[], category: string): Promise<PhotoAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const imageResults = await Promise.all(photoUrls.slice(0, 3).map(urlToBase64))
  const imageParts: Part[] = imageResults
    .filter((r): r is { data: string; mimeType: string } => r !== null)
    .map(({ data, mimeType }) => ({ inlineData: { data, mimeType } } as Part))

  if (imageParts.length === 0) {
    return { conditionScore: 5, issues: [], title: '', description: '', isPhotoValid: false, invalidReason: 'Could not load image.' }
  }

  const prompt = `You are a Malaysian pre-loved item condition expert. Analyze these photos and reply with JSON only:

{
  "conditionScore": <integer 1-10, 10=like new>,
  "issues": ["list of visible damage/issues, max 4, in English"],
  "title": "<concise & attractive listing title in English, max 60 chars>",
  "description": "<2-3 sentence description of the item condition in English>",
  "category": "<one of: FURNITURE, ELECTRONICS, FASHION, BOOKS, SPORTS, KITCHEN, OTHERS>",
  "isPhotoValid": <true if photo clearly shows the item, false if blurry/dark/wrong item>,
  "invalidReason": "<reason if invalid, or null>"
}

Hint category: ${category}
Score guide: 9-10=near new, 7-8=good, 5-6=average, 3-4=worn, 1-2=heavily damaged`

  const result = await model.generateContent([...imageParts, prompt])
  const text = result.response.text()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid AI response')
  return JSON.parse(match[0]) as PhotoAnalysis
}

export interface SwapSuggestion {
  suggestedItems: string[]
  suggestedCategories: string[]
  valueSuggestion: string
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export async function getSwapSuggestions(params: {
  title: string
  category: string
  condition: number
  estimatedValue: number
}): Promise<SwapSuggestion> {
  const prompt = `You are a Malaysian barter/item-swap expert. A user wants to swap the following item:

Item: ${params.title}
Category: ${params.category}
Condition: ${params.condition}/10
Estimated value: RM ${params.estimatedValue}

Suggest suitable items to swap based on the Malaysian market (Mudah.my, Carousell, Facebook Marketplace). Consider equivalent value and current demand.

Reply with JSON only:
{
  "suggestedItems": ["<specific item 1>", "<specific item 2>", "<specific item 3>"],
  "suggestedCategories": ["<category 1>", "<category 2>"],
  "valueSuggestion": "<equivalent value suggestion in English, 1 sentence>",
  "reasoning": "<why this suggestion makes sense, 2 sentences in English>",
  "confidence": "<'high' | 'medium' | 'low'>"
}`

  const text = await geminiGenerate(prompt)
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid AI response')
  return JSON.parse(match[0]) as SwapSuggestion
}

export interface AIPriceSuggestion {
  low: number
  fair: number
  high: number
  suggested_min: number
  suggested_max: number
  reasoning: string
}

export async function getAIPriceSuggestion(params: {
  category: string
  condition: number
  originalPrice: number
  state: string
}): Promise<AIPriceSuggestion> {
  const prompt = `You are an expert in Malaysian second-hand goods pricing and circular economy market analysis.

Analyze this item and suggest a fair starting bid range for a Malaysian online auction platform (KASSIM):

Item Details:
- Category: ${params.category}
- Condition Score: ${params.condition}/10 (10 = brand new, 1 = heavily worn)
- Original Retail Price: RM ${params.originalPrice}
- Seller Location: ${params.state}, Malaysia

Consider:
1. Malaysian second-hand market trends (Mudah.my, Carousel, Facebook Marketplace)
2. Depreciation curves for this category in Malaysia
3. Local demand signals
4. Condition-based value adjustment

Return ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "low": <conservative starting bid in whole RM>,
  "fair": <fair market starting bid in whole RM>,
  "high": <premium starting bid for high-demand in whole RM>,
  "suggested_min": <recommended minimum starting bid in whole RM>,
  "suggested_max": <recommended maximum starting bid in whole RM>,
  "reasoning": "<brief 1-2 sentence explanation in English>"
}`

  const text = await geminiGenerate(prompt)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned) as AIPriceSuggestion
}
