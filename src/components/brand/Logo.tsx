/** KASSIM wordmark with the teal bolt. Inherits text colour, so it works on any theme. */
export function Logo({ height = 36, className = '' }: { height?: number; className?: string }) {
  return (
    <span
      className={`font-plain inline-flex items-center font-bold ${className}`}
      style={{ height, gap: height * 0.12, fontSize: height * 0.62, letterSpacing: '0.08em', lineHeight: 1, color: 'var(--text-primary)' }}
      role="img"
      aria-label="KASSIM"
    >
      <svg viewBox="0 0 32 66" style={{ height: height * 0.86, width: 'auto' }} aria-hidden>
        <polygon points="14,0 1,32 11,32 5,66 32,30 19,30 28,0" fill="#14b8a6" />
      </svg>
      <span aria-hidden>KASSIM</span>
    </span>
  )
}
