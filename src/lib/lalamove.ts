import crypto from 'crypto'
import type { CourierRate } from './easyparcel'

const MARKUP = 0.30

// State capital coordinates — used as pickup/dropoff approximation since we only
// collect postcode + state (no full geocoding). Lalamove requires lat/lng per stop.
const STATE_COORDS: Record<string, { lat: string; lng: string; city: string }> = {
  'Johor': { lat: '1.4927', lng: '103.7414', city: 'Johor Bahru' },
  'Kedah': { lat: '6.1248', lng: '100.3678', city: 'Alor Setar' },
  'Kelantan': { lat: '6.1254', lng: '102.2381', city: 'Kota Bharu' },
  'Kuala Lumpur': { lat: '3.1390', lng: '101.6869', city: 'Kuala Lumpur' },
  'Labuan': { lat: '5.2831', lng: '115.2308', city: 'Labuan' },
  'Melaka': { lat: '2.1896', lng: '102.2501', city: 'Melaka' },
  'Negeri Sembilan': { lat: '2.7297', lng: '101.9381', city: 'Seremban' },
  'Pahang': { lat: '3.8077', lng: '103.3260', city: 'Kuantan' },
  'Perak': { lat: '4.5975', lng: '101.0901', city: 'Ipoh' },
  'Perlis': { lat: '6.4414', lng: '100.1986', city: 'Kangar' },
  'Pulau Pinang': { lat: '5.4141', lng: '100.3288', city: 'Georgetown' },
  'Putrajaya': { lat: '2.9264', lng: '101.6964', city: 'Putrajaya' },
  'Sabah': { lat: '5.9788', lng: '116.0753', city: 'Kota Kinabalu' },
  'Sarawak': { lat: '1.5533', lng: '110.3592', city: 'Kuching' },
  'Selangor': { lat: '3.0733', lng: '101.5185', city: 'Shah Alam' },
  'Terengganu': { lat: '5.3117', lng: '103.1324', city: 'Kuala Terengganu' },
}

// Resolve a Malaysian state from a 5-digit postcode (first 2 digits → state region).
// Used when buyerState is unknown but buyerPostcode is provided, so Lalamove gets
// usable dropoff coordinates. Approximate but covers all standard postcode ranges.
export function postcodeToState(postcode?: string | null): string | null {
  const pc = parseInt((postcode ?? '').replace(/\D/g, '').slice(0, 5), 10)
  if (!pc || pc < 1000) return null
  if (pc <= 2800) return 'Perlis'
  if (pc <= 9810) return 'Kedah'
  if (pc <= 14400) return 'Pulau Pinang'
  if (pc <= 18500) return 'Kelantan'
  if (pc <= 24300) return 'Terengganu'
  if (pc <= 28800) return 'Pahang'
  if (pc <= 36810) return 'Perak'
  if (pc <= 39200) return 'Pahang'
  if (pc >= 40000 && pc <= 48300) return 'Selangor'
  if (pc >= 50000 && pc <= 60000) return 'Kuala Lumpur'
  if (pc >= 62000 && pc <= 62988) return 'Putrajaya'
  if (pc >= 63000 && pc <= 68100) return 'Selangor'
  if (pc >= 69000 && pc <= 69100) return 'Pahang'
  if (pc >= 70000 && pc <= 73509) return 'Negeri Sembilan'
  if (pc >= 75000 && pc <= 78309) return 'Melaka'
  if (pc >= 79000 && pc <= 86900) return 'Johor'
  if (pc >= 87000 && pc <= 87033) return 'Labuan'
  if (pc >= 88000 && pc <= 91309) return 'Sabah'
  if (pc >= 93000 && pc <= 98859) return 'Sarawak'
  return null
}

function serviceType(weightKg: number): 'MOTORCYCLE' | 'CAR' | 'VAN' {
  if (weightKg < 3) return 'MOTORCYCLE'
  if (weightKg < 25) return 'CAR'
  return 'VAN'
}

function serviceLabel(svc: 'MOTORCYCLE' | 'CAR' | 'VAN'): string {
  if (svc === 'MOTORCYCLE') return 'Motorcycle'
  if (svc === 'CAR') return 'Car'
  return 'Van'
}

function baseUrl(): string {
  return process.env.LALAMOVE_SANDBOX === 'true'
    ? 'https://rest.sandbox.lalamove.com'
    : 'https://rest.lalamove.com'
}

// Lalamove API v3 HMAC signing.
// rawSignature = `${time}\r\n${METHOD}\r\n${path}\r\n\r\n${body}`
// Authorization: hmac <apiKey>:<time>:<HMAC-SHA256(rawSignature, secret) hex>
function signedHeaders(method: string, path: string, body: string): Record<string, string> | null {
  const apiKey = process.env.LALAMOVE_API_KEY
  const apiSecret = process.env.LALAMOVE_API_SECRET
  if (!apiKey || !apiSecret) return null

  const time = Date.now().toString()
  const rawSignature = `${time}\r\n${method}\r\n${path}\r\n\r\n${body}`
  const signature = crypto.createHmac('sha256', apiSecret).update(rawSignature).digest('hex')

  return {
    'Authorization': `hmac ${apiKey}:${time}:${signature}`,
    'Market': 'MY',
    'Content-Type': 'application/json',
    'Request-ID': `${time}-${crypto.randomBytes(4).toString('hex')}`,
  }
}

// Malaysian local number (0123456789) -> E.164 (+60123456789)
function toE164(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('60')) return `+${digits}`
  return `+60${digits.replace(/^0/, '')}`
}

