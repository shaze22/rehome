import Link from 'next/link'
import { Sofa, Cpu, Shirt, BookOpen, Trophy, CookingPot, MoreHorizontal } from 'lucide-react'

const CATEGORIES = [
  { label: 'Perabot', value: 'FURNITURE', icon: Sofa, color: 'var(--orange)' },
  { label: 'Elektronik', value: 'ELECTRONICS', icon: Cpu, color: 'var(--blue)' },
  { label: 'Fesyen', value: 'FASHION', icon: Shirt, color: 'var(--purple)' },
  { label: 'Buku', value: 'BOOKS', icon: BookOpen, color: 'var(--yellow)' },
  { label: 'Sukan', value: 'SPORTS', icon: Trophy, color: 'var(--green)' },
  { label: 'Dapur', value: 'KITCHEN', icon: CookingPot, color: 'var(--teal)' },
  { label: 'Lain-lain', value: 'OTHERS', icon: MoreHorizontal, color: 'var(--text-secondary)' },
]

export function CategoryGrid() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">Semak Imbas Mengikut Kategori</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.value}
              href={`/listings?category=${cat.value}`}
              className="flex flex-col items-center gap-3 p-4 rounded-xl card-hover"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cat.color}15` }}>
                <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <span className="text-xs text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
