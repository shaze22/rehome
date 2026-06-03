import Link from 'next/link'
import { List, Eye, CreditCard, ArrowLeftRight, MessageSquare, Shield, ArrowRight, ChevronDown } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Learn how KASSIM Flash Auctions and Item Swaps work — step by step guide with FAQ.',
}

const FLASH_STEPS = [
  {
    icon: List,
    title: 'List your item',
    desc: 'Upload up to 5 photos and fill in the item details. Our AI (Gemini) will analyse the photos and suggest a fair starting price based on current market conditions. You can accept the suggestion or set your own.',
    tip: 'Better photos = more bids. Natural lighting works best.',
  },
  {
    icon: Eye,
    title: 'Watch bids roll in',
    desc: 'Your listing goes live instantly. The 30-minute countdown timer does NOT start until someone places the first bid. Until then, your item stays active indefinitely — so there\'s no rush to promote it.',
    tip: 'Each counter-bid adds 5 minutes (first counter) or 2.5 minutes (subsequent). Maximum 30 minutes from first bid.',
  },
  {
    icon: CreditCard,
    title: 'Winner pays, you ship',
    desc: 'The highest bidder at the end of the timer wins. They pay via Stripe — funds held in escrow. You ship the item using any courier. Buyer confirms receipt, then payment is released to you.',
    tip: 'Platform fee is 15% of the final bid. A RM0 winning bid has RM0 fee.',
  },
]

const SWAP_STEPS = [
  {
    icon: ArrowLeftRight,
    title: 'List your item + state what you want',
    desc: 'Create a Swap listing with your item\'s details. Specify what you\'d like in return — a specific item, a category, or leave it open to all offers. You can also set a minimum cash top-up if your item is worth more.',
    tip: 'Marking "Open to all offers" gets you the most responses.',
  },
  {
    icon: MessageSquare,
    title: 'Review incoming offers',
    desc: 'Buyers can send three types of offers: (1) Cash — pay you money, (2) Item Swap — trade their item, (3) Hybrid — item + cash top-up. You can counter-offer up to 3 rounds per offer. Our AI shows a SwapMatch% score to help you evaluate.',
    tip: 'You can have multiple offers open at once. Accept the best one.',
  },
  {
    icon: Shield,
    title: 'Agree & swap via escrow',
    desc: 'Once you accept an offer, escrow kicks in. Both parties ship their items. Each side confirms receipt. Once both confirmations are in, the swap is marked Complete. Your SwapScore increases with each successful swap.',
    tip: '5 completed swaps unlocks the Swap Verified badge.',
  },
]

const FAQ = [
  {
    q: 'Is KASSIM safe? What if the seller doesn\'t ship?',
    a: 'KASSIM uses escrow for all Flash Auction payments. Your money is never sent directly to the seller — it\'s held securely until you confirm you\'ve received the item. For Item Swaps, the escrow tracks both parties\' shipments before marking the deal complete.',
  },
  {
    q: 'What are the fees?',
    a: 'Flash Auctions: 15% platform fee on the final winning bid (a RM0 bid costs RM0). Item Swaps: free to list and offer. No subscription, no listing fee.',
  },
  {
    q: 'What happens if nobody bids on my Flash Auction?',
    a: 'Your listing stays active until someone bids. There is no expiry timer before the first bid. You can also withdraw the listing at any time before the first bid.',
  },
  {
    q: 'Can I swap items across different states in Malaysia?',
    a: 'Yes — both parties simply ship their items via courier. KASSIM supports Peninsular Malaysia and East Malaysia shipping. The escrow only releases once both sides confirm receipt.',
  },
  {
    q: 'What is IC Verification?',
    a: 'Sellers who upload their MyKad / IC and pass admin verification receive an "IC Verified" badge. This gives buyers extra confidence. Verification is optional but recommended.',
  },
  {
    q: 'What is SwapScore?',
    a: 'SwapScore starts at 4.0 and increases by 0.1 for each completed swap (max 5.0). Reaching 5 completed swaps unlocks the "Swap Verified" badge, showing you are a trusted trader on the platform.',
  },
  {
    q: 'What items are allowed on KASSIM?',
    a: 'Pre-loved items in all categories: Electronics, Furniture, Fashion, Books, Sports, Kitchen, and more. Prohibited items include weapons, illegal goods, counterfeit products, and items requiring special permits.',
  },
  {
    q: 'How do I report a problem with a transaction?',
    a: 'On the listing page, you can file a dispute from the escrow panel. Our admin team will review and resolve within 3 working days. For urgent issues, email syedshazni@todak.com.',
  },
]

function StepCard({ steps, color }: { steps: typeof FLASH_STEPS; color: string }) {
  return (
    <div className="space-y-6">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex-shrink-0 flex flex-col items-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
            >
              <step.icon className="w-5 h-5" style={{ color }} />
            </div>
            {i < steps.length - 1 && (
              <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'var(--border)' }} />
            )}
          </div>
          <div className="pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${color}18`, color }}>
                Step {i + 1}
              </span>
              <h4 className="font-semibold">{step.title}</h4>
            </div>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
            <p className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${color}0D`, color, border: `1px solid ${color}25` }}>
              💡 {step.tip}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">How KASSIM Works</h1>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Two ways to give your pre-loved items a new home
        </p>
      </div>

      {/* Flash Auction */}
      <section className="mb-8">
        <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(249,115,22,0.3)' }}>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">⚡</span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--orange)' }}>Flash Auction</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sell fast, get cash. Timer only starts on first bid.</p>
            </div>
          </div>
          <StepCard steps={FLASH_STEPS} color="var(--orange)" />
          <Link
            href="/sell"
            className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            Start a Flash Auction <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Item Swap */}
      <section className="mb-12">
        <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(22,163,74,0.3)' }}>
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">🔄</span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#16a34a' }}>Item Swap</h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Trade without spending cash. 72-hour offer window.</p>
            </div>
          </div>
          <StepCard steps={SWAP_STEPS} color="#16a34a" />
          <Link
            href="/sell"
            className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-semibold text-white"
            style={{ backgroundColor: '#16a34a' }}
          >
            List for Swap <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="rounded-xl overflow-hidden group"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-sm select-none">
                {item.q}
                <ChevronDown className="w-4 h-4 flex-shrink-0 ml-3 transition-transform group-open:rotate-180" style={{ color: 'var(--text-muted)' }} />
              </summary>
              <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                <p className="pt-3">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className="mt-12 text-center rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>List your first item in under 2 minutes</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sell" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Start Selling <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/listings" className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  )
}
