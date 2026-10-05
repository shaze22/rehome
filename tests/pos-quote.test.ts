import { beforeAll, describe, expect, it } from 'vitest'
import { getSendParcelQuote, isSendParcelService } from '@/lib/sendparcel'

// Figures agreed against the Pos contract (quotation 23 June 2026) and verified on production.
describe('Pos Laju quote', () => {
  beforeAll(() => { process.env.SENDPARCEL_CLIENT_ID = 'test-client' })

  it('Klang Valley, 1kg: cost RM6.83 + 40% margin = RM9.56', () => {
    const q = getSendParcelQuote('Selangor', 'Selangor', 1)
    expect(q?.basePrice).toBe(6.83)
    expect(q?.markup).toBe(2.73)
    expect(q?.chargedPrice).toBe(9.56)
  })

  it('peninsular inter-state costs the same as Klang Valley for a light parcel', () => {
    expect(getSendParcelQuote('Selangor', 'Johor', 1)?.chargedPrice).toBe(9.56)
  })

  it('Peninsular to Sabah, 1kg: cost RM15.52 + 28% margin = RM19.87', () => {
    const q = getSendParcelQuote('Selangor', 'Sabah', 1)
    expect(q?.basePrice).toBe(15.52)
    expect(q?.chargedPrice).toBe(19.87)
  })

  it('never charges less than it costs', () => {
    for (const to of ['Selangor', 'Johor', 'Sabah', 'Sarawak']) {
      for (const kg of [0.2, 1, 2, 5, 12, 30]) {
        const q = getSendParcelQuote('Selangor', to, kg)
        expect(q, `${to} ${kg}kg`).not.toBeNull()
        expect(q!.chargedPrice).toBeGreaterThan(q!.basePrice)
        expect(q!.chargedPrice).toBeCloseTo(q!.basePrice + q!.markup, 2)
      }
    }
  })

  it('heavier parcels never get cheaper', () => {
    let last = 0
    for (const kg of [1, 2, 3, 5, 10, 20, 30]) {
      const price = getSendParcelQuote('Selangor', 'Sabah', kg)!.chargedPrice
      expect(price).toBeGreaterThanOrEqual(last)
      last = price
    }
  })

  it('refuses parcels over 30kg', () => {
    expect(getSendParcelQuote('Selangor', 'Selangor', 30.5)).toBeNull()
  })

  it('stays hidden when Pos credentials are not configured', () => {
    const saved = process.env.SENDPARCEL_CLIENT_ID
    delete process.env.SENDPARCEL_CLIENT_ID
    expect(getSendParcelQuote('Selangor', 'Selangor', 1)).toBeNull()
    process.env.SENDPARCEL_CLIENT_ID = saved
  })

  it('recognises the Pos service id', () => {
    expect(isSendParcelService('pos_standard')).toBe(true)
    expect(isSendParcelService('lalamove_MOTORCYCLE')).toBe(false)
    expect(isSendParcelService(null)).toBe(false)
  })
})
