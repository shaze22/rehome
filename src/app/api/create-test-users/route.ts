import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// One-time route to create test users. Delete after use.
// Call: GET /api/create-test-users?secret=rehome-cron-2026
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const testUsers = [
    { email: 'testseller@kassim.app', name: 'Test Seller', password: 'KassimTest2026!' },
    { email: 'testbuyer@kassim.app', name: 'Test Buyer', password: 'KassimTest2026!' },
  ]

  const results: Record<string, string> = {}

  for (const u of testUsers) {
    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      results[u.email] = 'already exists'
      continue
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name },
    })

    if (error || !data.user) {
      results[u.email] = `error: ${error?.message}`
      continue
    }

    await prisma.user.create({
      data: {
        id: data.user.id,
        email: u.email,
        name: u.name,
        role: 'BUYER',
        rehomeScore: 50,
        icVerified: false,
      },
    })

    results[u.email] = 'created'
  }

  // Email credentials to admin
  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    from: 'KASSIM <noreply@kassim.app>',
    to: 'syedshazni@gmail.com',
    subject: 'KASSIM Test User Credentials',
    html: `
      <h2>KASSIM Test Users Created</h2>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:monospace">
        <tr><th>Role</th><th>Email</th><th>Password</th></tr>
        <tr><td>Test Seller</td><td>testseller@kassim.app</td><td>KassimTest2026!</td></tr>
        <tr><td>Test Buyer</td><td>testbuyer@kassim.app</td><td>KassimTest2026!</td></tr>
      </table>
      <p>Admin panel: <a href="https://kassim.app/admin">kassim.app/admin</a></p>
      <p>Results: ${JSON.stringify(results)}</p>
    `,
  })

  return NextResponse.json({ success: true, results })
}
