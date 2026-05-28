import { NextResponse } from 'next/server'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { promises as dns } from 'dns'

async function tryConnect(connectionString: string, label: string) {
  try {
    const adapter = new PrismaPg({ connectionString, max: 1, ssl: { rejectUnauthorized: false } })
    const p = new PrismaClient({ adapter })
    const count = await p.user.count()
    await p.$disconnect()
    return { label, status: 'OK', count }
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e)
    const msg = raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 2).join(' | ')
    return { label, status: 'FAIL', error: msg }
  }
}

export async function GET() {
  const pass = 'J4cbPX2UysGRgZAd'
  const ref  = 'hydvxvaugylaizzgjojp'

  let dbIp = 'unknown'
  try {
    const addrs = await dns.resolve4(`db.${ref}.supabase.co`)
    dbIp = addrs[0] ?? 'none'
  } catch (e) { dbIp = `dns-err: ${e}` }

  const results = await Promise.allSettled([
    // Direct connection (IPv4 now enabled)
    tryConnect(`postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`, 'direct-5432'),
    // Seoul pooler (ap-northeast-2) - where 3.38.64.137 lives
    tryConnect(`postgresql://postgres.${ref}:${pass}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`, 'seoul-pooler-6543'),
    tryConnect(`postgresql://postgres.${ref}:${pass}@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres`, 'seoul-pooler-5432'),
    // ap-northeast-1 (Tokyo) too
    tryConnect(`postgresql://postgres.${ref}:${pass}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`, 'tokyo-pooler-6543'),
  ])

  return NextResponse.json({
    dbIp,
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  })
}
