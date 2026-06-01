'use client'

import { useState } from 'react'

export function FeeCalculator() {
  const [price, setPrice] = useState(500)
  const FEE_RATE = 0.15
  const fee = Math.round(price * FEE_RATE)
  const payout = price - fee

  return (
    <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-lg font-bold mb-1">Earnings Calculator</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Drag the slider to see how much you&apos;ll earn</p>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Sale Price</label>
          <span className="text-xl font-bold font-mono" style={{ color: 'var(--teal)' }}>RM {price.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={50}
          max={5000}
          step={50}
          value={price}
          onChange={e => setPrice(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: 'var(--teal)' }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span>RM 50</span>
          <span>RM 5,000</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sale price</span>
          <span className="font-mono font-medium">RM {price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 px-3 rounded-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Platform fee (15%)</span>
          <span className="font-mono text-sm" style={{ color: 'var(--red)' }}>− RM {fee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-3 px-3 rounded-lg font-bold" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <span style={{ color: 'var(--teal)' }}>You receive</span>
          <span className="font-mono text-xl" style={{ color: 'var(--teal)' }}>RM {payout.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        💡 <strong>Swap</strong> listings have 0% platform fee
      </p>
    </div>
  )
}
