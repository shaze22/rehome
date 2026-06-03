import Link from 'next/link'
import { ArrowRight, ChevronDown, Zap, ArrowLeftRight, Shield, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how KASSIM Flash Bid and Swap Bid work — step-by-step with real examples.',
}

/* ─── reusable atoms ─────────────────────────────────────────────────────── */

function StepBubble({ n, emoji, label, sub, color }: { n: number; emoji: string; label: string; sub: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center flex-1" style={{ minWidth: 80 }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 font-bold relative"
        style={{ background: `linear-gradient(135deg,${color}25,${color}10)`, border: `1.5px solid ${color}40` }}>
        {emoji}
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white"
          style={{ backgroundColor: color }}>
          {n}
        </span>
      </div>
      <p className="text-xs font-bold leading-tight">{label}</p>
      <p className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </div>
  )
}

function Arrow({ color }: { color: string }) {
  return (
    <div className="flex items-center" style={{ marginTop: '-20px', minWidth: 20 }}>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg,${color}60,${color}20)` }} />
      <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${color}50` }} />
    </div>
  )
}

function RuleCard({ emoji, title, desc, color }: { emoji: string; title: string; desc: string; color: string }) {
  return (
    <div className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: `${color}08`, border: `1px solid ${color}20` }}>
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <p className="text-sm font-semibold mb-0.5">{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      </div>
    </div>
  )
}

