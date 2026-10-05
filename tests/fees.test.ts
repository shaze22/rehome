import { describe, expect, it } from 'vitest'
import { calculatePlatformFee, calculateBaseDelivery, calculateDeliveryQuote, calculateDeliveryMarkup } from '@/lib/delivery'

describe('platform fee (seller pays 15%)', () => {
  it('is 15% of the winning bid', () => {
    expect(calculatePlatformFee(100)).toBe(15)
    expect(calculatePlatformFee(500)).toBe(75)
  })

  it('is nothing on a RM0 win', () => {
    expect(calculatePlatformFee(0)).toBe(0)
  })

  it('rounds to whole sen', () => {
    expect(calculatePlatformFee(33)).toBe(4.95)
    expect(calculatePlatformFee(1)).toBe(0.15)
    expect(calculatePlatformFee(7)).toBe(1.05)
  })
})

describe('fallback delivery table', () => {
  it('prices same-state, peninsular and East Malaysia separately', () => {
    expect(calculateBaseDelivery('Selangor', 'Selangor')).toBe(8)
    expect(calculateBaseDelivery('Selangor', 'Johor')).toBe(12)
    expect(calculateBaseDelivery('Selangor', 'Sabah')).toBe(20)
    expect(calculateBaseDelivery('Sarawak', 'Kuala Lumpur')).toBe(20)
  })

  it('adds a 30% markup, and quote = base + markup', () => {
    expect(calculateDeliveryQuote('Selangor', 'Johor')).toBe(15.6)
    expect(calculateDeliveryMarkup('Selangor', 'Johor')).toBe(3.6)
    for (const [from, to] of [['Selangor', 'Selangor'], ['Selangor', 'Johor'], ['Selangor', 'Sabah']] as const) {
      const sum = calculateBaseDelivery(from, to) + calculateDeliveryMarkup(from, to)
      expect(calculateDeliveryQuote(from, to)).toBeCloseTo(sum, 2)
    }
  })
})

import { calculateFees } from '@/lib/stripe'

describe('seller payout split', () => {
  it('fee plus payout always equals the amount charged', () => {
    for (const amount of [0, 1, 7, 33, 99.99, 250, 1234.56]) {
      const { platformFee, sellerPayout } = calculateFees(amount)
      expect(platformFee + sellerPayout).toBeCloseTo(amount, 2)
      expect(sellerPayout).toBeGreaterThanOrEqual(0)
    }
  })

  it('matches the fee shown to sellers', () => {
    expect(calculateFees(500)).toEqual({ platformFee: 75, sellerPayout: 425 })
  })
})
