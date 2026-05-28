import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

export const PLATFORM_FEE_PERCENT = 0.15

export function calculateFees(amount: number) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100
  const sellerPayout = Math.round((amount - platformFee) * 100) / 100
  return { platformFee, sellerPayout }
}
