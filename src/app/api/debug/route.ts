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

  // DNS lookup to find project region
  let dbIp = 'unknown'
  try {
    const addrs = await dns.resolve4(`db.${ref}.supabase.co`)
    dbIp = addrs[0] ?? 'none'
  } catch (e) { dbIp = `dns-err: ${e}` }

  // Try all Supabase pooler regions
  const regions = ['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-central-1','ap-northeast-1','ap-southeast-2','sa-east-1','ca-central-1']
  const tests = regions.map(r =>
    tryConnect(`postgresql://postgres.${ref}:${pass}@aws-0-${r}.pooler.supabase.com:6543/postgres`, r)
  )

  const results = await Promise.allSettled(tests)
  return NextResponse.json({
    dbIp,
    regions: results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  })
}
