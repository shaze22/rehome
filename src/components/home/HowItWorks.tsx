import Link from 'next/link'
import { List, Eye, CreditCard, ArrowLeftRight, MessageSquare, Shield, ArrowRight } from 'lucide-react'

const FLASH_STEPS = [
  {
    icon: List,
    title: 'List your item',
    desc: 'Upload photos, set a starting price. AI suggests a fair market value instantly.',
  },
  {
    icon: Eye,
    title: 'Watch bids roll in (30 min!)',
    desc: 'Timer only starts on the first bid. Each counter-bid adds more time — drama guaranteed.',
  },
  {
    icon: CreditCard,
    title: 'Winner pays, you ship',
    desc: 'Buyer pays via secure escrow. Ship the item, get your money — done in one day.',
  },
]

const SWAP_STEPS = [
  {
    icon: ArrowLeftRight,
    title: 'List + state what you want',
    desc: 'Describe your item and what you\'d like in return. Open to all offers, or set a specific want.',
  },
  {
    icon: MessageSquare,
    title: 'Review swap offers',
    desc: 'Receive cash, item swap, or hybrid offers. Counter-offer up to 3 rounds to find the best deal.',
  },
  {
    icon: Shield,
    title: 'Agree & swap via escrow',
    desc: 'Both parties ship items protected by our secure escrow. Confirm receipt to complete the swap.',
  },
]

function StepList({ steps, color }: { steps: typeof FLASH_STEPS; color: string }) {
  return (
    <div className="space-y-5">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
            >
              <step.icon className="w-4 h-4" style={{ color }} />
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'var(--border)' }} />
            )}
          </div>
          <div className="pb-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}18`, color }}>
                {i + 1}
              </span>
              <h4 className="text-sm font-semibold">{step.title}</h4>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-2">How It Works</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Two ways to trade — pick what suits you
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flash Auction column */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(249,115,22,0.3)' }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">⚡</span>
              <div>
                <h3 className="font-bold" style={{ color: 'var(--orange)' }}>Flash Auction</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sell fast, get cash today</p>
              </div>
            </div>
            <StepList steps={FLASH_STEPS} color="var(--orange)" />
            <Link
              href="/sell"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              Start a Flash Auction <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Item Swap column */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xl">🔄</span>
              <div>
                <h3 className="font-bold" style={{ color: '#16a34a' }}>Item Swap</h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Trade without spending cash</p>
              </div>
            </div>
            <StepList steps={SWAP_STEPS} color="#16a34a" />
            <Link
              href="/sell"
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#16a34a' }}
            >
              List for Swap <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/how-it-works" className="text-sm hover:underline" style={{ color: 'var(--text-muted)' }}>
            Learn more — full guide with FAQ →
          </Link>
        </div>
      </div>
    </section>
  )
}
