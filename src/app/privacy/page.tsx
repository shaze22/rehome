import Link from 'next/link'
import { Lock } from 'lucide-react'

export const metadata = { title: 'Privacy Policy | KASSIM' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-teal flex items-center justify-center">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Effective: 1 June 2026 · Compliant with PDPA 2010 (Malaysia)</p>
        </div>
      </div>

      <div className="space-y-8" style={{ color: 'var(--text-secondary)' }}>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>1. Introduction</h2>
          <p className="text-sm leading-relaxed">
            KASSIM (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the Platform&rdquo;) is committed to protecting your personal data in accordance with the <strong>Personal Data Protection Act 2010 (PDPA 2010)</strong> of Malaysia. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use KASSIM.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>2. Data We Collect</h2>
          <div className="text-sm leading-relaxed space-y-2">
            <p><strong style={{ color: 'var(--text-primary)' }}>Information you provide:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, and password when you register</li>
              <li>MyKad (IC) photograph for optional identity verification</li>
              <li>Listing details: title, description, photos, pricing</li>
              <li>Payment information (processed by Stripe; we do not store card details)</li>
              <li>Shipping address for order fulfilment</li>
              <li>Messages exchanged with other users or support</li>
            </ul>
            <p className="mt-3"><strong style={{ color: 'var(--text-primary)' }}>Automatically collected data:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address, browser type, and device information</li>
              <li>Pages visited, listing views, and bid activity</li>
              <li>Error logs and performance data (via Sentry)</li>
              <li>Cookies and local storage preferences</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>3. How We Use Your Data</h2>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li>To create and manage your account</li>
            <li>To facilitate transactions, escrow, and shipping</li>
            <li>To send transactional emails (bid confirmations, payment receipts, order updates)</li>
            <li>To verify your identity when you submit IC verification</li>
            <li>To improve Platform performance and user experience</li>
            <li>To detect and prevent fraud, abuse, and prohibited activities</li>
            <li>To comply with legal obligations under Malaysian law</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>4. Third-Party Services</h2>
          <p className="text-sm leading-relaxed mb-3">We share your data with trusted third-party service providers as necessary to operate the Platform:</p>
          <div className="rounded-xl overflow-hidden text-sm" style={{ border: '1px solid var(--border)' }}>
            {[
              { name: 'Supabase', purpose: 'Database & authentication (hosted in Singapore)', link: 'https://supabase.com/privacy' },
              { name: 'Stripe', purpose: 'Payment processing (PCI-DSS compliant)', link: 'https://stripe.com/privacy' },
              { name: 'Resend', purpose: 'Transactional email delivery', link: 'https://resend.com/legal/privacy-policy' },
              { name: 'Google', purpose: 'OAuth sign-in (optional)', link: 'https://policies.google.com/privacy' },
              { name: 'Sentry', purpose: 'Error monitoring & performance', link: 'https://sentry.io/privacy/' },
              { name: 'Vercel', purpose: 'Hosting & edge infrastructure', link: 'https://vercel.com/legal/privacy-policy' },
            ].map((p, i, arr) => (
              <div key={p.name} className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: 'var(--bg-card)', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.purpose}</p>
                </div>
                <a href={p.link} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--teal)' }}>Privacy</a>
              </div>
            ))}
          </div>
          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            We do not sell your personal data to any third party.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>5. Data Retention</h2>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li>Account data is retained while your account is active.</li>
            <li>IC verification photos are deleted after verification is completed.</li>
            <li>Transaction records are retained for 7 years for tax and legal compliance.</li>
            <li>Error logs are retained for 90 days.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>6. Your Rights Under PDPA 2010</h2>
          <p className="text-sm leading-relaxed mb-2">As a data subject under the PDPA 2010, you have the right to:</p>
          <ul className="text-sm space-y-2 list-disc pl-5 leading-relaxed">
            <li><strong style={{ color: 'var(--text-primary)' }}>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Deletion:</strong> Request deletion of your account and associated data, subject to legal retention requirements.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Withdrawal of consent:</strong> Withdraw consent for data processing where consent was the basis, which may affect your ability to use certain features.</li>
            <li><strong style={{ color: 'var(--text-primary)' }}>Complaint:</strong> Lodge a complaint with the Personal Data Protection Commissioner of Malaysia.</li>
          </ul>
          <p className="text-sm mt-3 leading-relaxed">
            To exercise these rights, contact us at{' '}
            <a href="mailto:syedshazni@todak.com" className="underline hover:no-underline" style={{ color: 'var(--teal)' }}>
              syedshazni@todak.com
            </a>{' '}
            with your request. We will respond within 21 days as required by PDPA 2010.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>7. Cookies &amp; Local Storage</h2>
          <p className="text-sm leading-relaxed">
            We use cookies and browser local storage to maintain your session, remember preferences (language, theme), track recently viewed items, and provide push notification functionality. You may disable cookies in your browser, but this may affect Platform functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>8. Security</h2>
          <p className="text-sm leading-relaxed">
            We implement industry-standard security measures including SSL/TLS encryption, row-level security (RLS) on our database, and secure escrow for financial transactions. However, no system is 100% secure. In the event of a data breach, we will notify affected users as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>9. Children&apos;s Privacy</h2>
          <p className="text-sm leading-relaxed">
            KASSIM is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has registered, please contact us immediately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>10. Contact Us</h2>
          <p className="text-sm leading-relaxed">
            For privacy-related inquiries, data access requests, or complaints:
          </p>
          <div className="mt-2 rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-primary)' }}>KASSIM Data Protection</p>
            <p style={{ color: 'var(--text-secondary)' }}>Email: <a href="mailto:syedshazni@todak.com" className="underline" style={{ color: 'var(--teal)' }}>syedshazni@todak.com</a></p>
            <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Kuala Lumpur, Malaysia</p>
          </div>
        </section>

        <div className="pt-6 mt-8 flex gap-4 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <Link href="/terms" className="hover:underline" style={{ color: 'var(--teal)' }}>Terms of Service</Link>
          <Link href="/" className="hover:underline">← Back to KASSIM</Link>
        </div>
      </div>
    </div>
  )
}
