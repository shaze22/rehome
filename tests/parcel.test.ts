import { describe, expect, it } from 'vitest'
import { CATEGORY_DIMENSIONS, chargeableWeight, dimsFor, effectiveDims, volumetricKg } from '@/lib/parcelDimensions'

describe('parcel dimensions', () => {
  it('volumetric weight is L x W x H / 5000', () => {
    expect(volumetricKg({ l: 60, w: 50, h: 40 })).toBe(24)
  })

  it('falls back to OTHERS for an unknown or missing category', () => {
    expect(dimsFor('NOT_A_CATEGORY')).toEqual(CATEGORY_DIMENSIONS.OTHERS)
    expect(dimsFor(undefined)).toEqual(CATEGORY_DIMENSIONS.OTHERS)
  })

  it('uses seller dimensions only when all three are positive', () => {
    expect(effectiveDims('BOOKS', { l: 10, w: 10, h: 10 })).toEqual({ l: 10, w: 10, h: 10 })
    expect(effectiveDims('BOOKS', { l: 10, w: 10, h: 0 })).toEqual(CATEGORY_DIMENSIONS.BOOKS)
    expect(effectiveDims('BOOKS', { l: 10 })).toEqual(CATEGORY_DIMENSIONS.BOOKS)
    expect(effectiveDims('BOOKS', null)).toEqual(CATEGORY_DIMENSIONS.BOOKS)
  })

  it('bills the larger of actual and volumetric weight', () => {
    // a bulky but light box is billed on volume
    expect(chargeableWeight('OTHERS', 0.5, { l: 60, w: 50, h: 40 })).toBe(24)
    // a small heavy item is billed on the scale
    expect(chargeableWeight('BOOKS', 5)).toBe(5)
  })

  it('treats a missing weight as 1kg rather than free', () => {
    expect(chargeableWeight('BOOKS', 0)).toBe(1)
  })
})
