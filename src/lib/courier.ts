import { getLalamoveQuote, postcodeToState } from './lalamove'
import { getSendParcelQuote } from './sendparcel'

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
  cheapest: number              // chargedPrice of cheapest option (0 when uncovered)
  couriers: CourierRate[]
  source: 'lalamove' | 'pos' | 'mixed' | 'none'
  covered: boolean              // false = no courier serves this route
}

/**
 * Two delivery providers run in parallel and the buyer picks:
 *  - Lalamove — same-day, door-to-door, intra-city (premium; no Sabah coverage).
 *  - Pos Laju (SendParcel) — standard parcel, cheaper, nationwide incl. Sabah/Sarawak.
 * Pos has no rate API (fixed contract estimate). If NEITHER serves the route,
 * covered=false and the UI offers self-pickup.
 */
export async function getDeliveryQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
  buyerPostcode?: string,
): Promise<DeliveryQuoteResult> {
  const effBuyerState = (buyerState && buyerState.trim()) || postcodeToState(buyerPostcode) || ''
  const lalamove = await getLalamoveQuote(sellerState, buyerState, weightKg, buyerPostcode)
  const pos = getSendParcelQuote(sellerState, effBuyerState, weightKg)

  const couriers = [lalamove, pos].filter(Boolean) as CourierRate[]
  couriers.sort((a, b) => a.chargedPrice - b.chargedPrice)

  if (couriers.length === 0) {
    return { cheapest: 0, couriers: [], source: 'none', covered: false }
  }
  const source = lalamove && pos ? 'mixed' as const : pos ? 'pos' as const : 'lalamove' as const
  return { cheapest: couriers[0].chargedPrice, couriers, source, covered: true }
}
