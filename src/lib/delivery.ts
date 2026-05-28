const PENINSULAR_STATES = [
  'Selangor', 'Kuala Lumpur', 'Putrajaya', 'Johor', 'Kedah', 'Kelantan',
  'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Terengganu',
]

const EAST_MALAYSIA_STATES = ['Sabah', 'Sarawak', 'Labuan']

export function calculateDeliveryQuote(sellerState: string, buyerState: string): number {
  if (sellerState === buyerState) return 8
  const buyerEast = EAST_MALAYSIA_STATES.includes(buyerState)
  const sellerEast = EAST_MALAYSIA_STATES.includes(sellerState)
  if (buyerEast || sellerEast) return 20
  return 12
}

export const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka',
  'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang',
  'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
]