const FAQ = [
  { q: 'Is KASSIM safe? What if the seller doesn\'t ship?', a: 'All Flash Bid payments go into escrow — your money never touches the seller until you confirm receipt. For Swap Bid, the escrow tracks both shipments before marking the deal complete. No confirmation = no release.' },
  { q: 'What are the fees?', a: 'Flash Bid: 15% platform fee on the final winning bid. A RM0 winning bid costs RM0. Swap Bid: completely free — no listing fee, no platform cut. No subscription ever.' },
  { q: 'What if nobody bids on my Flash Bid?', a: 'Nothing bad happens. Your listing stays active indefinitely until someone places the first bid. No countdown, no pressure. You can withdraw any time before the first bid at no cost.' },
  { q: 'Can I swap items across different states?', a: 'Yes. Seller and buyer each ship their items via any courier. KASSIM supports all of Peninsular Malaysia and East Malaysia. Escrow releases only after both parties confirm receipt.' },
  { q: 'What is IC Verification and why does it matter?', a: 'Sellers who upload their MyKad photo and pass admin review receive a blue "IC Verified" badge. Verified sellers get significantly more bids — buyers trust a real identity. Takes 1-2 business days.' },
  { q: 'What is KASSIM Score?', a: 'Every user starts at 50. Score increases with successful transactions, good reviews, and fast response. It decreases when disputes are raised against you. A higher score means more trust from buyers and sellers.' },
  { q: 'What is SwapScore?', a: 'SwapScore starts at 4.0 and increases by 0.1 for each completed swap (max 5.0). 5 successful swaps unlocks the "Swap Verified" badge, shown on your profile and every listing you create.' },
  { q: 'What items can I list?', a: 'Any pre-loved item: Electronics, Furniture, Fashion, Books, Sports, Kitchen, and more. Prohibited: weapons, illegal goods, counterfeit products, or items requiring special permits.' },
  { q: 'How do I report a problem?', a: 'On the listing page, file a dispute from the escrow panel. Admin reviews within 3 business days. For urgent issues, use the WhatsApp support button on the bottom-left of every page.' },
]

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function HowItWorksPage() {
  const orange = '#ff6b35'
  const green = '#16a34a'

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* ── Header ── */}
      <div className="text-center mb-12">
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--teal)' }}>Platform Guide</p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">How KASSIM Works</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Two modes. Both protect your money. Both include delivery.
        </p>
      </div>

      {/* ── Quick Compare ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
        <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg,${orange}10,${orange}05)`, border: `1px solid ${orange}30` }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5" style={{ color: orange }} />
            <span className="font-black text-lg" style={{ color: orange }}>⚡ FLASH BID</span>
          </div>
          <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: orange }} /><span>Bid from <strong>RM0</strong> — sole bidder wins for free</span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: orange }} /><span>Timer only starts on <strong>first bid</strong></span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: orange }} /><span><strong>30 minutes</strong> to win from first bid</span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: orange }} /><span><strong>15% fee</strong> on final bid (RM0 bid = RM0 fee)</span></li>
          </ul>
          <p className="text-xs mt-3 font-medium" style={{ color: orange }}>Best for: Sell fast, get cash</p>
        </div>
        <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg,${green}10,${green}05)`, border: `1px solid ${green}30` }}>
          <div className="flex items-center gap-2 mb-3">
            <ArrowLeftRight className="w-5 h-5" style={{ color: green }} />
            <span className="font-black text-lg" style={{ color: green }}>🔄 SWAP BID</span>
          </div>
          <ul className="space-y-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} /><span>Offer <strong>cash, your item, or both</strong></span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} /><span><strong>72-hour</strong> offer window</span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} /><span>Counter-offer up to <strong>3 rounds</strong></span></li>
            <li className="flex gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: green }} /><span><strong>Free</strong> — no platform fee</span></li>
          </ul>
          <p className="text-xs mt-3 font-medium" style={{ color: green }}>Best for: Trade without spending cash</p>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* ── FLASH BID deep dive ── */}
      {/* ════════════════════════════════════════════════════ */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: `linear-gradient(135deg,${orange},#f59e0b)` }}>⚡</div>
          <div>
            <h2 className="text-xl font-black" style={{ color: orange }}>FLASH BID — Full Process</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sell fast. Winner decided in 30 minutes.</p>
          </div>
        </div>

        {/* Process diagram */}
        <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${orange}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Process Flow</p>

          {/* Desktop: horizontal. Mobile: vertical */}
          <div className="hidden sm:flex items-start gap-1 overflow-x-auto pb-2">
            <StepBubble n={1} emoji="📸" label="List Item" sub="RM0 start ok" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={2} emoji="🟢" label="Goes Live" sub="No timer yet" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={3} emoji="⚡" label="First Bid" sub="30:00 starts" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={4} emoji="🔥" label="Counter Bids" sub="+5min / +2.5min" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={5} emoji="🏆" label="Timer Ends" sub="Highest wins" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={6} emoji="💳" label="Buyer Pays" sub="Escrow holds" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={7} emoji="📦" label="You Ship" sub="Any courier" color={orange} />
            <Arrow color={orange} />
            <StepBubble n={8} emoji="💸" label="You Get Paid" sub="After confirm" color={orange} />
          </div>

          {/* Mobile vertical */}
          <div className="sm:hidden space-y-0">
            {[
              { n: 1, emoji: '📸', label: 'List Your Item', desc: 'Upload photos. Starting bid can be RM0. AI suggests fair price.' },
              { n: 2, emoji: '🟢', label: 'Goes Live Instantly', desc: 'No timer yet. Listing stays active indefinitely until first bid.' },
              { n: 3, emoji: '⚡', label: 'First Bid Placed', desc: '30-minute countdown STARTS. Bid minimum +RM1 from current.' },
              { n: 4, emoji: '🔥', label: 'Counter Bids', desc: 'Each counter adds +5min (1st) or +2.5min (subsequent). Cap: 30min from first bid.' },
              { n: 5, emoji: '🏆', label: 'Timer Hits Zero', desc: 'Highest bidder wins. If only one bidder, they win at their bid price.' },
              { n: 6, emoji: '💳', label: 'Buyer Pays via Stripe', desc: 'Funds held in secure escrow. Seller cannot touch it yet.' },
              { n: 7, emoji: '📦', label: 'Seller Ships', desc: 'Pack and ship via any courier. Enter tracking number in app.' },
              { n: 8, emoji: '💸', label: 'You Get Paid', desc: 'Buyer confirms receipt → escrow releases to seller. 15% fee deducted.' },
            ].map((s, i) => (
              <div key={s.n} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg relative" style={{ background: `${orange}15`, border: `1.5px solid ${orange}35` }}>
                    {s.emoji}
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: orange, fontSize: '9px' }}>{s.n}</span>
                  </div>
                  {i < 7 && <div className="w-px flex-1 my-1" style={{ backgroundColor: `${orange}30` }} />}
                </div>
                <div className="pb-4 pt-0.5">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timer mechanics visualised */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${orange}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Timer Mechanics</p>
          <div className="relative h-12 rounded-xl overflow-hidden mb-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {/* Base 30min bar */}
            <div className="absolute left-0 top-0 h-full flex items-center justify-center text-xs font-bold text-white rounded-xl"
              style={{ width: '60%', background: `linear-gradient(90deg,${orange},#f59e0b)` }}>
              First bid → 30:00
            </div>
            {/* +5min extension */}
            <div className="absolute top-0 h-full flex items-center justify-center text-xs font-bold text-white"
              style={{ left: '60%', width: '20%', backgroundColor: '#f97316', borderLeft: '2px dashed white' }}>
              +5:00
            </div>
            {/* +2.5min extensions */}
            <div className="absolute top-0 h-full flex items-center justify-center text-xs font-bold text-white rounded-r-xl"
              style={{ left: '80%', width: '20%', backgroundColor: '#ea580c', borderLeft: '2px dashed white' }}>
              +2:30…
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${orange}12` }}>
              <p className="font-bold" style={{ color: orange }}>First bid</p>
              <p style={{ color: 'var(--text-muted)' }}>Starts 30:00 timer</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#f9741612' }}>
              <p className="font-bold text-orange-500">1st counter</p>
              <p style={{ color: 'var(--text-muted)' }}>Adds +5 minutes</p>
            </div>
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#ea580c12' }}>
              <p className="font-bold text-orange-700">2nd+ counter</p>
              <p style={{ color: 'var(--text-muted)' }}>Adds +2.5 minutes</p>
            </div>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>Hard cap: auction cannot exceed <strong>30 minutes</strong> from first bid, regardless of counter bids.</p>
        </div>

        {/* Real scenario */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${orange}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Real Example</p>
          <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1e40af)' }}>📱</div>
            <div>
              <p className="font-semibold text-sm">MacBook Air M1 — listed by Hafiz</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Starting bid: RM0 · Condition: 8/10 · Electronics</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3 py-2">
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--text-muted)' }} />
              <div className="flex-1">
                <p style={{ color: 'var(--text-muted)' }}>Monday–Thursday: <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>0 bids. Listing stays live. No timer. No pressure.</span></p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ backgroundColor: `${orange}08` }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: orange }} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold">⚡ Ahmad bids <span style={{ color: orange }}>RM150</span></p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: `${orange}20`, color: orange }}>TIMER STARTS: 30:00</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Friday 9:04pm</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--text-muted)' }} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold">Siti bids <span style={{ color: orange }}>RM220</span></p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>+5min → 24:00</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>9:11pm</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: 'var(--text-muted)' }} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold">Ahmad bids <span style={{ color: orange }}>RM310</span></p>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>+2.5min → 6:30</span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>9:28pm</p>
              </div>
            </div>
            <div className="flex items-start gap-3 py-2 rounded-xl px-3" style={{ background: 'linear-gradient(135deg,rgba(255,107,53,0.12),rgba(245,158,11,0.08))', border: `1px solid ${orange}30` }}>
              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: orange }} />
              <div className="flex-1">
                <p className="font-bold" style={{ color: orange }}>🏆 Ahmad WINS at RM310</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>9:35pm — timer reached zero, no more bids</p>
              </div>
            </div>
          </div>
          {/* Payout breakdown */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-muted)' }}>Ahmad pays</p>
              <p className="font-bold text-base mt-0.5">RM310</p>
              <p style={{ color: 'var(--text-muted)' }}>+ 15% fee (RM46.50) = <strong>RM356.50</strong> total</p>
            </div>
            <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: `${orange}08`, border: `1px solid ${orange}25` }}>
              <p style={{ color: 'var(--text-muted)' }}>Hafiz receives</p>
              <p className="font-bold text-base mt-0.5" style={{ color: orange }}>RM263.50</p>
              <p style={{ color: 'var(--text-muted)' }}>RM310 − 15% (RM46.50)</p>
            </div>
          </div>
        </div>

        {/* Key rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <RuleCard emoji="🎯" title="RM0 starting bid is valid" desc="If you're the sole bidder at RM0, you win the item for free. The seller accepted RM0 as starting price." color={orange} />
          <RuleCard emoji="⏱" title="No timer before first bid" desc="Your listing stays active indefinitely. No pressure to promote quickly — it lives until someone bids." color={orange} />
          <RuleCard emoji="🔢" title="Bids must be whole numbers" desc="RM1 minimum increment. You cannot bid RM1.50 — only whole ringgit amounts." color={orange} />
          <RuleCard emoji="💳" title="15% fee on final bid only" desc="No listing fee, no monthly fee. KASSIM only earns when you earn. RM0 win = RM0 fee." color={orange} />
        </div>

        <Link href="/listings?mode=flash"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white"
          style={{ background: `linear-gradient(135deg,${orange},#f59e0b)`, boxShadow: `0 4px 20px ${orange}35` }}>
          Browse Flash Bid Listings <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ════════════════════════════════════════════════════ */}
      {/* ── SWAP BID deep dive ── */}
      {/* ════════════════════════════════════════════════════ */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: `linear-gradient(135deg,${green},#14b8a6)` }}>🔄</div>
          <div>
            <h2 className="text-xl font-black" style={{ color: green }}>SWAP BID — Full Process</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trade your item. No cash needed. 72-hour window.</p>
          </div>
        </div>

        {/* Process diagram */}
        <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${green}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Process Flow</p>

          {/* Desktop */}
          <div className="hidden sm:flex items-start gap-1 overflow-x-auto pb-2">
            <StepBubble n={1} emoji="📝" label="List + State Wants" sub="Item or open" color={green} />
            <Arrow color={green} />
            <StepBubble n={2} emoji="📬" label="Offers Arrive" sub="Cash/Swap/Hybrid" color={green} />
            <Arrow color={green} />
            <StepBubble n={3} emoji="💬" label="Counter (≤3x)" sub="Negotiate" color={green} />
            <Arrow color={green} />
            <StepBubble n={4} emoji="🤝" label="You Accept" sub="Best offer" color={green} />
            <Arrow color={green} />
            <StepBubble n={5} emoji="🔒" label="Escrow Active" sub="Locked in" color={green} />
            <Arrow color={green} />
            <StepBubble n={6} emoji="📦" label="Both Ship" sub="Track items" color={green} />
            <Arrow color={green} />
            <StepBubble n={7} emoji="✅" label="Both Confirm" sub="Receipt ok" color={green} />
            <Arrow color={green} />
            <StepBubble n={8} emoji="🌟" label="Complete!" sub="SwapScore ++" color={green} />
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-0">
            {[
              { n: 1, emoji: '📝', label: 'List Item + State What You Want', desc: 'Specify a specific item, a category, or "Open to all offers". Set AI-suggested value.' },
              { n: 2, emoji: '📬', label: 'Offers Start Arriving', desc: 'Buyers send Cash, Swap Bid, or Hybrid offers. Multiple can be open simultaneously.' },
              { n: 3, emoji: '💬', label: 'Review & Counter (up to 3 rounds)', desc: 'AI shows SwapMatch% score to help evaluate. Counter-offer to negotiate the best deal.' },
              { n: 4, emoji: '🤝', label: 'Accept the Best Offer', desc: 'All other offers are auto-rejected. Listing becomes SOLD.' },
              { n: 5, emoji: '🔒', label: 'Escrow Activates', desc: 'Both parties are locked in. Neither can back out without admin review.' },
              { n: 6, emoji: '📦', label: 'Both Parties Ship', desc: 'Each side ships their item with a tracking number. Cash-only swaps: only seller ships.' },
              { n: 7, emoji: '✅', label: 'Both Confirm Receipt', desc: 'Once both sides confirm items received in good condition, deal completes.' },
              { n: 8, emoji: '🌟', label: 'Complete! SwapScore Increases', desc: 'Your SwapScore goes up by 0.1. At 5 swaps, you earn the Swap Verified badge.' },
            ].map((s, i) => (
              <div key={s.n} className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg relative" style={{ background: `${green}15`, border: `1.5px solid ${green}35` }}>
                    {s.emoji}
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: green, fontSize: '9px' }}>{s.n}</span>
                  </div>
                  {i < 7 && <div className="w-px flex-1 my-1" style={{ backgroundColor: `${green}30` }} />}
                </div>
                <div className="pb-4 pt-0.5">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offer types */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${green}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>3 Types of Offers You Can Receive</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl text-center" style={{ background: `linear-gradient(135deg,${green}12,${green}06)`, border: `1px solid ${green}30` }}>
              <p className="text-2xl mb-2">💰</p>
              <p className="font-bold text-sm mb-1" style={{ color: green }}>Cash Offer</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Buyer offers a cash amount. Standard payment via Stripe escrow.</p>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Enable in listing settings</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(20,184,166,0.06))', border: '1px solid rgba(20,184,166,0.3)' }}>
              <p className="text-2xl mb-2">🔄</p>
              <p className="font-bold text-sm mb-1" style={{ color: 'var(--teal)' }}>Swap Bid</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Buyer offers their item. No money changes hands. Pure trade.</p>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Always available</p>
            </div>
            <div className="p-4 rounded-xl text-center" style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(168,85,247,0.05))', border: '1px solid rgba(168,85,247,0.25)' }}>
              <p className="text-2xl mb-2">🔄💰</p>
              <p className="font-bold text-sm mb-1" style={{ color: '#a855f7' }}>Hybrid</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Item + cash top-up. Perfect when values don't match exactly.</p>
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Set min top-up in listing</p>
            </div>
          </div>
        </div>

        {/* Real scenario */}
        <div className="rounded-2xl p-5 mb-5" style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${green}25` }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Real Example</p>
          <div className="flex items-center gap-3 mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,#5b21b6,#7c3aed)' }}>👓</div>
            <div>
              <p className="font-semibold text-sm">Vintage Glasses — listed by Razif</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI value: ~RM180 · Wants: Electronics or Camera · Fashion</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {/* Offer 1 */}
            <div className="p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <p className="font-semibold">Offer #1 — Farah</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(20,184,166,0.1)', color: 'var(--teal)' }}>🔄 Swap Bid</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Offers: Sony WH-1000XM5 earphones (est. value RM280)</p>
              <div className="mt-2 ml-3 pl-3 border-l-2 space-y-1.5" style={{ borderColor: `${green}40` }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Razif counters: &ldquo;Add RM50 cash top-up, value difference.&rdquo;</p>
                <p className="text-xs font-medium" style={{ color: green }}>Farah accepts → Sony earphones + RM50 cash top-up</p>
              </div>
            </div>
            {/* Offer 2 (rejected) */}
            <div className="p-3 rounded-xl opacity-50" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <p className="font-semibold">Offer #2 — Kamal</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>Auto-rejected</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Offered: RM120 cash only (below estimated value)</p>
            </div>
          </div>
          {/* What happens next */}
          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: `linear-gradient(135deg,${green}10,rgba(20,184,166,0.08))`, border: `1px solid ${green}25` }}>
            <p className="font-semibold mb-2" style={{ color: green }}>What happens next:</p>
            <div className="space-y-1" style={{ color: 'var(--text-secondary)' }}>
              <p>📦 Razif ships vintage glasses to Farah</p>
              <p>📦 Farah ships Sony earphones to Razif + transfers RM50 via escrow</p>
              <p>✅ Both confirm receipt within 7 days</p>
              <p className="font-medium" style={{ color: green }}>🌟 Deal complete. Razif SwapScore: 4.0 → 4.1</p>
            </div>
          </div>
        </div>

        {/* Key rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <RuleCard emoji="🤖" title="AI SwapMatch Score" desc="When reviewing offers, KASSIM AI shows a match percentage based on your stated wants and the offered item's value. Helps you pick the best deal." color={green} />
          <RuleCard emoji="3️⃣" title="Max 3 counter rounds" desc="Each offer allows up to 3 counter-offer rounds. After 3, you must Accept or Reject — no more negotiation." color={green} />
          <RuleCard emoji="🚫" title="Only one offer active per user" desc="Each buyer can only have one pending or countered offer per listing at a time. Keeps negotiations clean." color={green} />
          <RuleCard emoji="🌟" title="SwapScore grows with each deal" desc="4.0 base → +0.1 per completed swap → max 5.0. Reach 5 swaps for Swap Verified badge, shown on every listing." color={green} />
        </div>

        <Link href="/listings?mode=swap"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white"
          style={{ background: `linear-gradient(135deg,${green},#14b8a6)`, boxShadow: `0 4px 20px ${green}35` }}>
          Browse Swap Listings <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      {/* ── Escrow / Safety section ── */}
      <section className="mb-14">
        <div className="rounded-2xl p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.07),rgba(22,163,74,0.07))', border: '1px solid rgba(20,184,166,0.25)' }}>
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-8 h-8" style={{ color: 'var(--teal)' }} />
            <div>
              <h2 className="text-xl font-bold">KASSIM Shield — How Your Money Is Protected</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Escrow holds funds until both parties are satisfied.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: '1', icon: '💳', title: 'Buyer Pays', desc: 'Payment goes to KASSIM escrow, not the seller. Seller cannot access until delivery confirmed.' },
              { step: '2', icon: '📦', title: 'Seller Ships', desc: 'Seller ships the item and enters the tracking number. Escrow still locked.' },
              { step: '3', icon: '✅', title: 'Buyer Confirms', desc: 'Buyer confirms item received. Only then does escrow release payment to seller.' },
            ].map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white gradient-teal">{s.step}</div>
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.icon} {s.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-xl text-xs text-center" style={{ backgroundColor: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)', color: 'var(--text-secondary)' }}>
            If a dispute arises at any step, either party can file a dispute. KASSIM admin reviews and resolves within 3 business days.
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <details key={i} className="rounded-xl overflow-hidden group" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-sm select-none gap-3">
                <span>{item.q}</span>
                <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-open:rotate-180" style={{ color: 'var(--text-muted)' }} />
              </summary>
              <div className="px-5 pb-4 pt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-xl font-bold mb-2">Ready to make your first deal?</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>List your first item in under 3 minutes. Free to start.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sell" className="flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-white gradient-teal glow-teal hover:scale-105 transition-all">
            List Your Item Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/listings" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  )
}
