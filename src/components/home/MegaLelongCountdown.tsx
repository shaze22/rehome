'use client'

import { useEffect, useState } from 'react'

function getNextFriday9pm(): Date {
  const now = new Date()
  const myt = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }))
  const day = myt.getDay() // 0=Sun, 5=Fri
  const daysUntilFriday = day <= 5 ? 5 - day : 7 - day + 5
  const next = new Date(myt)
  next.setDate(myt.getDate() + (daysUntilFriday === 0 && myt.getHours() >= 21 ? 7 : daysUntilFriday))
  next.setHours(21, 0, 0, 0)
  return next
}

export function MegaLelongCountdown() {
  const [timeLeft, setTimeLeft] = useState('')
  const [show, setShow] = useState(false)

  useEffect(() => {
    const day = new Date().getDay()
    // Show countdown Mon-Thu (days 1-4)
    if (day >= 1 && day <= 4) setShow(true)

    function update() {
      const diff = getNextFriday9pm().getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('TONIGHT!'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  if (!show) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono" style={{ backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Starts in</span>
      <span className="font-bold">{timeLeft}</span>
    </div>
  )
}
