import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const ids = req.nextUrl.searchParams.get('ids')
  if (!ids) return NextResponse.json({ valid: [] })

  const idList = ids.split(',').filter(Boolean).slice(0, 20)
  const found = await prisma.listing.findMany({
    where: { id: { in: idList }, status: 'ACTIVE' },
    select: { id: true },
  })

  return NextResponse.json(
    { valid: found.map(l => l.id) },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
