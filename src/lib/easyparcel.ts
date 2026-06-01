import { calculateDeliveryQuote } from './delivery'
import { getLalamoveQuote } from './lalamove'

// State capital postcodes for EasyParcel rate lookup
const STATE_POSTCODE: Record<string, string> = {
  'Johor': '80000',
  'Kedah': '05000',
  'Kelantan': '15000',
  'Kuala Lumpur': '50000',
  'Labuan': '87000',
  'Melaka': '75000',
  'Negeri Sembilan': '70000',
  'Pahang': '25000',
  'Perak': '30000',
  'Perlis': '01000',
  'Pulau Pinang': '10000',
  'Putrajaya': '62000',
  'Sabah': '88000',
  'Sarawak': '93000',
  'Selangor': '40000',
  'Terengganu': '20000',
}

export interface CourierRate {
  courierName: string
  serviceName: string
  price: number
}

export interface DeliveryQuoteResult {
  cheapest: number
  couriers: CourierRate[]
  source: 'easyparcel' | 'lalamove' | 'fallback'
}

async function getEasyParcelRates(
  sellerState: string,
  buyerState: string,
  weightKg: number,
): Promise<CourierRate[]> {
  const apiKey = process.env.EASYPARCEL_API_KEY
  const pickCode = STATE_POSTCODE[sellerState]
  const sendCode = STATE_POSTCODE[buyerState]
  if (!apiKey || !pickCode || !sendCode) return []

  try {
    const res = await fetch('https://api.easyparcel.com/api/CheckingScheduledRates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        bulk: [{ pick_code: pickCode, send_code: sendCode, weight: Math.max(0.5, weightKg) }],
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return []

    const json = await res.json()
    const rates: Array<{ courier_name: string; service_name: string; price: string }> =
      json?.payload?.[0]?.rates ?? []

    return rates
      .map(r => ({ courierName: r.courier_name, serviceName: r.service_name, price: parseFloat(r.price) }))
      .filter(r => r.price > 0)
  } catch {
    return []
  }
}

export async function getDeliveryQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
): Promise<DeliveryQuoteResult> {
  // Run EasyParcel + Lalamove in parallel
  const [epRates, lalamoveRate] = await Promise.all([
    getEasyParcelRates(sellerState, buyerState, weightKg),
    getLalamoveQuote(sellerState, buyerState, weightKg),
  ])

  const allCouriers: CourierRate[] = [...epRates]
  if (lalamoveRate) allCouriers.push(lalamoveRate)
  allCouriers.sort((a, b) => a.price - b.price)

  if (allCouriers.length > 0) {
    const source = epRates.length > 0 ? 'easyparcel' : 'lalamove'
    return { cheapest: allCouriers[0].price, couriers: allCouriers, source }
  }

  // Fallback: hardcoded rates
  const fallbackPrice = calculateDeliveryQuote(sellerState, buyerState)
  return {
    cheapest: fallbackPrice,
    couriers: [{ courierName: 'J&T / Pos Laju', serviceName: 'Standard (anggaran)', price: fallbackPrice }],
    source: 'fallback',
  }
}
