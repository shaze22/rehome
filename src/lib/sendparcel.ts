import type { CourierRate } from './courier'

const MARKUP = 0.30

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

// ── Quote (no rate API — fixed Pos Laju estimate by zone + weight) ─────────────
// Tune these to your actual SendParcel contract rate card. Buyer pays the quote;
// platform pays Pos the contract rate; the 30% markup absorbs the variance.
const POS_BASE = { peninsular: 7, mixed: 11, east: 9 }   // first 1 kg
const POS_PERKG = { peninsular: 2, mixed: 5, east: 3 }   // each additional kg

function zone(sellerState: string, buyerState: string): 'peninsular' | 'mixed' | 'east' {
  const sEast = EAST_MALAYSIA.includes(sellerState)
  const bEast = EAST_MALAYSIA.includes(buyerState)
  if (sEast && bEast) return 'east'
  if (sEast || bEast) return 'mixed'
  return 'peninsular'
}

/**
 * Pos Laju standard domestic quote as a CourierRate (with 30% markup), matching
 * the courier picker shape. Covers ALL of Malaysia incl. Sabah/Sarawak.
 */
export function getSendParcelQuote(sellerState: string, buyerState: string, weightKg: number): CourierRate | null {
  // Only offer Pos when configured — otherwise the quote would show but booking
  // (which needs the OAuth creds) would fail. Keeps Pos hidden until creds are set.
  if (!process.env.SENDPARCEL_CLIENT_ID) return null
  if (!sellerState || !buyerState) return null
  const z = zone(sellerState, buyerState)
  const billedKg = Math.min(30, Math.max(1, Math.ceil(weightKg || 1)))
  const base = POS_BASE[z] + (billedKg - 1) * POS_PERKG[z]
  const markup = Math.round(base * MARKUP * 100) / 100
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
    pickup: {
      required: true,
      timeslot: { start_time: '09:00', end_time: '18:00' },
    },
    sender: { display_address: '', hide_sender_address: false, ...party(input.sender) },
    receiver: party(input.receiver),
    parcel_details: [
      {
        weight: Math.min(30, Math.max(0.1, input.weightKg || 1)),
        length: 20, width: 15, height: 10,
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
