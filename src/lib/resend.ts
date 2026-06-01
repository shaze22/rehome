import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://rehome-eta.vercel.app'
const FROM = 'BALLOUT <noreply@ballout.my>'

function baseTemplate(title: string, body: string, ctaLabel: string, ctaUrl: string) {
  return `
    <div style="font-family:Inter,sans-serif;background:#0a0a0f;color:#e2e8f0;padding:32px;max-width:560px;border-radius:12px;margin:0 auto">
      <div style="margin-bottom:24px">
        <span style="color:#14b8a6;font-weight:700;font-size:18px">⚡ BALLOUT</span>
      </div>
      <h2 style="color:#e2e8f0;margin:0 0 16px">${title}</h2>
      ${body}
      <a href="${ctaUrl}" style="display:inline-block;background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px">${ctaLabel}</a>
      <p style="color:#475569;font-size:12px;margin-top:24px">BALLOUT — Platform Ekonomi Pekeliling Malaysia</p>
    </div>
  `
}

// ── Flash Bid ─────────────────────────────────────────────────────

export async function sendOutbidEmail(to: string, name: string, listingTitle: string, newBid: number) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Anda telah ditawar di "${listingTitle}"`,
    html: baseTemplate(
      'Tawaran Baharu!',
      `<p>Hai ${name},</p><p>Seseorang baru tawaran <strong style="color:#00d9a5">RM ${newBid}</strong> pada "<strong>${listingTitle}</strong>". Buat tawaran balas sekarang!</p>`,
      'Lihat Lelongan', `${BASE}/listings`
    ),
  })
}

export async function sendAuctionWonEmail(to: string, name: string, listingTitle: string, amount: number, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Tahniah! Anda menang lelongan "${listingTitle}"`,
    html: baseTemplate(
      'Anda Menang! 🎉',
      `<p>Tahniah ${name}!</p><p>Anda memenangi "<strong>${listingTitle}</strong>" dengan tawaran <strong style="color:#00d9a5">RM ${amount}</strong>. Buat pembayaran dalam masa 24 jam.</p>`,
      'Buat Pembayaran', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendPaymentReceivedEmail(to: string, name: string, listingTitle: string, payout: number) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Pembayaran diterima untuk "${listingTitle}"`,
    html: baseTemplate(
      'Pembayaran Diterima',
      `<p>Hai ${name},</p><p>Pembayaran <strong style="color:#00d9a5">RM ${payout}</strong> untuk "<strong>${listingTitle}</strong>" telah diproses.</p>`,
      'Lihat Dashboard', `${BASE}/dashboard`
    ),
  })
}

// ── Swap Bid ──────────────────────────────────────────────────────

export async function sendSwapOfferReceivedEmail(to: string, sellerName: string, listingTitle: string, offerType: string, listingId: string) {
  const typeLabel = offerType === 'CASH' ? 'Wang Tunai' : offerType === 'SWAP' ? 'Tukar Barang' : 'Barang + Wang'
  await getResend().emails.send({
    from: FROM, to,
    subject: `Tawaran baharu pada "${listingTitle}"`,
    html: baseTemplate(
      'Tawaran Baharu Diterima! 🔄',
      `<p>Hai ${sellerName},</p><p>Seseorang membuat tawaran <strong style="color:#16a34a">${typeLabel}</strong> pada listing anda "<strong>${listingTitle}</strong>".</p><p>Semak tawaran dan terima, tolak, atau counter sekarang.</p>`,
      'Semak Tawaran', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapOfferCounteredEmail(to: string, bidderName: string, listingTitle: string, listingId: string, isFromSeller: boolean) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Counter tawaran pada "${listingTitle}"`,
    html: baseTemplate(
      'Tawaran Anda Di-counter 💬',
      `<p>Hai ${bidderName},</p><p>${isFromSeller ? 'Pemilik listing' : 'Penawar'} telah membuat counter tawaran pada "<strong>${listingTitle}</strong>".</p><p>Lihat syarat baharu dan beri respons anda.</p>`,
      'Lihat Counter Tawaran', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapOfferAcceptedEmail(to: string, buyerName: string, listingTitle: string, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Tawaran anda diterima untuk "${listingTitle}"! 🎉`,
    html: baseTemplate(
      'Tawaran Diterima! 🎉',
      `<p>Tahniah ${buyerName}!</p><p>Tawaran anda untuk "<strong>${listingTitle}</strong>" telah diterima oleh pemilik. Proses pertukaran kini bermula.</p><p><strong>Langkah seterusnya:</strong> Sila hantar barang anda dan muat naik foto penghantaran.</p>`,
      'Mulakan Proses Tukar', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapItemShippedEmail(to: string, recipientName: string, listingTitle: string, senderName: string, courier: string | null, tracking: string | null, listingId: string) {
  const trackingInfo = (courier || tracking)
    ? `<p style="background:#1e293b;padding:12px;border-radius:8px;font-family:monospace">${courier ? `Kurier: ${courier}<br>` : ''}${tracking ? `No. Tracking: ${tracking}` : ''}</p>`
    : ''
  await getResend().emails.send({
    from: FROM, to,
    subject: `${senderName} telah menghantar barang untuk "${listingTitle}"`,
    html: baseTemplate(
      'Barang Sedang Dalam Perjalanan 📦',
      `<p>Hai ${recipientName},</p><p><strong>${senderName}</strong> telah menghantar barang untuk pertukaran "<strong>${listingTitle}</strong>".</p>${trackingInfo}<p>Sahkan penerimaan setelah barang tiba dalam keadaan baik.</p>`,
      'Sahkan Penerimaan', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapCompletedEmail(to: string, name: string, listingTitle: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Pertukaran "${listingTitle}" berjaya! ✅`,
    html: baseTemplate(
      'Pertukaran Berjaya! ✅',
      `<p>Tahniah ${name}!</p><p>Pertukaran "<strong>${listingTitle}</strong>" telah selesai dengan jayanya. Skor Swap anda telah dikemas kini.</p><p>Terima kasih kerana menyumbang kepada ekonomi pekeliling Malaysia!</p>`,
      'Lihat Profil', `${BASE}/dashboard`
    ),
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: 'Selamat datang ke BALLOUT! 🎉',
    html: baseTemplate(
      'Selamat Datang ke BALLOUT!',
      `<p>Hai ${name},</p>
      <p>Terima kasih kerana menyertai <strong>BALLOUT</strong> — platform lelongan dan tukar barang pertama Malaysia!</p>
      <p>Apa yang boleh anda buat:</p>
      <ul style="padding-left:20px;color:#94a3b8;line-height:2">
        <li>⚡ <strong style="color:#e2e8f0">Lelong Pantas</strong> — bida barangan terpakai dalam 30 minit</li>
        <li>🔄 <strong style="color:#e2e8f0">Tukar Barang</strong> — tukar barang anda tanpa wang</li>
        <li>🤖 <strong style="color:#e2e8f0">Harga AI</strong> — cadangan harga automatik</li>
        <li>🛡️ <strong style="color:#e2e8f0">Escrow Selamat</strong> — wang terjamin sehingga barang tiba</li>
      </ul>
      <p style="margin-top:16px">Mula dengan semak imbas listing atau letak barangan pertama anda!</p>`,
      'Semak Imbas Lelongan', `${BASE}/listings`,
    ),
  })
}

export async function sendSwapDisputeEmail(to: string, listingTitle: string, disputerName: string, reason: string, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `[Admin] Pertikaian difailkan: "${listingTitle}"`,
    html: baseTemplate(
      '⚠️ Pertikaian Difailkan',
      `<p>Pertikaian baharu difailkan oleh <strong>${disputerName}</strong> untuk listing "<strong>${listingTitle}</strong>".</p><p style="background:#1e293b;padding:12px;border-radius:8px">"${reason}"</p><p>Sila semak dan selesaikan pertikaian ini.</p>`,
      'Semak Pertikaian', `${BASE}/admin`
    ),
  })
}
