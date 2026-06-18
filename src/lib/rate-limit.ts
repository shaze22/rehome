import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
function getRedis(): Redis {
  if (!redis) redis = Redis.fromEnv()
  return redis
}

function makeRatelimiter(max: number, window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`, prefix: string) {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(max, window),
    prefix,
  })
}

const limiters = {
  bid:      () => makeRatelimiter(30, '5 m',  'rl:bid'),
  offer:    () => makeRatelimiter(10, '1 h',  'rl:offer'),
  listing:  () => makeRatelimiter(5,  '1 h',  'rl:listing'),
  feedback: () => makeRatelimiter(5,  '1 h',  'rl:feedback'),
  admin:    () => makeRatelimiter(20, '1 m',  'rl:admin'),
} as const

type LimiterKey = keyof typeof limiters
const cache = new Map<LimiterKey, Ratelimit>()

function getLimiter(key: LimiterKey): Ratelimit {
  if (!cache.has(key)) cache.set(key, limiters[key]())
  return cache.get(key)!
}

export async function rateLimit(
  type: LimiterKey,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { success, remaining } = await getLimiter(type).limit(identifier)
    return { allowed: success, remaining }
  } catch {
    // If Redis is unreachable, fail open (don't block users)
    return { allowed: true, remaining: 0 }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}
