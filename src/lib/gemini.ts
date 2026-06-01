import { GoogleGenerativeAI, Part } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url)
  const buffer = await res.arrayBuffer()
  const mimeType = res.headers.get('content-type') ?? 'image/jpeg'
  const data = Buffer.from(buffer).toString('base64')
  return { data, mimeType }
}

export interface PhotoAnalysis {
  conditionScore: number
  issues: string[]
  title: string
  description: string
  isPhotoValid: boolean
  invalidReason?: string
}

export async function analyzeItemPhotos(photoUrls: string[], category: string): Promise<PhotoAnalysis> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const imageParts: Part[] = await Promise.all(
    photoUrls.slice(0, 3).map(async (url) => {
      const { data, mimeType } = await urlToBase64(url)
      return { inlineData: { data, mimeType } } as Part
    })
  )

  const prompt = `Kau adalah pakar penilaian barangan terpakai Malaysia. Analisa gambar-gambar ini dan balas JSON sahaja:

{
  "conditionScore": <integer 1-10, 10=seperti baru>,
  "issues": ["senarai kerosakan/masalah yang nampak, max 4, dalam BM"],
  "title": "<tajuk listing ringkas & menarik dalam BM, max 60 chars>",
  "description": "<penerangan 2-3 ayat tentang keadaan barang dalam BM>",
  "isPhotoValid": <true jika gambar jelas tunjuk barang, false jika blur/gelap/salah item>,
  "invalidReason": "<sebab tidak sah, atau null>"
}

Kategori barang: ${category}
Panduan skor: 9-10=hampir baru, 7-8=baik, 5-6=sederhana, 3-4=lusuh, 1-2=rosak teruk`

  const result = await model.generateContent([...imageParts, prompt])
  const text = result.response.text()
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Invalid AI response')
  return JSON.parse(match[0]) as PhotoAnalysis
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

Analyze this item and suggest a fair starting bid range for a Malaysian online auction platform (BALLOUT):

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
