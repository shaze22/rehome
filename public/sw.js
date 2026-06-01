const CACHE = 'ballout-v1'
const OFFLINE_URL = '/offline'

const PRECACHE = [
  '/',
  '/offline',
  '/listings',
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)

  // Skip API routes, Supabase, Stripe — always network
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('stripe.com')
  ) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful page navigations
        if (res.ok && e.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(async () => {
        // Offline fallback
        const cached = await caches.match(e.request)
        if (cached) return cached
        if (e.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
        return new Response('Offline', { status: 503 })
      })
  )
})

// ── Push Notifications ────────────────────────────────────────────

self.addEventListener('push', e => {
  const data = e.data?.json() ?? {}
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'BALLOUT', {
      body: data.body ?? '',
      icon: '/api/pwa-icon?size=192',
      badge: '/api/pwa-icon?size=192',
      data: { url: data.url ?? '/' },
      tag: data.tag ?? 'ballout',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
