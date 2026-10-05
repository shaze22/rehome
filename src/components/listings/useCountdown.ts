import { useEffect, useState } from 'react'

export function useServerTimeOffset() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    fetch('/api/time')
      .then(r => r.json())
      .then(({ serverTime }: { serverTime: number }) => setOffset(serverTime - Date.now()))
      .catch(() => {})
  }, [])
  return offset
}

export type UrgencyLevel = 0 | 1 | 2 | 3

// Display-only mirror of the fixed Flash window enforced in /api/bid.
export const FLASH_WINDOW_MS = 30 * 60 * 1000

export function useCountdown(endsAt: string | Date | null, offset = 0) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>(0)
  const [isEnded, setIsEnded] = useState(false)
  const [isWaiting, setIsWaiting] = useState(!endsAt)
  const [msLeft, setMsLeft] = useState(0)

  useEffect(() => {
    if (!endsAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps the countdown in step with endsAt
      setIsWaiting(true)
      setIsEnded(false)
      setTimeLeft('Waiting for first bidder...')
      return
    }
    setIsWaiting(false)
    function update() {
      const diff = new Date(endsAt as string | Date).getTime() - (Date.now() + offset)
      if (diff <= 0) { setIsEnded(true); setTimeLeft('Ended'); setMsLeft(0); return }
      setIsEnded(false) // reset if endsAt changed to future (e.g. after first bid realtime update)
      setMsLeft(diff)
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (diff < 60000) setUrgencyLevel(3)
      else if (diff < 300000) setUrgencyLevel(2)
      else if (diff < 600000) setUrgencyLevel(1)
      else setUrgencyLevel(0)
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`)
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`)
      else if (m > 0) setTimeLeft(`${m}m ${s}s`)
      else setTimeLeft(`${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt, offset])

  return { timeLeft, urgencyLevel, isUrgent: urgencyLevel > 0, isEnded, isWaiting, msLeft }
}
