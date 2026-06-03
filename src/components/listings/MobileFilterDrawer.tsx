'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { ListingsFilters } from './ListingsFilters'

interface Props {
  currentParams: Record<string, string | undefined>
  activeFilterCount: number
}

export function MobileFilterDrawer({ currentParams, activeFilterCount }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        <SlidersHorizontal className="w-4 h-4" style={{ color: 'var(--teal)' }} />
        Filters
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--teal)' }}>
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-up drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-2xl transition-transform duration-300"
        style={{
          backgroundColor: 'var(--bg-base)',
          border: '1px solid var(--border)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          maxHeight: '85vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Handle */}
        <div className="flex items-center justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-semibold">Filters</span>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter content */}
        <div className="p-4" onClick={() => setTimeout(() => setOpen(false), 300)}>
          <ListingsFilters currentParams={currentParams} />
        </div>
      </div>
    </>
  )
}
