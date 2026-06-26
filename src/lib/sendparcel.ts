import type { CourierRate } from './courier'
import { effectiveDims } from './parcelDimensions'

function baseUrl(): string {
  return process.env.SENDPARCEL_ENV === 'production'
    ? 'https://posapi.pos.com.my'
    : 'https://api-dev.pos.com.my'
}

// ── OAuth2 token cache (client_credentials, 24h TTL) ──────────────────────────
let _token: string | null = null
let _tokenExpiry = 0
let _refreshing: Promise<string | null> | null = null

async function getToken(): Promise<string | null> {
  const id = process.env.SENDPARCEL_CLIENT_ID
  const secret = process.env.SENDPARCEL_CLIENT_SECRET
  if (!id || !secret) return null
  if (_token && Date.now() < _tokenExpiry - 60_000) return _token
  if (_refreshing) return _refreshing

  _refreshing = (async () => {
    try {
      const res = await fetch(`${baseUrl()}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const json = await res.json() as { access_token?: string; expires_in?: number }
      _token = json.access_token ?? null
      _tokenExpiry = Date.now() + (json.expires_in ?? 86400) * 1000
      return _token
    } catch {
      return null
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

// ── State helpers ─────────────────────────────────────────────────────────────
const EAST_MALAYSIA = ['Sabah', 'Sarawak', 'Labuan']

// Our state value → Pos Malaysia state name (WP prefix for federal territories).
const POS_STATE: Record<string, string> = {
  'Kuala Lumpur': 'WP Kuala Lumpur',
  'Putrajaya': 'WP Putrajaya',
  'Labuan': 'WP Labuan',
}
function posState(state: string): string {
  return POS_STATE[state] ?? state
}

// State → capital city (Pos needs a city; we only collect state + postcode).
const STATE_CITY: Record<string, string> = {
  'Johor': 'Johor Bahru', 'Kedah': 'Alor Setar', 'Kelantan': 'Kota Bharu',
  'Kuala Lumpur': 'Kuala Lumpur', 'Labuan': 'Labuan', 'Melaka': 'Melaka',
  'Negeri Sembilan': 'Seremban', 'Pahang': 'Kuantan', 'Perak': 'Ipoh',
  'Perlis': 'Kangar', 'Pulau Pinang': 'Georgetown', 'Putrajaya': 'Putrajaya',
  'Sabah': 'Kota Kinabalu', 'Sarawak': 'Kuching', 'Selangor': 'Shah Alam',
  'Terengganu': 'Kuala Terengganu',
}
function cityFor(state: string): string {
  return STATE_CITY[state] ?? state
}

// State capital postcode — fallback when a party has no saved postcode (Pos requires
// postcode that matches state).
const STATE_POSTCODE: Record<string, string> = {
  'Johor': '80000', 'Kedah': '05000', 'Kelantan': '15000', 'Kuala Lumpur': '50000',
  'Labuan': '87000', 'Melaka': '75000', 'Negeri Sembilan': '70000', 'Pahang': '25000',
  'Perak': '30000', 'Perlis': '01000', 'Pulau Pinang': '10000', 'Putrajaya': '62000',
  'Sabah': '88000', 'Sarawak': '93000', 'Selangor': '40000', 'Terengganu': '20000',
}
function postcodeFor(state: string, postcode?: string): string {
  return (postcode && /^\d{5}$/.test(postcode)) ? postcode : (STATE_POSTCODE[state] ?? '50000')
}

// Malaysian local number (0123456789) -> E.164 (+60123456789)
function toE164(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('60')) return `+${digits}`
  return `+60${digits.replace(/^0/, '')}`
}

// ── Quote — Pos Malaysia contract rates (UVW Group quotation, 23 Jun 2026, Appendix A) ──
// No live rate API exists, so we compute from the signed contract rate card.
const FUEL_SURCHARGE = 0.15  // domestic fuel surcharge (reviewed weekly — update from pos.com.my)
const SST = 0.08             // service tax on courier services (Pos bills this on top)

// Tiered markup: higher % on cheap routes (small absolute RM, conversion-insensitive);
// lighter % on already-expensive Sabah/Sarawak routes to keep East Malaysia affordable.
const MARKUP_CHEAP = 0.40    // Zone 1/2/3
const MARKUP_EAST = 0.28     // Zone 4/5

// Raw Pos base rate (RM, before fuel + SST) and the markup tier, by zone + chargeable weight.
function posQuoteParts(sellerState: string, buyerState: string, billedKg: number): { raw: number; markupRate: number } {
  const sEast = EAST_MALAYSIA.includes(sellerState)
  const bEast = EAST_MALAYSIA.includes(buyerState)
  // Zone 1/2/3 — within Klang Valley, between Peninsular states, or within the SAME state
  // (incl. within-state Sabah/Sarawak). First 2kg RM5.50, +RM1.00/kg thereafter.
  if (sellerState === buyerState || (!sEast && !bEast)) {
    return { raw: 5.50 + Math.max(0, billedKg - 2) * 1.00, markupRate: MARKUP_CHEAP }
  }
  // Zone 4 — Peninsular → Sabah/Sarawak. First 1kg RM12.50, +RM10.00/kg.
  if (!sEast && bEast) return { raw: 12.50 + (billedKg - 1) * 10.00, markupRate: MARKUP_EAST }
  // Zone 5 — Sabah/Sarawak → Peninsular, or between Sabah & Sarawak. First 1kg RM11.50, +RM8.00/kg.
  return { raw: 11.50 + (billedKg - 1) * 8.00, markupRate: MARKUP_EAST }
}

/**
 * Pos Laju standard domestic quote as a CourierRate, matching the courier picker shape.
 * Covers ALL of Malaysia incl. Sabah/Sarawak. basePrice = contract rate + fuel surcharge
 * + SST (the platform's true cost). markup = tiered margin on top. Max 30kg.
 */
export function getSendParcelQuote(sellerState: string, buyerState: string, weightKg: number): CourierRate | null {
  // Only offer Pos when configured — otherwise the quote would show but booking
  // (which needs the OAuth creds) would fail. Keeps Pos hidden until creds are set.
  if (!process.env.SENDPARCEL_CLIENT_ID) return null
  if (!sellerState || !buyerState) return null
  if ((weightKg || 1) > 30) return null  // Pos rejects > 30kg — leave it to Lalamove (lorry)

  const billedKg = Math.min(30, Math.max(1, Math.ceil(weightKg || 1)))
  const { raw, markupRate } = posQuoteParts(sellerState, buyerState, billedKg)
  const base = Math.round(raw * (1 + FUEL_SURCHARGE) * (1 + SST) * 100) / 100  // platform's true cost
  const markup = Math.round(base * markupRate * 100) / 100
  return {
    id: 'pos_standard',
    courierName: 'Pos Laju',
    serviceName: 'Standard (nationwide)',
    basePrice: base,
    chargedPrice: Math.round((base + markup) * 100) / 100,
    markup,
    eta: '2-4 working days',
  }
}

// ── Create Order ──────────────────────────────────────────────────────────────
export interface SendParcelParty {
  name: string
  phone: string
  address1: string
  state: string
  postcode: string
  city?: string
}

export interface SendParcelOrderInput {
  sender: SendParcelParty
  receiver: SendParcelParty
  weightKg: number
  category?: string             // fallback dimensions when dims not provided
  dims?: { l: number; w: number; h: number } | null  // seller-entered parcel dimensions (cm)
  itemDescription: string
  merchantOrderNumber: string   // unique per merchant (listing id)
  declaredValue?: number
}

export interface SendParcelOrderResult {
  trackingNo: string
  trackingUrl: string | null
  labelUrl: string | null
}

function party(p: SendParcelParty) {
  return {
    name: (p.name || 'KASSIM User').slice(0, 100),
    phone_number: toE164(p.phone),
    address: {
      // address1 must be 5–800 chars; fall back to "City, State" when no street saved.
      address1: (p.address1 && p.address1.length >= 5 ? p.address1 : `${cityFor(p.state)}, ${posState(p.state)}`).slice(0, 800),
      address2: '',
      area: '',
      city: (p.city || cityFor(p.state)).slice(0, 300),
      state: posState(p.state),
      address_type: 'Home',
      country: 'MY',
      postcode: postcodeFor(p.state, p.postcode),
    },
  }
}

export async function createSendParcelOrder(input: SendParcelOrderInput): Promise<SendParcelOrderResult | null> {
  const token = await getToken()
  if (!token) return null

  const payload = {
    account_number: process.env.SENDPARCEL_ACCOUNT_NO,
    product_code: '80000000',           // Pos Laju standard domestic
    item_type: '2',                     // Parcel
    parcel: 'domestic',
    webhook: false,
    service_level: 'Standard',
    subscription_code: process.env.SENDPARCEL_SUBSCRIPTION ?? 'UVWGroup',
    platform: 'API',
    mps: false,
    reference: {
      merchant_order_number: input.merchantOrderNumber.slice(0, 50),
      merchant_reference_number: input.merchantOrderNumber.slice(0, 50),
    },
    // Drop-off model: seller prints the consignment label and drops the parcel at any
    // Pos office. (Per-seller courier pickup is impractical for scattered C2C sellers.)
    pickup: {
      required: false,
    },
    sender: { display_address: '', hide_sender_address: false, ...party(input.sender) },
    receiver: party(input.receiver),
    parcel_details: [
      {
        weight: Math.min(30, Math.max(0.1, input.weightKg || 1)),
        length: effectiveDims(input.category, input.dims).l,   // seller dims, else category default (cm)
        width: effectiveDims(input.category, input.dims).w,
        height: effectiveDims(input.category, input.dims).h,
        item_count: 1,
        parcel_notes: '',
        item_category_details: '02',    // Sale of goods
        details: [
          {
            item_description: (input.itemDescription || 'Pre-loved item').slice(0, 50),
            quantity: 1,
            value: input.declaredValue ?? 0,
          },
        ],
      },
    ],
  }

  try {
    const res = await fetch(`${baseUrl()}/api/order/v2.1/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    })
    const json = await res.json().catch(() => ({})) as {
      data?: { tracking_no?: string; tracking_url?: string; consignment?: { pdf?: string } }
      reason?: string[]; message?: string
    }
    if (!res.ok || !json.data?.tracking_no) {
      console.error('[sendparcel] create failed:', res.status, json.message, json.reason)
      return null
    }
    return {
      trackingNo: json.data.tracking_no,
      trackingUrl: json.data.tracking_url ?? null,
      labelUrl: json.data.consignment?.pdf ?? null,
    }
  } catch (err) {
    console.error('[sendparcel] create error:', err)
    return null
  }
}

export function isSendParcelService(courierServiceId?: string | null): boolean {
  return courierServiceId === 'pos_standard'
}
