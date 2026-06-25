import { getLalamoveQuote } from './lalamove'

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
  source: 'lalamove' | 'none'
  covered: boolean              // false = Lalamove does not serve this route
}

/**
 * Delivery is Lalamove-only (door-to-door pickup + drop-off, fits the KASSIM model).
 * EasyParcel was removed — its OAuth approval never came through.
 * Lalamove rejects unservable routes (e.g. cross-sea), in which case covered=false
 * and the UI tells the buyer delivery is not available to their area.
 */
export async function getDeliveryQuote(
  sellerState: string,
  buyerState: string,
  weightKg: number,
  buyerPostcode?: string,
): Promise<DeliveryQuoteResult> {
  const lalamove = await getLalamoveQuote(sellerState, buyerState, weightKg, buyerPostcode)
  if (lalamove) {
    return { cheapest: lalamove.chargedPrice, couriers: [lalamove], source: 'lalamove', covered: true }
  }
  return { cheapest: 0, couriers: [], source: 'none', covered: false }
}
