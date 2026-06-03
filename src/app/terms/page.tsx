import Link from 'next/link'
import { Shield } from 'lucide-react'

export const metadata = { title: 'Terms of Service — KASSIM' }

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Effective: 1 June 2026 · Governing law: Malaysia</p>
        </div>
      </div>

      <div className="prose-custom space-y-8" style={{ color: 'var(--text-secondary)' }}>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. Platform Description</h2>
          <p className="text-sm leading-relaxed">
            KASSIM (&ldquo;the Platform&rdquo;) is an online circular economy marketplace operated in Malaysia, enabling users to list, bid on, and swap pre-owned items via Flash Auctions and Swap Offers. Access to the Platform is subject to these Terms of Service and all applicable Malaysian laws, including the Contracts Act 1950 and the Consumer Protection Act 1999.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>2. User Eligibility &amp; Responsibilities</h2>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li>You must be at least 18 years old and legally capable of entering contracts under Malaysian law.</li>
            <li>You agree to provide accurate and truthful information when registering and listing items.</li>
            <li>You are responsible for the accuracy of your item descriptions, photos, and pricing.</li>
            <li>You must not impersonate another person or create multiple accounts to circumvent restrictions.</li>
            <li>Accounts may be suspended or terminated for violations of these Terms at KASSIM&apos;s sole discretion.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. Flash Auctions</h2>
          <p className="text-sm leading-relaxed mb-2">
            Flash Auctions are time-limited bidding sessions. The Platform charges a <strong style={{ color: 'var(--teal)' }}>15% platform fee</strong> on the final sale price. The fee is deducted from the seller&apos;s payout automatically via our escrow system.
          </p>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li>Bids are binding. Once placed, a bid cannot be retracted.</li>
            <li>The highest bidder at auction end is obligated to complete the purchase.</li>
            <li>KASSIM reserves the right to cancel auctions that violate these Terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>4. Swap Offers</h2>
          <p className="text-sm leading-relaxed">
            Swap Offers allow users to propose item-for-item, cash, or hybrid exchanges. All accepted swaps are processed through the KASSIM escrow system. Both parties must ship items within the agreed timeframe. Disputes are handled by KASSIM administrators with final resolution authority.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>5. Escrow &amp; Payments</h2>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li>All payments are held in escrow until both parties confirm receipt of items.</li>
            <li>Payments are processed via Stripe. KASSIM does not store card details.</li>
            <li>Seller payouts are released after the buyer confirms delivery and a holding period.</li>
            <li>In the event of non-delivery, buyers may raise a dispute within 7 days of the expected delivery date.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>6. Prohibited Items</h2>
          <p className="text-sm leading-relaxed mb-2">The following items are strictly prohibited on KASSIM:</p>
          <ul className="text-sm space-y-1 list-disc pl-5 leading-relaxed">
            <li>Illegal items, counterfeit goods, or stolen property</li>
            <li>Weapons, ammunition, or explosives</li>
            <li>Controlled substances or drugs</li>
            <li>Adult or sexually explicit content</li>
            <li>Items infringing intellectual property rights</li>
            <li>Any item prohibited under Malaysian law</li>
          </ul>
          <p className="text-sm mt-2 leading-relaxed">Violations will result in immediate account termination and may be reported to relevant authorities.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>7. IC Verification</h2>
          <p className="text-sm leading-relaxed">
            KASSIM offers optional IC (MyKad) verification. Verified sellers display a trust badge and are granted enhanced platform privileges. Submitted IC documents are stored securely and used solely for identity verification. Documents are reviewed by KASSIM administrators and deleted upon completion of verification.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>8. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">
            KASSIM acts as an intermediary and is not responsible for the quality, safety, or legality of items listed. We are not liable for any loss, damage, or injury arising from transactions on the Platform beyond what is recoverable through our escrow process. Total liability is limited to the transaction value in dispute.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>9. Governing Law &amp; Disputes</h2>
          <p className="text-sm leading-relaxed">
            These Terms are governed by the laws of Malaysia. Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Kuala Lumpur, Malaysia. You agree to attempt good-faith resolution through KASSIM&apos;s dispute process before pursuing legal action.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>10. Changes to Terms</h2>
          <p className="text-sm leading-relaxed">
            KASSIM reserves the right to update these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms. Material changes will be communicated via email to registered users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>11. Contact</h2>
          <p className="text-sm leading-relaxed">
            For questions about these Terms, contact us at{' '}
            <a href="mailto:syedshazni@todak.com" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>
              syedshazni@todak.com
            </a>
          </p>
        </section>

        <div className="pt-6 mt-8 flex gap-4 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Link href="/privacy" className="hover:underline" style={{ color: 'var(--teal)' }}>Privacy Policy</Link>
          <Link href="/" className="hover:underline">← Back to KASSIM</Link>
        </div>
      </div>
    </div>
  )
}
