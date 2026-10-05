// Visual countdown for Flash Bid: the stone door of Kassim's treasure cave slides
// shut over the fixed 30-minute window. Display only; it never decides when an
// auction ends.

const DOOR_TRAVEL = 280

interface CaveDoorTimerProps {
  /** 0 = wide open, 1 = shut. */
  closed: number
  timeLeft: string
  label: string
  color: string
  isWaiting: boolean
  isEnded: boolean
  shake: boolean
}

export function CaveDoorTimer({ closed, timeLeft, label, color, isWaiting, isEnded, shake }: CaveDoorTimerProps) {
  const fraction = isEnded ? 1 : isWaiting ? 0 : Math.min(Math.max(closed, 0), 1)
  const headline = isEnded ? 'The door has closed' : isWaiting ? 'The door is open' : timeLeft
  const caption = isEnded ? 'Auction ended' : isWaiting ? 'First bid starts the 30-minute clock' : label

  return (
    <div
      className={`relative mb-3 rounded-xl overflow-hidden ${shake ? 'cave-shake' : ''}`}
      style={{ backgroundColor: '#1c1917', border: '1px solid var(--border)' }}
      role="timer"
      aria-label={`${caption}: ${headline}`}
    >
      <svg viewBox="0 0 320 120" className="block w-full h-auto" aria-hidden>
        <defs>
          <clipPath id="cave-mouth">
            <path d="M20 120 L20 62 Q20 10 160 10 Q300 10 300 62 L300 120 Z" />
          </clipPath>
          <radialGradient id="cave-glow" cx="50%" cy="85%" r="75%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="45%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#1c1917" />
          </radialGradient>
          <linearGradient id="cave-stone" x1="0" x2="1">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#44403c" />
          </linearGradient>
        </defs>

        <g clipPath="url(#cave-mouth)">
          <rect x="20" y="10" width="280" height="110" fill="url(#cave-glow)" />
          {/* treasure heap */}
          <ellipse cx="160" cy="124" rx="120" ry="26" fill="#f59e0b" />
          <ellipse cx="110" cy="112" rx="34" ry="12" fill="#fbbf24" />
          <ellipse cx="205" cy="110" rx="40" ry="14" fill="#fbbf24" />
          <circle cx="92" cy="100" r="5" fill="#14b8a6" />
          <circle cx="150" cy="103" r="6" fill="#ff6b35" />
          <circle cx="222" cy="97" r="5" fill="#14b8a6" />
          <circle cx="182" cy="96" r="3.5" fill="#fef3c7" />
          <circle cx="128" cy="94" r="3" fill="#fef3c7" />

          {/* stone door, slides in from the right */}
          <g
            style={{
              transform: `translateX(${(1 - fraction) * DOOR_TRAVEL}px)`,
              transition: 'transform 1s linear',
            }}
          >
            <rect x="20" y="10" width="280" height="110" fill="url(#cave-stone)" />
            <rect x="20" y="10" width="5" height="110" fill="#292524" />
            <path d="M70 10 V120 M130 10 V120 M190 10 V120 M250 10 V120" stroke="#57534e" strokeWidth="2" />
            <path d="M25 48 H300 M25 86 H300" stroke="#57534e" strokeWidth="2" />
          </g>
        </g>

        <path
          d="M20 120 L20 62 Q20 10 160 10 Q300 10 300 62 L300 120"
          fill="none"
          stroke="#57534e"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#fef3c7', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
          {caption}
        </p>
        <p
          className={`font-mono font-bold ${isWaiting || isEnded ? 'text-base sm:text-lg' : 'text-2xl sm:text-3xl'}`}
          style={{ color: isWaiting || isEnded ? '#ffffff' : color, textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)' }}
        >
          {headline}
        </p>
      </div>
    </div>
  )
}
