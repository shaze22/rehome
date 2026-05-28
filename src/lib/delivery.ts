const EAST_MALAYSIA_STATES = ['Sabah', 'Sarawak', 'Labuan']

const COURIER_MARKUP = 0.30
const PLATFORM_FEE_RATE = 0.15

export function calculateBaseDelivery(sellerState: string, buyerState: string): number {
  if (sellerState === buyerState) return 8
  const buyerEast = EAST_MALAYSIA_STATES.includes(buyerState)
  const sellerEast = EAST_MALAYSIA_STATES.includes(sellerState)
  if (buyerEast || sellerEast) return 20
  return 12
}

export function calculateDeliveryQuote(sellerState: string, buyerState: string): number {
  const base = calculateBaseDelivery(sellerState, buyerState)
  return Math.round(base * (1 + COURIER_MARKUP) * 100) / 100
}

export function calculateDeliveryMarkup(sellerState: string, buyerState: string): number {
  const base = calculateBaseDelivery(sellerState, buyerState)
  return Math.round(base * COURIER_MARKUP * 100) / 100
}

export function calculatePlatformFee(bidAmount: number): number {
  return Math.round(bidAmount * PLATFORM_FEE_RATE * 100) / 100
}

export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]
