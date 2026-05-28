export default function ListingDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-4 w-32 rounded animate-pulse mb-6" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)' }} />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-16 h-16 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            ))}
          </div>
          <div className="rounded-xl p-4 h-40 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        </div>
        <div className="space-y-4">
          <div className="h-8 w-3/4 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-4 w-full rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-4 w-2/3 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="rounded-xl p-5 h-64 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
          <div className="rounded-xl p-4 h-24 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        </div>
      </div>
    </div>
  )
}
