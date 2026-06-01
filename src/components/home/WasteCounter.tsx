import { Leaf, TreePine, Droplets } from 'lucide-react'

interface Props {
  totalCO2: number
  totalTransactions: number
}

export function WasteCounter({ totalCO2, totalTransactions }: Props) {
  const trees = Math.round(totalCO2 / 21)
  const waterLitres = Math.round(totalTransactions * 400)

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold mb-2">Our Platform Impact</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Together we&apos;re building a greener Malaysia
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(0,217,165,0.2)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(0,217,165,0.1)' }}>
              <Leaf className="w-6 h-6" style={{ color: 'var(--green)' }} />
            </div>
            <p className="text-3xl font-bold font-mono mb-1" style={{ color: 'var(--green)' }}>
              {Math.round(totalCO2).toLocaleString()}kg
            </p>
            <p className="text-sm font-medium mb-1">CO₂ Saved</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs buying new</p>
          </div>

          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(20,184,166,0.1)' }}>
              <TreePine className="w-6 h-6" style={{ color: 'var(--teal)' }} />
            </div>
            <p className="text-3xl font-bold font-mono mb-1" style={{ color: 'var(--teal)' }}>
              {trees.toLocaleString()}
            </p>
            <p className="text-sm font-medium mb-1">Trees Equivalent</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>CO₂ absorbed per year</p>
          </div>

          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(79,140,255,0.2)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(79,140,255,0.1)' }}>
              <Droplets className="w-6 h-6" style={{ color: 'var(--blue)' }} />
            </div>
            <p className="text-3xl font-bold font-mono mb-1" style={{ color: 'var(--blue)' }}>
              {waterLitres.toLocaleString()}L
            </p>
            <p className="text-sm font-medium mb-1">Water Saved</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>from new production</p>
          </div>
        </div>
      </div>
    </section>
  )
}
