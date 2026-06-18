import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await prisma.listing.updateMany({
    where: { isFeatured: true, featuredUntil: { lt: new Date() } },
    data: { isFeatured: false, featuredUntil: null },
  })

  if (result.count > 0) {
    revalidatePath('/')
    revalidatePath('/listings')
  }

  return NextResponse.json({ ok: true, expired: result.count })
}
