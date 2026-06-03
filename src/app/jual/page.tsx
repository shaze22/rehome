import Link from 'next/link'
import { FeeCalculator } from '@/components/sell/FeeCalculator'
import { ArrowRight, Camera, Bot, Zap, Package, Shield, Clock, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sell Items',
  description: 'Earn money from your old items. 30-minute progressive auction with AI pricing. Free registration, sell in minutes.',
}

const SUCCESS_STORIES = [
  { name: 'Ahmad F.', item: 'iPhone 13 Pro', price: 'RM 680', duration: '22 minutes', quote: 'Faster than Carousell. Money came in straight away!' },
  { name: 'Siti R.', item: 'Dyson V11 Vacuum', price: 'RM 850', duration: '18 minutes', quote: 'AI suggested the perfect price. No need to think.' },
  { name: 'Razif M.', item: 'Sofa L-Shape', price: 'RM 1,200', duration: '29 minutes', quote: 'Escrow is safe. No worries about buyer fraud.' },
]

const HOW_TO_SELL = [
  { icon: Camera, step: '01', title: 'Take Photos', desc: 'Take 1–5 clear photos. Our AI will analyse and suggest a price.' },
  { icon: Bot, step: '02', title: 'AI Sets the Price', desc: 'Our system suggests a price based on current market conditions. You can adjust it.' },
  { icon: Zap, step: '03', title: 'Auction Starts', desc: '30-minute timer starts when the first bid comes in. Bidders compete to raise the price.' },
  { icon: Package, step: '04', title: 'Money In', desc: 'Winning bid is held in escrow. Once buyer receives the item, money goes straight to your account.' },
]

const FAQS = [
  { q: 'What is the platform fee?', a: 'A 15% fee applies to the final sale price for Flash Bid. Swap listings carry a 0% fee, completely free.' },
  { q: 'When do I get paid?', a: 'Money is transferred to your account after the buyer confirms receipt of the item. Usually within 1–3 business days after shipping.' },
  { q: 'Is it safe to transact on KASSIM?', a: 'Yes. KASSIM\'s Escrow system holds the buyer\'s payment until you ship the item and the buyer confirms receipt. No fraud risk.' },
  { q: 'Can I cancel a listing?', a: 'Yes. As long as no bids have come in, you can withdraw your listing at any time through the dashboard.' },
  { q: 'What is the difference between Flash Bid and Swap?', a: 'Flash Bid is a 30-minute auction for cash. Swap allows you to exchange your item for another item (you can also add cash, or accept cash only if the owner allows).' },
]

export default function JualPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.12) 0%, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ backgroundColor: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)', color: 'var(--teal)' }}>
              <Zap className="w-3.5 h-3.5" />
              Malaysia's #1 Auction Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Earn Money from{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your Old Items
              </span>
            </h1>
            <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
              Malaysia's auction platform. Photo → AI sets price → Bid in minutes. Free registration, commission only when you sell.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/sell"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105"
              >
                Sell Now - Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/listings"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
              >
                Browse Example Listings
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: Shield, text: 'Escrow Protected' },
                { icon: Bot, text: 'AI Pricing' },
                { icon: CheckCircle, text: 'IC Verified' },
                { icon: Clock, text: 'Done in 30 Min' },
              ].map(item => (
                <div key={item.text} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Fee Calculator */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">How Much Can You Earn?</h2>
              <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
                Platform fee is only 15% of the final sale price. No registration fee, no listing fee, no hidden charges.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Fee only deducted on successful sale',
                  'SWAP listings 0% fee, completely free',
                  'Money goes straight to your account in 1–3 days',
                  'No limit on number of listings',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--green)' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <FeeCalculator />
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">KASSIM Seller Success Stories</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>They have already sold. Now it is your turn.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUCCESS_STORIES.map(story => (
              <div key={story.name} className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full gradient-teal flex items-center justify-center text-white font-bold">
                    {story.name[0]}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono" style={{ color: 'var(--teal)' }}>{story.price}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>in {story.duration}</p>
                  </div>
                </div>
                <p className="font-semibold text-sm mb-1">{story.item}</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>by {story.name}</p>
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{story.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Sell */}
      <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">How to Sell on KASSIM</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>4 easy steps from listing to payment received</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_TO_SELL.map(step => (
              <div key={step.step} className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-muted)' }}>{step.step}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(20,184,166,0.1)' }}>
                    <step.icon className="w-5 h-5" style={{ color: 'var(--teal)' }} />
                  </div>
                </div>
                <h3 className="font-bold mb-2 text-sm">{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Have a question? We have the answer.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-sm select-none list-none">
                  {faq.q}
                  <span className="ml-4 flex-shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>+</span>
                </summary>
                <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border)' }}>
                  <div className="pt-3">{faq.a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">In 2 Minutes, Your First Listing Can Go Live.</h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            Free registration. No commitment. Sell when you are ready.
          </p>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105 text-lg"
          >
            Sell Now - Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            No credit card required · Fee only on successful sale
          </p>
        </div>
      </section>
    </div>
  )
}
