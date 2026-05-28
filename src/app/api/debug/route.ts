import { NextResponse } from 'next/server'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

async function tryConnect(connectionString: string, label: string) {
  try {
    const adapter = new PrismaPg({ connectionString, max: 1 })
    const p = new PrismaClient({ adapter })
    const count = await p.user.count()
    await p.$disconnect()
    return { label, status: 'OK', count }
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e)
    const msg = raw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3).join(' | ')
    return { label, status: 'FAIL', error: msg }
  }
}

export async function GET() {
  const pass = 'J4cbPX2UysGRgZAd'
  const ref  = 'hydvxvaugylaizzgjojp'
  const host = `aws-0-us-east-1.pooler.supabase.com`

  const results = await Promise.allSettled([
    // Different username formats
    tryConnect(`postgresql://postgres.${ref}:${pass}@${host}:6543/postgres`, 'user=postgres.ref port=6543'),
    tryConnect(`postgresql://postgres.${ref}:${pass}@${host}:5432/postgres`, 'user=postgres.ref port=5432'),
    tryConnect(`postgresql://postgres:${pass}@${host}:6543/postgres`,        'user=postgres port=6543'),
    tryConnect(`postgresql://postgres:${pass}@${host}:5432/postgres`,        'user=postgres port=5432'),
    // Different database names
    tryConnect(`postgresql://postgres.${ref}:${pass}@${host}:6543/${ref}`,   'user=postgres.ref db=ref'),
    tryConnect(`postgresql://postgres:${pass}@${host}:6543/${ref}`,          'user=postgres db=ref'),
    // SSL variants
    tryConnect(`postgresql://postgres.${ref}:${pass}@${host}:6543/postgres?sslmode=require`, 'ssl-require'),
    tryConnect(`postgresql://postgres.${ref}:${pass}@${host}:6543/postgres?sslmode=disable`, 'ssl-disable'),
  ])

  return NextResponse.json(
    results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  )
}
