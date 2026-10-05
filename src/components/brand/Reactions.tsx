import { Kassim } from './Kassim'

const COINS = [
  { left: 8, delay: 0 },
  { left: 22, delay: 0.12 },
  { left: 36, delay: 0.04 },
  { left: 50, delay: 0.2 },
  { left: 64, delay: 0.08 },
  { left: 78, delay: 0.16 },
  { left: 90, delay: 0.02 },
]

/** Gold coins popping up from whatever it is placed over. Parent must be `relative`. */
export function CoinBurst() {
  return (
    <div className="absolute inset-x-0 top-0 h-0 pointer-events-none" aria-hidden>
      {COINS.map((c, i) => (
        <span key={i} className="coin-pop" style={{ left: `${c.left}%`, animationDelay: `${c.delay}s` }} />
      ))}
    </div>
  )
}

/** Shown to a bidder who has just been overtaken. */
export function OutbidNotice({ currentBid }: { currentBid: number }) {
  return (
    <div
      className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl kassim-nudge"
      style={{ backgroundColor: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.35)' }}
      role="status"
    >
      <Kassim pose="head-shock" width={44} className="flex-shrink-0" />
      <div>
        <p className="text-sm font-bold" style={{ color: 'var(--orange)' }}>You have been outbid!</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Someone went to RM {currentBid.toFixed(0)}. The door is still closing. Bid again to take it back.
        </p>
      </div>
    </div>
  )
}
