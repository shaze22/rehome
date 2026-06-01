'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { MALAYSIAN_STATES } from '@/lib/delivery'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'FASHION', label: 'Fashion' },
  { value: 'BOOKS', label: 'Books' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'KITCHEN', label: 'Kitchen' },
  { value: 'OTHERS', label: 'Others' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Latest' },
  { value: 'ending', label: 'Ending Soon' },
  { value: 'price_asc', label: 'Price: Low→High' },
  { value: 'price_desc', label: 'Price: High→Low' },
]

interface Props {
  currentParams: Record<string, string | undefined>
}

export function ListingsFilters({ currentParams }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(currentParams.q ?? '')

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams()
    Object.entries({ ...currentParams, [key]: value }).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    if (!value) params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParam('q', q)
  }

  function clearFilters() {
    setQ('')
    router.push(pathname)
  }

  const hasFilters = Object.values(currentParams).some(Boolean)

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="w-4 h-4" style={{ color: 'var(--teal)' }} />
            Filters
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search items..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:ring-1"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', '--tw-ring-color': 'var(--teal)' } as React.CSSProperties}
            />
          </div>
        </form>

        {/* Category */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Category</label>
          <select
            value={currentParams.category ?? ''}
            onChange={e => updateParam('category', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* State */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>State</label>
          <select
            value={currentParams.state ?? ''}
            onChange={e => updateParam('state', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <option value="">All States</option>
            {MALAYSIAN_STATES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Sort By</label>
          <select
            value={currentParams.sort ?? 'createdAt'}
            onChange={e => updateParam('sort', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
