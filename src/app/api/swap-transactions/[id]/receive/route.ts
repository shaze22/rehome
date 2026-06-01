import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { sendSwapCompletedEmail } from '@/lib/resend'
import { z } from 'zod'

const ReceiveSchema = z.object({
  conditionOk: z.boolean(),
  notes: z.string().max(500).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak dibenarkan.' }, { status: 401 })

  const { id } = await params

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'JSON tidak sah.' }, { status: 400 })
  }

  const parsed = ReceiveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  const tx = await prisma.swapTransaction.findUnique({ where: { id } })
  if (!tx) return NextResponse.json({ error: 'Transaksi tidak dijumpai.' }, { status: 404 })
  if (tx.escrowStatus === 'COMPLETED') return NextResponse.json({ error: 'Transaksi sudah selesai.' }, { status: 400 })
  if (tx.escrowStatus === 'DISPUTED') return NextResponse.json({ error: 'Transaksi dalam pertikaian.' }, { status: 400 })
  if (tx.escrowStatus === 'PENDING') return NextResponse.json({ error: 'Barang belum dihantar lagi.' }, { status: 400 })

  const isSeller = tx.sellerId === user.id
  const isBuyer = tx.buyerId === user.id
  if (!isSeller && !isBuyer) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  if (isBuyer && tx.buyerItemReceived) return NextResponse.json({ error: 'Anda sudah mengesahkan penerimaan.' }, { status: 400 })
  if (isSeller && tx.sellerItemReceived) return NextResponse.json({ error: 'Anda sudah mengesahkan penerimaan.' }, { status: 400 })
  // For CASH, seller doesn't need to confirm receiving (buyer received is enough)
  if (isSeller && tx.offerType === 'CASH') return NextResponse.json({ error: 'Pengesahan ini tidak diperlukan untuk tawaran wang tunai.' }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (isBuyer) update.buyerItemReceived = true
  if (isSeller) update.sellerItemReceived = true

  // Determine if completed
  const newBuyerReceived = isBuyer ? true : tx.buyerItemReceived
  const newSellerReceived = isSeller ? true : tx.sellerItemReceived

  const allReceived = tx.offerType === 'CASH'
    ? newBuyerReceived
    : newBuyerReceived && newSellerReceived

  if (allReceived) {
    update.escrowStatus = 'COMPLETED'
    update.resolvedAt = new Date()
  }

  const updated = await prisma.swapTransaction.update({ where: { id }, data: update })

  // On completion: update swap scores, verified badge, send emails
  if (allReceived) {
    const [seller, buyer] = await Promise.all([
      prisma.user.findUnique({ where: { id: tx.sellerId }, select: { email: true, name: true, successfulSwaps: true } }),
      prisma.user.findUnique({ where: { id: tx.buyerId }, select: { email: true, name: true, successfulSwaps: true } }),
    ])

    function calcSwapScore(newCount: number) {
      // 1 swap=4.1, 5 swaps=4.5 (verified), 10 swaps=5.0
      return Math.min(4.0 + newCount * 0.1, 5.0)
    }

    const sellerNewCount = (seller?.successfulSwaps ?? 0) + 1
    const buyerNewCount = (buyer?.successfulSwaps ?? 0) + 1

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tx.sellerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(sellerNewCount),
          swapVerified: sellerNewCount >= 5,
        },
      }),
      prisma.user.update({
        where: { id: tx.buyerId },
        data: {
          successfulSwaps: { increment: 1 },
          swapScore: calcSwapScore(buyerNewCount),
          swapVerified: buyerNewCount >= 5,
        },
      }),
    ])

    // Emails — fire-and-forget
    const listingTitle = await prisma.listing.findUnique({ where: { id: tx.listingId }, select: { title: true } }).then(l => l?.title ?? 'Listing')
    if (seller?.email) sendSwapCompletedEmail(seller.email, seller.name ?? 'Penjual', listingTitle).catch(() => {})
    if (buyer?.email) sendSwapCompletedEmail(buyer.email, buyer.name ?? 'Pembeli', listingTitle).catch(() => {})
  }

  return NextResponse.json({ transaction: updated, completed: !!allReceived })
}
