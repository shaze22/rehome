import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { Kassim } from '@/components/brand/Kassim'

export const metadata: Metadata = {
  title: 'Meet Kassim',
  description: 'Kassim could never let a good thing go to waste. Then his treasure cave got too full to close. This is why every Flash Bid starts at RM0.',
}

const CHAPTERS = [
  {
    pose: 'head-smile',
    title: 'Kassim has one problem',
    body: 'He cannot stand seeing a good thing go to waste. A camera nobody uses? He keeps it. Shoes worn twice? He keeps those too.',
  },
  {
    pose: 'head-shock',
    title: 'Then the door would not close',
    body: 'Years of collecting, and one morning his treasure cave was so full that the door stopped shutting. Good things everywhere, and nobody enjoying any of it.',
  },
  {
    pose: 'head-wink',
    title: 'So he did the craziest thing of his life',
    body: 'He opened the cave to everyone. Every Flash Bid starts at RM0. The first bid starts the clock. Thirty minutes later, the highest bid takes it home.',
  },
] as const

export default function StoryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <Kassim pose="body-wave" width={160} preload className="mx-auto mb-4 kassim-bob" />
        <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--teal)' }}>Our Story</p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Meet Kassim</h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          The world&apos;s most stubborn collector, and the reason this marketplace exists.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        {CHAPTERS.map(chapter => (
          <div key={chapter.title} className="rounded-2xl p-5 sm:p-6 flex items-center gap-4 sm:gap-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Kassim pose={chapter.pose} width={96} className="w-16 sm:w-24 h-auto flex-shrink-0" />
            <div>
              <h2 className="text-lg font-bold mb-1">{chapter.title}</h2>
              <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>{chapter.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-6 sm:p-8 text-center" style={{ background: 'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(255,107,53,0.08))', border: '1px solid rgba(20,184,166,0.3)' }}>
        <Kassim pose="body-point" width={120} className="mx-auto mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Everyone has a treasure cave</h2>
        <p className="text-sm sm:text-base max-w-md mx-auto mb-6" style={{ color: 'var(--text-secondary)' }}>
          A drawer. A storeroom. Under the bed. Good things sitting still. KASSIM is where you open that door and let them move again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sell" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white gradient-teal">
            Open your cave <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/listings" className="px-6 py-3 rounded-xl font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            See what is inside
          </Link>
        </div>
        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          Kassim is playful about prices. He is serious about your money: every payment is held in escrow until the item arrives.{' '}
          <Link href="/how-it-works" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>How it works</Link>
        </p>
      </div>
    </div>
  )
}
