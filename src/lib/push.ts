import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

function getWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  return webpush
}

interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const wp = getWebPush()
  // Web Push payloads are capped at ~4KB — truncate to stay well within limit
  const safe: PushPayload = {
    ...payload,
    title: payload.title.length > 100 ? payload.title.slice(0, 97) + '...' : payload.title,
    body:  payload.body.length  > 150 ? payload.body.slice(0, 147)  + '...' : payload.body,
  }
  const json = JSON.stringify(safe)
  const stale: string[] = []

  await Promise.allSettled(
    subs.map(sub =>
      wp.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        json
      ).catch(err => {
        // 410 Gone or 404 = expired subscription
        if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.endpoint)
      })
    )
  )

  // Clean up expired subscriptions
  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } }).catch(() => {})
  }
}
