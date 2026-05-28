import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendOutbidEmail(to: string, name: string, listingTitle: string, newBid: number) {
  await getResend().emails.send({
    from: 'BALLOUT <noreply@ballout.my>',
    to,
    subject: `Anda telah ditawar di "${listingTitle}"`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0a0a0f; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #14b8a6;">BALLOUT — Tawaran Baharu!</h2>
        <p>Hai ${name},</p>
        <p>Seseorang telah membuat tawaran baharu sebanyak <strong style="color: #00d9a5;">RM ${newBid}</strong> pada item "<strong>${listingTitle}</strong>".</p>
        <p>Buat tawaran balas sekarang sebelum masa tamat!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/listings" style="background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Lihat Lelongan
        </a>
      </div>
    `,
  })
}

export async function sendAuctionWonEmail(to: string, name: string, listingTitle: string, amount: number, listingId: string) {
  await getResend().emails.send({
    from: 'BALLOUT <noreply@ballout.my>',
    to,
    subject: `Tahniah! Anda menang lelongan "${listingTitle}"`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0a0a0f; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #14b8a6;">BALLOUT — Anda Menang!</h2>
        <p>Tahniah ${name}!</p>
        <p>Anda telah memenangi lelongan untuk "<strong>${listingTitle}</strong>" dengan tawaran <strong style="color: #00d9a5;">RM ${amount}</strong>.</p>
        <p>Sila buat pembayaran dalam masa 24 jam.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}" style="background: #14b8a6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 16px;">
          Buat Pembayaran
        </a>
      </div>
    `,
  })
}

export async function sendPaymentReceivedEmail(to: string, name: string, listingTitle: string, payout: number) {
  await getResend().emails.send({
    from: 'BALLOUT <noreply@ballout.my>',
    to,
    subject: `Pembayaran diterima untuk "${listingTitle}"`,
    html: `
      <div style="font-family: Inter, sans-serif; background: #0a0a0f; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #14b8a6;">BALLOUT — Pembayaran Diterima</h2>
        <p>Hai ${name},</p>
        <p>Pembayaran sebanyak <strong style="color: #00d9a5;">RM ${payout}</strong> untuk "<strong>${listingTitle}</strong>" telah dihantar ke akaun anda.</p>
        <p>Terima kasih kerana menyumbang kepada ekonomi pekeliling!</p>
      </div>
    `,
  })
}
