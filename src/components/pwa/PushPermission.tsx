'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

const ASKED_KEY = 'ballout_push_asked'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function subscribePush(userId: string) {
  const reg = await navigator.serviceWorker.ready
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, userId }),
  })
}

export function PushPermission({ userId }: { userId: string }) {
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'denied'>('idle')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (localStorage.getItem(ASKED_KEY)) return
    if (Notification.permission === 'granted') { setStatus('subscribed'); return }
    if (Notification.permission === 'denied') { setStatus('denied'); return }

    // Show prompt 5s after page load (not immediately)
    const t = setTimeout(() => setVisible(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  async function allow() {
    setVisible(false)
    localStorage.setItem(ASKED_KEY, '1')
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setStatus('subscribed')
      await subscribePush(userId).catch(() => {})
    } else {
      setStatus('denied')
    }
  }

  function dismiss() {
    setVisible(false)
    localStorage.setItem(ASKED_KEY, '1')
  }

  if (!visible || status !== 'idle') return null

  return (
    <div
      className="fixed bottom-36 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-40 rounded-2xl shadow-2xl p-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid rgba(234,179,8,0.4)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(234,179,8,0.15)' }}>
          <Bell className="w-5 h-5" style={{ color: '#eab308' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Aktifkan notifikasi bid</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Dapat tahu bila tawaran anda dikalahkan atau ada offer baru
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={allow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#eab308', color: '#000' }}
            >
              <Bell className="w-3.5 h-3.5" />
              Aktifkan
            </button>
            <button
              onClick={dismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-elevated)' }}
            >
              <BellOff className="w-3.5 h-3.5" />
              Tidak
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
