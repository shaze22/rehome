export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-40 rounded-lg animate-pulse mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
          <div className="h-4 w-56 rounded animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
        </div>
        <div className="h-10 w-28 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl p-4 h-28 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[...Array(2)].map((_, i) => (
          <div key={i}>
            <div className="h-6 w-32 rounded animate-pulse mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }} />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="rounded-xl p-4 h-20 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
