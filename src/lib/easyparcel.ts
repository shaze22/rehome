import { calculateDeliveryQuote } from './delivery'
import { getLalamoveQuote } from './lalamove'

const EP_BASE = 'https://api.easyparcel.com'
const MARKUP = 0.30

// In-memory token cache (survives across requests in same Node.js instance)
let _token: string | null = null
let _tokenExpiry = 0
// Shared promise prevents concurrent requests from each triggering a separate OAuth call
let _refreshing: Promise<string | null> | null = null

async function getToken(): Promise<string | null> {
  const clientId = process.env.EASYPARCEL_CLIENT_ID
  const clientSecret = process.env.EASYPARCEL_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  if (_token && Date.now() < _tokenExpiry - 60_000) return _token
  if (_refreshing) return _refreshing

  _refreshing = (async () => {
    try {
      const res = await fetch(`${EP_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const json = await res.json() as { access_token?: string; expires_in?: number }
      _token = json.access_token ?? null
      _tokenExpiry = Date.now() + (json.expires_in ?? 3600) * 1000
      return _token
    } catch {
      return null
    } finally {
      _refreshing = null
    }
  })()

  return _refreshing
}

// State capital postcodes for approximation when actual postcode unavailable
export const STATE_POSTCODE: Record<string, string> = {
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
  id: string
  courierName: string
  serviceName: string
  basePrice: number     // what platform pays courier
  chargedPrice: number  // what buyer pays (with 30% markup)
  markup: number        // platform's cut
  eta?: string
}

export interface DeliveryQuoteResult {
  cheapest: number  // chargedPrice of cheapest option
  couriers: CourierRate[]
  source: 'easyparcel' | 'lalamove' | 'fallback'
}

async function fetchEasyParcelRates(
  fromPostcode: string,
  toPostcode: string,
  weightKg: number,
): Promise<CourierRate[]> {
  const token = await getToken()
  if (!token) return []

  try {
    const res = await fetch(`${EP_BASE}/api/CheckingScheduledRates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        bulk: [{
          pick_code: fromPostcode,
          send_code: toPostcode,
          weight: Math.max(0.5, weightKg),
        }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const json = await res.json() as {
      payload?: Array<{
        rates?: Array<{ service_id?: string; courier_name: string; service_name: string; price: string; eta?: string }>
      }>
    }
    const rates = json?.payload?.[0]?.rates ?? []

    return rates
      .map(r => {
        const base = parseFloat(r.price)
        const markup = Math.round(base * MARKUP * 100) / 100
        return {
          id: r.service_id ?? `${r.courier_name}_${r.service_name}`,
          courierName: r.courier_name,
          serviceName: r.service_name,
          basePrice: base,
          chargedPrice: Math.round((base + markup) * 100) / 100,
          markup,
          eta: r.eta,
        }
      })
      .filter(r => r.basePrice > 0)
  } catch {
    return []
  }
}

export async function getDeliveryQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
  buyerPostcode?: string,
): Promise<DeliveryQuoteResult> {
  const fromPostcode = STATE_POSTCODE[sellerState] ?? '50000'
  const toPostcode = buyerPostcode ?? (buyerState ? STATE_POSTCODE[buyerState] : null) ?? '50000'

  // Fetch EasyParcel (parcel couriers) and Lalamove (same-day) in parallel.
  const [epCouriers, lalamove] = await Promise.all([
    fetchEasyParcelRates(fromPostcode, toPostcode, weightKg),
    getLalamoveQuote(sellerState, buyerState, weightKg, buyerPostcode),
  ])

  const allCouriers = [...epCouriers, ...(lalamove ? [lalamove] : [])]
  allCouriers.sort((a, b) => a.chargedPrice - b.chargedPrice)

  if (allCouriers.length > 0) {
    const source = epCouriers.length > 0 ? 'easyparcel' as const : 'lalamove' as const
    return { cheapest: allCouriers[0].chargedPrice, couriers: allCouriers, source }
  }

  // Fallback: hardcoded estimate + markup
  const fallbackCharged = calculateDeliveryQuote(sellerState, buyerState)
  const fallbackBase = Math.round(fallbackCharged / (1 + MARKUP) * 100) / 100
  return {
    cheapest: fallbackCharged,
    couriers: [{
      id: 'fallback_standard',
      courierName: 'J&T / Pos Laju',
      serviceName: 'Standard (estimate)',
      basePrice: fallbackBase,
      chargedPrice: fallbackCharged,
      markup: Math.round((fallbackCharged - fallbackBase) * 100) / 100,
    }],
    source: 'fallback',
  }
}

export interface ShipmentInput {
  fromName: string
  fromPhone: string
  fromAddress: string
  fromPostcode: string
  toName: string
  toPhone: string
  toAddress: string
  toPostcode: string
  serviceId: string
  weightKg: number
  description: string
  declaredValue?: number
}

export async function createEasyParcelShipment(input: ShipmentInput): Promise<string | null> {
  const token = await getToken()
  if (!token) return null

  try {
    const res = await fetch(`${EP_BASE}/api/placeOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        bulk: [{
          service_id: input.serviceId,
          pick_name: input.fromName,
          pick_contact: input.fromPhone,
          pick_addr1: input.fromAddress,
          pick_code: input.fromPostcode,
          pick_country: 'MY',
          send_name: input.toName,
          send_contact: input.toPhone,
          send_addr1: input.toAddress,
          send_code: input.toPostcode,
          send_country: 'MY',
          weight: Math.max(0.5, input.weightKg),
          content: input.description,
          value: input.declaredValue ?? 1,
        }],
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.error('[easyparcel] placeOrder failed:', res.status)
      return null
    }
    const json = await res.json() as { payload?: Array<{ order_number?: string }> }
    return json?.payload?.[0]?.order_number ?? null
  } catch (err) {
    console.error('[easyparcel] placeOrder error:', err)
    return null
  }
}
