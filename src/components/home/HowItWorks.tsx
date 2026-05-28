import { Camera, Bot, Gavel, Package, Leaf } from 'lucide-react'

const STEPS = [
  {
    icon: Camera,
    color: 'var(--teal)',
    title: 'Senaraikan Item',
    desc: 'Ambil foto, isi butiran dan biarkan AI mencadangkan harga permulaan yang adil.',
  },
  {
    icon: Bot,
    color: 'var(--purple)',
    title: 'AI Tetapkan Harga',
    desc: 'Gemini AI menganalisis pasaran dan cadangkan julat harga optimum.',
  },
  {
    icon: Gavel,
    color: 'var(--orange)',
    title: 'Lelongan Progresif',
    desc: 'Pembida bertarung! Setiap tawaran menambah 3 minit ke timer — tegang hingga saat akhir.',
  },
  {
    icon: Package,
    color: 'var(--blue)',
    title: 'Penghantaran Selamat',
    desc: 'Wang disimpan dalam escrow. Penjual terima bayaran selepas pembeli sahkan terima.',
  },
  {
    icon: Leaf,
    color: 'var(--green)',
    title: 'Selamatkan Alam',
    desc: 'Lihat impak anda — CO₂ diselamatkan, plastik dikurangkan, ekonomi pekeliling dibina.',
  },
]

export function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">Cara BALLOUT Berfungsi</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Lima langkah mudah dari listing ke delivery</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}40` }}>
                  <step.icon className="w-6 h-6" style={{ color: step.color }} />
                </div>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-3 font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: step.color }}>
                  {i + 1}
                </div>
                <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px" style={{ backgroundColor: 'var(--border)' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
