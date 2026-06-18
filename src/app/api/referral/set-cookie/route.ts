import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'

  if (!code) return NextResponse.redirect(`${BASE}/auth/register`)

  // Block sub-resource loads (img, script tags) — only allow direct browser navigation
  // Prevents attacker from stealing referral credit via <img src="/api/referral/set-cookie?code=...">
  const fetchDest = request.headers.get('sec-fetch-dest')
  if (fetchDest && fetchDest !== 'document' && fetchDest !== 'empty') {
    return NextResponse.redirect(`${BASE}/auth/register`)
  }

  // Validate code exists
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })

  if (!referrer) return NextResponse.redirect(`${BASE}/auth/register`)

  const response = NextResponse.redirect(`${BASE}/auth/register`)
  response.cookies.set('kassim_ref', code, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  })
  return response
}
