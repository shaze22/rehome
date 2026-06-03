import crypto from 'crypto'

interface LalamoveRate {
  courierName: string
  serviceName: string
  price: number
}

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

function serviceType(weightKg: number) {
  if (weightKg < 3) return 'MOTORCYCLE'
  if (weightKg < 25) return 'CAR'
  return 'VAN'
}

function weightCategory(weightKg: number) {
  if (weightKg < 3) return 'LESS_THAN_3KG'
  if (weightKg < 10) return 'LESS_THAN_10KG'
  if (weightKg < 20) return 'LESS_THAN_20KG'
  return 'LESS_THAN_50KG'
}

function buildAuthHeader(apiKey: string, apiSecret: string, body: string) {
  const ts = Date.now().toString()
  const raw = `POST\n${ts}\n\nPOST /v3/quotations\n${body}`
  const sig = crypto.createHmac('sha256', apiSecret).update(raw).digest('hex')
  return {
    'Authorization': `hmac id="${apiKey}", nonce="${ts}", ts="${ts}", ver="1.3", sig="${sig}"`,
    'Market': 'MY',
    'Request-ID': `${ts}-${Math.random().toString(36).slice(2, 8)}`,
    'Content-Type': 'application/json',
  }
}

export async function getLalamoveQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
): Promise<LalamoveRate | null> {
  const apiKey = process.env.LALAMOVE_API_KEY
  const apiSecret = process.env.LALAMOVE_API_SECRET
  if (!apiKey || !apiSecret) return null

  const pickup = STATE_COORDS[sellerState]
  const dropoff = STATE_COORDS[buyerState]
  if (!pickup || !dropoff) return null

  const svcType = serviceType(weightKg)
  const payload = {
    serviceType: svcType,
    language: 'ms_MY',
    stops: [
      { coordinates: { lat: pickup.lat, lng: pickup.lng }, address: pickup.city },
      { coordinates: { lat: dropoff.lat, lng: dropoff.lng }, address: dropoff.city },
    ],
    item: {
      quantity: '1',
      weight: weightCategory(weightKg),
      categories: ['ELECTRONICS_AND_GADGETS'],
      handlingInstructions: [],
    },
  }

  const body = JSON.stringify(payload)
  const headers = buildAuthHeader(apiKey, apiSecret, body)
  const base = process.env.LALAMOVE_SANDBOX === 'true'
    ? 'https://sandbox-rest.lalamove.com'
    : 'https://rest.lalamove.com'

  try {
    const res = await fetch(`${base}/v3/quotations`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const json = await res.json()
    const price = parseFloat(json?.data?.priceBreakdown?.total ?? '0')
    if (price <= 0) return null

    const label = svcType === 'MOTORCYCLE' ? 'Motor' : svcType === 'CAR' ? 'Kereta' : 'Van'
    return { courierName: 'Lalamove', serviceName: `Same-Day Express (${label})`, price }
  } catch {
    return null
  }
}
