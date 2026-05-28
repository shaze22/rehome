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
    const msg = e instanceof Error ? e.message.split('\n')[2]?.trim() ?? e.message : String(e)
    return { label, status: 'FAIL', error: msg }
  }
}

export async function GET() {
  const pass = 'J4cbPX2UysGRgZAd'
  const ref  = 'hydvxvaugylaizzgjojp'

  const results = await Promise.allSettled([
    tryConnect(
      `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
      'direct-5432'
    ),
    tryConnect(
      `postgresql://postgres:${pass}@db.${ref}.supabase.co:6543/postgres`,
      'direct-6543'
    ),
    tryConnect(
      `postgresql://postgres.${ref}:${pass}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
      'pooler-ap-southeast-1-5432'
    ),
    tryConnect(
      `postgresql://postgres.${ref}:${pass}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
      'pooler-ap-southeast-1-6543'
    ),
    tryConnect(
      `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      'pooler-us-east-1-5432'
    ),
    tryConnect(
      `postgresql://postgres.${ref}:${pass}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      'pooler-us-east-1-6543'
    ),
  ])

  return NextResponse.json(
    results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) })
  )
}
