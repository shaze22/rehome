export default function SellLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="h-8 w-48 rounded-lg animate-pulse mb-2" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="h-4 w-72 rounded animate-pulse mb-8" style={{ backgroundColor: 'var(--bg-elevated)' }} />
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl p-6 h-64 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} />
        ))}
      </div>
    </div>
  )
}
