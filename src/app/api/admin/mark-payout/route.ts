import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { transferToSeller } from '@/lib/connect'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
  if (dbUser?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { allowed } = await rateLimit('admin', user.id)
  if (!allowed) return NextResponse.json({ error: 'Too many admin actions. Please slow down.' }, { status: 429 })

  const { transactionId, note } = await request.json() as { transactionId: string; note?: string }
  if (!transactionId) return NextResponse.json({ error: 'transactionId required.' }, { status: 400 })

  const tx = await prisma.transaction.findUnique({ where: { id: transactionId } })
  if (!tx) return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
  if (tx.sellerPaid) return NextResponse.json({ error: 'Already marked as paid.' }, { status: 400 })
  if (tx.status !== 'RELEASED') return NextResponse.json({ error: 'Transaction must be RELEASED before payout can be marked.' }, { status: 400 })

  // Onboarded sellers are paid via Stripe Connect Transfer; this is the admin override
  // (auto-payout normally fires when the buyer confirms receipt).
  const seller = await prisma.user.findUnique({ where: { id: tx.sellerId }, select: { stripeOnboarded: true } })
  if (seller?.stripeOnboarded) {
    const result = await transferToSeller(tx.listingId)
    if (result.ok) {
      if (note) await prisma.transaction.update({ where: { id: transactionId }, data: { payoutNote: note } })
      return NextResponse.json({ success: true, method: 'stripe' })
    }
    if (result.reason === 'error') return NextResponse.json({ error: result.message ?? 'Stripe transfer failed.' }, { status: 502 })
    // result.reason === 'already_paid' falls through to the manual marker below
  }

  // Manual payout (non-onboarded seller — admin made a bank transfer). Conditional so two
  // admins / a confirm race can't double-mark.
  const marked = await prisma.transaction.updateMany({
    where: { id: transactionId, sellerPaid: false },
    data: { sellerPaid: true, sellerPaidAt: new Date(), payoutNote: note ?? null },
  })
  if (marked.count === 0) return NextResponse.json({ error: 'Already marked as paid.' }, { status: 400 })

  return NextResponse.json({ success: true, method: 'manual' })
}
