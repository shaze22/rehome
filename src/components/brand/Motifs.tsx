import { Kassim, type KassimPose } from './Kassim'

/** The gold key from Kassim's sash: the brand's small ornament. */
export function GoldKey({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="gold-key-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="55%" stopColor="#f5b942" />
          <stop offset="100%" stopColor="#b7791f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#gold-key-fill)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="12" r="4.2" />
        <path d="M11.7 12 H21 M17 12 V16 M20.5 12 V15" />
      </g>
    </svg>
  )
}

/** Section break: a hairline with the gold key in the middle. */
export function KeyDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 max-w-xs mx-auto ${className}`} aria-hidden>
      <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
      <GoldKey size={18} />
      <span className="h-px flex-1" style={{ background: 'linear-gradient(270deg, transparent, var(--gold))' }} />
    </div>
  )
}

/** A Kassim head framed in a glowing cave-mouth arch. Used for empty states. */
export function KassimNiche({ pose, width = 96, className = 'mx-auto mb-3' }: { pose: KassimPose; width?: number; className?: string }) {
  const frame = Math.round(width * 1.3)
  return (
    <div
      className={`relative flex items-end justify-center overflow-hidden ${className}`}
      style={{
        width: frame,
        height: Math.round(frame * 1.18),
        borderRadius: `${frame}px ${frame}px 14px 14px`,
        background: 'radial-gradient(ellipse at 50% 100%, rgba(245,185,66,0.45) 0%, rgba(245,185,66,0.14) 55%, rgba(245,185,66,0.05) 100%)',
        border: '1.5px solid rgba(245,185,66,0.45)',
      }}
    >
      <Kassim pose={pose} width={width} />
    </div>
  )
}

interface KassimSaysProps {
  pose: KassimPose
  title: string
  children?: React.ReactNode
  width?: number
}

/** Centred mascot + message block for empty states. */
export function KassimSays({ pose, title, children, width = 84 }: KassimSaysProps) {
  return (
    <>
      <KassimNiche pose={pose} width={width} />
      <p className="font-medium mb-1">{title}</p>
      {children && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{children}</p>
      )}
    </>
  )
}
