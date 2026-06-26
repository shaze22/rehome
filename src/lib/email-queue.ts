import { Redis } from '@upstash/redis'
import { Resend } from 'resend'

interface QueuedEmail {
  to: string
  subject: string
  html: string
  retries: number
  queuedAt: number
}

const QUEUE_KEY = 'kassim:email_queue'
const MAX_RETRIES = 3
const FROM = 'KASSIM <noreply@kassim.app>'

function getRedis() {
  return Redis.fromEnv()
}

export async function queueEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    const item: QueuedEmail = { to, subject, html, retries: 0, queuedAt: Date.now() }
    await getRedis().lpush(QUEUE_KEY, JSON.stringify(item))
  } catch {
    // Redis unavailable — email lost, acceptable fallback
  }
}

export async function processEmailQueue(): Promise<{ processed: number; failed: number; requeued: number }> {
  const redis = getRedis()
  const resend = new Resend(process.env.RESEND_API_KEY)
  let processed = 0
  let failed = 0
  let requeued = 0

  for (let i = 0; i < 50; i++) {
    const raw = await redis.rpop(QUEUE_KEY)
    if (!raw) break

    let item: QueuedEmail | null = null
    try {
      item = typeof raw === 'string' ? JSON.parse(raw) : (raw as QueuedEmail)
      const sent = await resend.emails.send({ from: FROM, to: item!.to, subject: item!.subject, html: item!.html })
      // Resend can resolve with an `{ error }` object instead of throwing — treat that as failure.
      if (sent?.error) throw new Error(sent.error.message)
      processed++
    } catch {
      failed++
      // Re-queue (within a retry budget) so a send/parse failure doesn't silently lose the email.
      if (item && item.retries < MAX_RETRIES) {
        await redis.lpush(QUEUE_KEY, JSON.stringify({ ...item, retries: item.retries + 1 })).catch(() => {})
        requeued++
      }
    }
  }

  return { processed, failed, requeued }
}
