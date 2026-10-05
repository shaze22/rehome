'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'

interface DCourierRate { id: string; courierName: string; serviceName: string; basePrice: number; chargedPrice: number; markup: number; eta?: string }

// Above this, delivery is flagged as expensive (typically inter-state) and the
// buyer must explicitly acknowledge before paying.
export const HIGH_DELIVERY = 50

export function DeliveryCheckout({ listingId, bidAmount, sellerState, initialPhone, initialPostcode, initialAddress }: { listingId: string; bidAmount: number; sellerState: string; initialPhone?: string; initialPostcode?: string; initialAddress?: string }) {
  const [credit, setCredit] = useState(0)
  const [postcode, setPostcode] = useState(initialPostcode ?? '')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [address, setAddress] = useState(initialAddress ?? '')
  const [quotes, setQuotes] = useState<DCourierRate[] | null>(null)
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [selected, setSelected] = useState<DCourierRate | null>(null)
  const [covered, setCovered] = useState(true)
  const [ackHighCost, setAckHighCost] = useState(false)
  const [pickup, setPickup] = useState(false)  // self-pickup fallback for Lalamove-uncovered areas

  const step = !postcode || postcode.length < 5 ? 1
    : pickup ? (phone.length < 10 ? 3 : 4)
    : !selected ? 2
    : !phone || phone.length < 10 || !address || address.length < 10 ? 3
    : 4

  const STEPS = ['Postcode', 'Courier', 'Your Details', 'Pay']

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(d => setCredit(d.creditBalance ?? 0)).catch(() => {})
  }, [])

  useEffect(() => {
    if (postcode.length !== 5 || !/^\d{5}$/.test(postcode)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- an invalid postcode clears the previous quotes
      setQuotes(null); setSelected(null); return
    }
    setQuotesLoading(true)
    const t = setTimeout(() => {
      fetch(`/api/listings/${listingId}/delivery-quote?buyerState=${sellerState}&buyerPostcode=${postcode}`)
        .then(r => r.json())
        .then((d: { couriers?: DCourierRate[]; covered?: boolean }) => {
          const list = d.couriers ?? []
          setQuotes(list)
          setSelected(list[0] ?? null)
          setCovered(d.covered !== false)
          setAckHighCost(false)
          setPickup(false)
        })
        .catch(() => setQuotes(null))
        .finally(() => setQuotesLoading(false))
    }, 500)
    return () => clearTimeout(t)
  }, [postcode, listingId, sellerState])

  const discount = Math.min(credit, Math.max(0, bidAmount - 1))
  const deliveryFee = pickup ? 0 : (selected?.chargedPrice ?? 0)
  // Buyer pays: bid amount + delivery only. Platform fee (15%) is deducted from seller's payout, not charged to buyer.
  const total = bidAmount - discount + deliveryFee

  const isHighCost = !pickup && (selected?.chargedPrice ?? 0) >= HIGH_DELIVERY
  const ready = pickup
    ? phone.length >= 10
    : (selected !== null && phone.length >= 10 && address.length >= 10 && (!isHighCost || ackHighCost))

  const checkoutParams = new URLSearchParams({ listingId })
  if (pickup) {
    checkoutParams.set('pickup', '1')
    checkoutParams.set('buyerPhone', phone)
    if (postcode) checkoutParams.set('buyerPostcode', postcode)
  } else if (selected) {
    checkoutParams.set('deliveryFee', selected.chargedPrice.toString())
    checkoutParams.set('deliveryBase', selected.basePrice.toString())
    checkoutParams.set('deliveryMarkup', selected.markup.toString())
    checkoutParams.set('courierName', selected.courierName)
    checkoutParams.set('courierService', selected.serviceName)
    checkoutParams.set('courierServiceId', selected.id)
    checkoutParams.set('buyerPostcode', postcode)
    checkoutParams.set('buyerPhone', phone)
    checkoutParams.set('buyerAddress', address.slice(0, 490))
  }

  return (
    <div className="space-y-3">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{
                backgroundColor: i + 1 <= step ? 'var(--teal)' : 'var(--bg-elevated)',
                color: i + 1 <= step ? 'white' : 'var(--text-muted)',
                border: i + 1 === step ? '2px solid var(--teal)' : '2px solid transparent',
              }}>
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className="text-xs mt-0.5 text-center leading-none" style={{ color: i + 1 === step ? 'var(--teal)' : 'var(--text-muted)', fontSize: '9px' }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-0.5 flex-1 mb-3 rounded" style={{ backgroundColor: i + 1 < step ? 'var(--teal)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Delivery header — only shown when postcode not yet entered */}
      {step === 1 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: 'rgba(79,140,255,0.08)', border: '1px solid rgba(79,140,255,0.2)', color: 'var(--text-secondary)' }}>
          <Package className="w-3 h-3 inline -mt-0.5" /> <span>All orders via KASSIM platform. Enter your postcode to see courier rates.</span>
        </div>
      )}

      <div className="space-y-2">
          {/* Postcode */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Your postcode</label>
            <input
              type="text" inputMode="numeric" maxLength={5} value={postcode}
              onChange={e => setPostcode(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 50480"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Courier picker */}
          {quotesLoading && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Getting courier rates...</p>
          )}
          {quotes && quotes.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Select courier</label>
              <div className="space-y-1.5">
                {quotes.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelected(c)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: selected?.id === c.id ? 'rgba(79,140,255,0.12)' : 'var(--bg-elevated)',
                      border: selected?.id === c.id ? '1px solid rgba(79,140,255,0.5)' : '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}>
                    <span>
                      <span className="font-medium">{c.courierName}</span>
                      <span style={{ color: 'var(--text-muted)' }}> · {c.serviceName}</span>
                      {c.eta && <span className="ml-1" style={{ color: 'var(--text-muted)' }}>({c.eta})</span>}
                    </span>
                    <span className="font-mono font-bold" style={{ color: 'var(--teal)' }}>RM {c.chargedPrice.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {quotes && quotes.length === 0 && covered && !pickup && (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)' }}>
              No rates found. Please double-check your postcode.
            </p>
          )}
          {quotes && quotes.length === 0 && !covered && !pickup && (
            <div className="space-y-2">
              <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red)' }}>
                Lalamove does not deliver to your area.
              </p>
              <button type="button" onClick={() => setPickup(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-left"
                style={{ backgroundColor: 'rgba(0,217,165,0.08)', border: '1px solid rgba(0,217,165,0.3)', color: 'var(--text-primary)' }}>
                <Package className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--green)' }} />
                <span><strong>Self-pickup instead</strong> — collect the item from the seller. No delivery fee. Tap to choose.</span>
              </button>
            </div>
          )}
          {pickup && (
            <div className="px-3 py-2.5 rounded-lg text-xs space-y-1" style={{ backgroundColor: 'rgba(0,217,165,0.08)', border: '1px solid rgba(0,217,165,0.3)' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--green)' }}><Package className="w-3.5 h-3.5" /> Self-Pickup selected</span>
                <button type="button" onClick={() => setPickup(false)} className="underline" style={{ color: 'var(--text-muted)' }}>change</button>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>Arrange a meet-up with the seller after payment. Your payment stays in escrow until you confirm you have collected the item. No delivery fee.</p>
            </div>
          )}

          {/* Contact & address */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0123456789"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          {!pickup && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Delivery address</label>
              <textarea
                value={address} onChange={e => setAddress(e.target.value)}
                placeholder="Full address including unit, street, city"
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}
        </div>

      {/* Payment summary */}
      {(selected || pickup) && (
        <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Winning bid</span>
            <span className="font-mono">RM {bidAmount.toFixed(0)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between" style={{ color: 'var(--teal)' }}>
              <span>Credit discount</span>
              <span className="font-mono">− RM {discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>{pickup ? 'Self-pickup' : `Delivery (${selected?.courierName ?? ''})`}</span>
            <span className="font-mono">{pickup ? 'Free' : `RM ${deliveryFee.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between pt-1.5 font-bold" style={{ borderTop: '1px solid var(--border)', color: 'var(--teal)' }}>
            <span>Total you pay</span>
            <span className="font-mono">RM {total.toFixed(2)}</span>
          </div>
          <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>15% platform fee is deducted from the seller&apos;s payout, not charged to you.</p>
        </div>
      )}

      {/* High delivery cost — require explicit acknowledgement before paying */}
      {selected && isHighCost && (
        <label className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs cursor-pointer" style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.4)' }}>
          <input type="checkbox" checked={ackHighCost} onChange={e => setAckHighCost(e.target.checked)} className="mt-0.5" style={{ accentColor: 'var(--yellow)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Delivery costs <strong style={{ color: 'var(--yellow)' }}>RM {deliveryFee.toFixed(2)}</strong> because the seller is far away (inter-state). Are you sure? Tick to confirm you want to proceed.
          </span>
        </label>
      )}

      <Link
        href={ready ? `/api/payment/checkout?${checkoutParams.toString()}` : '#'}
        className={`block w-full text-center py-3 rounded-xl font-semibold text-white gradient-teal ${!ready ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {!ready
          ? (pickup ? 'Enter your phone number' : 'Fill in delivery details')
          : total === 0
            ? 'Confirm Self-Pickup (Free)'
            : `Proceed to Payment: RM ${total.toFixed(2)}`}
      </Link>
    </div>
  )
}
