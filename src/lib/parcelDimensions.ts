// Parcel dimensions + volumetric weight (client-safe — no server deps so the sell
// form can import the same defaults the server prices with). Pos bills on actual OR
// volumetric weight (L×W×H / 5000), whichever is higher.

export type Dims = { l: number; w: number; h: number }

// Typical parcel size per category (cm) — pre-fills the sell form and is the fallback
// when a listing has no seller-entered dimensions. Sized so light items in cheap zones
// are unaffected (Pos is flat for the first 2kg) while bulky categories get a floor.
export const CATEGORY_DIMENSIONS: Record<string, Dims> = {
  FURNITURE: { l: 45, w: 35, h: 25 },   // ~7.9 kg
  ELECTRONICS: { l: 25, w: 20, h: 10 }, // ~1.0 kg
  FASHION: { l: 30, w: 22, h: 6 },      // ~0.8 kg
  BOOKS: { l: 25, w: 18, h: 4 },        // ~0.4 kg
  SPORTS: { l: 40, w: 30, h: 15 },      // ~3.6 kg
  KITCHEN: { l: 30, w: 25, h: 18 },     // ~2.7 kg
  OTHERS: { l: 25, w: 20, h: 10 },      // ~1.0 kg (neutral)
}

export function dimsFor(category?: string): Dims {
  return CATEGORY_DIMENSIONS[category ?? 'OTHERS'] ?? CATEGORY_DIMENSIONS.OTHERS
}

export function volumetricKg(d: Dims): number {
  return (d.l * d.w * d.h) / 5000
}

// Real seller dimensions when all three are present & positive, otherwise the
// category default.
export function effectiveDims(category: string | undefined, real?: Partial<Dims> | null): Dims {
  if (real && (real.l ?? 0) > 0 && (real.w ?? 0) > 0 && (real.h ?? 0) > 0) {
    return { l: real.l as number, w: real.w as number, h: real.h as number }
  }
  return dimsFor(category)
}

// Chargeable weight = max(actual, volumetric) — what Pos (and a sensible courier) bills on.
export function chargeableWeight(category: string | undefined, weightKg: number, real?: Partial<Dims> | null): number {
  return Math.max(weightKg || 1, volumetricKg(effectiveDims(category, real)))
}
