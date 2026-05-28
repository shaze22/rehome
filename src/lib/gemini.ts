import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function geminiGenerate(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
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