interface QuotationData {
  quotationId: string
  priceTotal: number
  currency: string
  stops: Array<{ stopId: string }>
}

async function requestQuotation(
  svc: 'MOTORCYCLE' | 'CAR' | 'VAN',
  pickup: { lat: string; lng: string; city: string },
  dropoff: { lat: string; lng: string; city: string; address: string },
): Promise<QuotationData | null> {
  const path = '/v3/quotations'
  const payload = {
    data: {
      serviceType: svc,
      language: 'en_MY',
      stops: [
        { coordinates: { lat: pickup.lat, lng: pickup.lng }, address: pickup.city },
        { coordinates: { lat: dropoff.lat, lng: dropoff.lng }, address: dropoff.address || dropoff.city },
      ],
    },
  }
  const body = JSON.stringify(payload)
  const headers = signedHeaders('POST', path, body)
  if (!headers) return null

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const json = await res.json() as {
      data?: {
        quotationId?: string
        priceBreakdown?: { total?: string; currency?: string }
        stops?: Array<{ stopId?: string }>
      }
    }
    const d = json?.data
    const total = parseFloat(d?.priceBreakdown?.total ?? '0')
    if (!d?.quotationId || total <= 0) return null
    const stops = (d.stops ?? []).map(s => ({ stopId: s.stopId ?? '' }))
    if (stops.length < 2 || !stops[0].stopId || !stops[1].stopId) return null

    return {
      quotationId: d.quotationId,
      priceTotal: total,
      currency: d.priceBreakdown?.currency ?? 'MYR',
      stops,
    }
  } catch {
    return null
  }
}

/**
 * Get a Lalamove same-day quote as a CourierRate (with 30% markup applied),
 * matching the EasyParcel courier shape so it merges into the picker.
 * Returns null if Lalamove is unconfigured or does not serve the route.
 */
export async function getLalamoveQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
  buyerPostcode?: string,
  buyerAddress?: string,
): Promise<CourierRate | null> {
  // Postcode is the most reliable buyer location (buyerState is sometimes unset or
  // mirrors sellerState in the post-win UI), so resolve from postcode first.
  const effectiveBuyerState = postcodeToState(buyerPostcode) ?? (STATE_COORDS[buyerState] ? buyerState : null)
  const pickup = STATE_COORDS[sellerState]
  const dropoff = effectiveBuyerState ? STATE_COORDS[effectiveBuyerState] : undefined
  if (!pickup || !dropoff) return null

  const svc = serviceType(weightKg)
  const quote = await requestQuotation(svc, pickup, { ...dropoff, address: buyerAddress ?? dropoff.city })
  if (!quote) return null

  const base = Math.round(quote.priceTotal * 100) / 100
  const markup = Math.round(base * MARKUP * 100) / 100
  return {
    id: `lalamove_${svc}`,
    courierName: 'Lalamove',
    serviceName: `Same-Day Express (${serviceLabel(svc)})`,
    basePrice: base,
    chargedPrice: Math.round((base + markup) * 100) / 100,
    markup,
    eta: 'Same day',
  }
}

export interface LalamoveOrderInput {
  sellerState: string
  buyerState: string
  buyerPostcode?: string
  weightKg: number
  fromName: string
  fromPhone: string
  toName: string
  toPhone: string
  toAddress: string
  remarks?: string
}

export interface LalamoveOrderResult {
  orderId: string
  shareUrl: string | null
}

/**
 * Place a Lalamove order. Lalamove quotations expire (~5 min), so we request a
 * fresh quotation here to obtain a current quotationId + stop ids before placing.
 * Returns null on any failure (caller should fall back to manual booking email).
 */
export async function createLalamoveOrder(input: LalamoveOrderInput): Promise<LalamoveOrderResult | null> {
  const effectiveBuyerState = postcodeToState(input.buyerPostcode) ?? (STATE_COORDS[input.buyerState] ? input.buyerState : null)
  const pickup = STATE_COORDS[input.sellerState]
  const dropoff = effectiveBuyerState ? STATE_COORDS[effectiveBuyerState] : undefined
  if (!pickup || !dropoff) return null

  const svc = serviceType(input.weightKg)
  const quote = await requestQuotation(svc, pickup, { ...dropoff, address: input.toAddress || dropoff.city })
  if (!quote) return null

  const fromPhone = toE164(input.fromPhone)
  const toPhone = toE164(input.toPhone)
  if (!fromPhone || !toPhone) return null

  const path = '/v3/orders'
  const payload = {
    data: {
      quotationId: quote.quotationId,
      sender: {
        stopId: quote.stops[0].stopId,
        name: input.fromName.slice(0, 100),
        phone: fromPhone,
      },
      recipients: [
        {
          stopId: quote.stops[1].stopId,
          name: input.toName.slice(0, 100),
          phone: toPhone,
          remarks: (input.remarks ?? '').slice(0, 100),
        },
      ],
    },
  }
  const body = JSON.stringify(payload)
  const headers = signedHeaders('POST', path, body)
  if (!headers) return null

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      console.error('[lalamove] placeOrder failed:', res.status)
      return null
    }
    const json = await res.json() as { data?: { orderId?: string; shareLink?: string } }
    const orderId = json?.data?.orderId
    if (!orderId) return null
    return { orderId, shareUrl: json.data?.shareLink ?? null }
  } catch (err) {
    console.error('[lalamove] placeOrder error:', err)
    return null
  }
}

export function isLalamoveService(courierServiceId?: string | null): boolean {
  return !!courierServiceId && courierServiceId.startsWith('lalamove_')
}
