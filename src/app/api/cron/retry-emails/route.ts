import { NextRequest, NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email-queue'

export const maxDuration = 30

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? new URL(request.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await processEmailQueue()
  return NextResponse.json({ ok: true, ...result })
}
