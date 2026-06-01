import Link from 'next/link'
import { FeeCalculator } from '@/components/sell/FeeCalculator'
import { ArrowRight, Camera, Bot, Zap, Package, Shield, Clock, CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jual Barangan',
  description: 'Jana wang dari barang lama anda. Lelongan progresif 30 minit dengan harga AI. Daftar percuma, jual dalam minit.',
}

const SUCCESS_STORIES = [
  { name: 'Ahmad F.', item: 'iPhone 13 Pro', price: 'RM 680', duration: '22 minit', quote: 'Lagi laju dari Carousell. Duit masuk terus!' },
  { name: 'Siti R.', item: 'Dyson V11 Vacuum', price: 'RM 850', duration: '18 minit', quote: 'AI suggest harga yang perfect. Tak payah fikir.' },
  { name: 'Razif M.', item: 'Sofa L-Shape', price: 'RM 1,200', duration: '29 minit', quote: 'Escrow selamat. Tak risau pembeli tipu.' },
]

const HOW_TO_SELL = [
  { icon: Camera, step: '01', title: 'Ambil Gambar', desc: 'Ambil 1–5 gambar jelas. AI kami akan analisa dan suggest harga.' },
  { icon: Bot, step: '02', title: 'AI Tetap Harga', desc: 'Sistem kami cadang harga berdasarkan pasaran semasa. Anda boleh ubah.' },
  { icon: Zap, step: '03', title: 'Lelongan Bermula', desc: 'Timer 30 minit bermula bila ada bid pertama. Bidder bersaing naik harga.' },
  { icon: Package, step: '04', title: 'Duit Masuk', desc: 'Menang dihantar dalam escrow. Lepas barang terima, duit terus ke akaun.' },
]

const FAQS = [
  { q: 'Berapa fi platform?', a: 'Fi 15% dari harga jualan akhir untuk Flash Bid. Listing Tukar Barang (SWAP) dikenakan 0% fi — percuma sepenuhnya.' },
  { q: 'Bila saya dapat duit?', a: 'Duit masuk ke akaun anda selepas pembeli mengesahkan penerimaan barang. Biasanya dalam 1–3 hari bekerja selepas penghantaran.' },
  { q: 'Selamat ke berurusan dekat BALLOUT?', a: 'Ya. Sistem Escrow BALLOUT menyimpan wang pembeli sehingga anda hantar barang dan pembeli sahkan terima. Tiada risiko penipuan.' },
  { q: 'Boleh cancel listing?', a: 'Boleh — selagi belum ada bid masuk, anda boleh tarik balik listing pada bila-bila masa melalui dashboard.' },
  { q: 'Apa beza Flash Bid vs Tukar Barang?', a: 'Flash Bid adalah lelongan 30 minit untuk wang tunai. Tukar Barang membenarkan anda tukar item dengan item lain (boleh tambah wang atau wang sahaja jika pemilik izinkan).' },
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
              Platform Lelongan #1 Malaysia
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Jana Wang dari{' '}
              <span style={{ background: 'linear-gradient(135deg, var(--teal), var(--green))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Barang Lama Anda
              </span>
            </h1>
            <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
              Platform lelongan Malaysia. Foto → AI tetap harga → Bid dalam minit. Daftar percuma, komisyen hanya bila jual.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/sell"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105"
              >
                Jual Sekarang — Percuma
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/listings"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-card)' }}
              >
                Tengok Contoh Listing
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 mt-8">
              {[
                { icon: Shield, text: 'Escrow Dilindungi' },
                { icon: Bot, text: 'AI Pricing' },
                { icon: CheckCircle, text: 'IC Disahkan' },
                { icon: Clock, text: '30 Min Selesai' },
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
              <h2 className="text-3xl font-bold mb-4">Berapa Yang Anda Boleh Jana?</h2>
              <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>
                Fi platform hanya 15% dari harga jualan akhir. Tiada fi pendaftaran, tiada fi listing, tiada caj tersembunyi.
              </p>
              <ul className="space-y-3 mb-6">
                {[
                  'Fi hanya ditolak bila berjaya jual',
                  'SWAP listing 0% fi — percuma sepenuhnya',
                  'Duit terus ke akaun anda dalam 1–3 hari',
                  'Tiada had bilangan listing',
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
            <h2 className="text-2xl font-bold mb-2">Kejayaan Penjual BALLOUT</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mereka dah jual. Giliran anda pula.</p>
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
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>dalam {story.duration}</p>
                  </div>
                </div>
                <p className="font-semibold text-sm mb-1">{story.item}</p>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>oleh {story.name}</p>
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
            <h2 className="text-2xl font-bold mb-2">Cara Jual di BALLOUT</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>4 langkah mudah dari listing ke duit masuk</p>
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
            <h2 className="text-2xl font-bold mb-2">Soalan Lazim</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ada soalan? Kami ada jawapan.</p>
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
          <h2 className="text-3xl font-bold mb-4">Dah 2 Minit, Listing Pertama Anda Boleh Live.</h2>
          <p className="text-base mb-8" style={{ color: 'var(--text-secondary)' }}>
            Daftar percuma. Tiada komitmen. Jual bila anda sedia.
          </p>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-semibold text-white gradient-teal glow-teal transition-all hover:scale-105 text-lg"
          >
            Jual Sekarang — Percuma
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            Tiada kad kredit diperlukan · Fi hanya bila berjaya jual
          </p>
        </div>
      </section>
    </div>
  )
}
