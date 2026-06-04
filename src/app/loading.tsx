export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="py-20 px-4 text-center" style={{ backgroundColor: 'var(--bg-base)' }}>
        <div className="h-4 w-40 rounded mx-auto mb-4" style={{ backgroundColor: 'var(--bg-surface)' }} />
        <div className="h-10 w-2/3 rounded mx-auto mb-3" style={{ backgroundColor: 'var(--bg-surface)' }} />
        <div className="h-10 w-1/2 rounded mx-auto mb-6" style={{ backgroundColor: 'var(--bg-surface)' }} />
        <div className="flex justify-center gap-3">
          <div className="h-11 w-36 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }} />
          <div className="h-11 w-28 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }} />
          <div className="h-11 w-36 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }} />
        </div>
      </div>
      {/* Cards skeleton */}
      <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="h-6 w-40 rounded mb-6" style={{ backgroundColor: 'var(--bg-surface)' }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="h-48" style={{ backgroundColor: 'var(--bg-surface)' }} />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-surface)' }} />
                <div className="h-3 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-surface)' }} />
                <div className="h-6 w-1/3 rounded mt-3" style={{ backgroundColor: 'var(--bg-surface)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
