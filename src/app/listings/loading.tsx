export default function ListingsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        <div className="h-4 w-32 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64">
          <div className="rounded-xl p-4 h-80 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        </aside>
        <div className="flex-1 grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="aspect-square" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              <div className="p-3 space-y-2">
                <div className="h-4 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                <div className="h-4 w-3/4 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
                <div className="h-6 w-1/2 rounded" style={{ backgroundColor: 'var(--bg-elevated)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
