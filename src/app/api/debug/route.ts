import { NextResponse } from 'next/server'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

async function tryConnect(opts: { connectionString: string; ssl?: object }, label: string) {
  try {
    const adapter = new PrismaPg({ ...opts, max: 1 })
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
  const ssl  = { rejectUnauthorized: false }

  const results = await Promise.allSettled([
    tryConnect({ connectionString: `postgresql://postgres.${ref}:${pass}@${host}:6543/postgres`, ssl }, 'pooler-6543-ssl-noverify'),
    tryConnect({ connectionString: `postgresql://postgres.${ref}:${pass}@${host}:5432/postgres`, ssl }, 'pooler-5432-ssl-noverify'),
    tryConnect({ connectionString: `postgresql://postgres:${pass}@${host}:6543/postgres`, ssl },          'postgres-6543-ssl-noverify'),
  ])

  return NextResponse.json(
    results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  )
}
