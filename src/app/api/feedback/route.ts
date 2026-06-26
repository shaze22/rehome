import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'
import { Resend } from 'resend'

const Schema = z.object({
  type: z.enum(['bug', 'cadangan', 'lain-lain']),
  message: z.string().min(5).max(2000),
  page: z.string().max(200).optional(),
})

// Escape user text before placing it in the HTML email (anti-injection/phishing).
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed } = await rateLimit('feedback', ip)
  if (!allowed) return NextResponse.json({ error: 'Too many feedback submissions. Please try again in an hour.' }, { status: 429 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const body = await request.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const { type, message, page } = parsed.data
  const from = user?.email ?? 'Pengguna Tanpa Nama'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'KASSIM <noreply@kassim.app>',
      to: process.env.ADMIN_EMAIL ?? 'syedshazni@todak.com',
      subject: `[Beta Feedback] ${type.toUpperCase()} — ${from}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px">
          <h2 style="color:#14b8a6">Beta Feedback — ${type}</h2>
          <p><strong>Dari:</strong> ${esc(from)}</p>
          ${page ? `<p><strong>Halaman:</strong> ${esc(page)}</p>` : ''}
          <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-top:12px;white-space:pre-wrap">${esc(message)}</div>
        </div>
      `,
    })
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true })
}
