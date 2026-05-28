import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const results: Record<string, unknown> = {}

  try {
    results.userCount = await prisma.user.count()
  } catch (e) {
    results.userCountError = String(e)
  }

  try {
    results.listingCount = await prisma.listing.count()
  } catch (e) {
    results.listingCountError = String(e)
  }

  try {
    results.userFindFirst = await prisma.user.findFirst({ select: { id: true, role: true } })
  } catch (e) {
    results.userFindFirstError = String(e)
  }

  try {
    results.listingStatus = await prisma.listing.count({ where: { status: 'ACTIVE' } })
  } catch (e) {
    results.listingStatusError = String(e)
  }

  try {
    results.userIcStatus = await prisma.user.count({ where: { icStatus: 'UNVERIFIED' } })
  } catch (e) {
    results.userIcStatusError = String(e)
  }

  return NextResponse.json(results)
}
