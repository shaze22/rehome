import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
const FROM = 'KASSIM <noreply@kassim.app>'

function baseTemplate(title: string, body: string, ctaLabel: string, ctaUrl: string) {
  return `
    <div style="font-family:Inter,sans-serif;background:#0a0a0f;color:#e2e8f0;padding:32px;max-width:560px;border-radius:12px;margin:0 auto">
      <div style="margin-bottom:24px">
        <span style="color:#14b8a6;font-weight:700;font-size:18px">⚡ KASSIM</span>
      </div>
      <h2 style="color:#e2e8f0;margin:0 0 16px">${title}</h2>
      ${body}
      <a href="${ctaUrl}" style="display:inline-block;background:#14b8a6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px">${ctaLabel}</a>
      <p style="color:#475569;font-size:12px;margin-top:24px">KASSIM — Malaysia's Circular Economy Platform</p>
    </div>
  `
}

// ── Flash Bid ─────────────────────────────────────────────────────

export async function sendOutbidEmail(
  to: string, name: string, listingTitle: string, newBid: number,
  listingId: string, endsAt: Date | null
) {
  const url = `${BASE}/listings/${listingId}`
  const timeStr = endsAt
    ? `Auction ends in ${Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 60000))} minutes.`
    : ''
  await getResend().emails.send({
    from: FROM, to,
    subject: `⚡ You've been outbid — ${listingTitle}`,
    html: baseTemplate(
      '⚡ You\'ve Been Outbid!',
      `<p>Hi ${name},</p>
       <p>Someone just outbid you on "<strong>${listingTitle}</strong>".</p>
       <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
         <span style="color:#94a3b8;font-size:12px">Current bid</span><br>
         <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${newBid}</span>
       </p>
       ${timeStr ? `<p style="color:#f59e0b;font-size:13px">⏱ ${timeStr} Don't let someone else win!</p>` : ''}`,
      'Bid Again Now', url
    ),
  })
}

export async function sendWatchlistAlertEmail(
  to: string, listingTitle: string, currentBid: number, listingUrl: string
) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `🔔 New bid on your saved item — ${listingTitle}`,
    html: baseTemplate(
      '🔔 New Bid Alert!',
      `<p>Your saved item "<strong>${listingTitle}</strong>" just received a new bid.</p>
       <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
         <span style="color:#94a3b8;font-size:12px">Current bid</span><br>
         <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${currentBid}</span>
       </p>
       <p style="color:#94a3b8;font-size:13px">Want to place a bid? Don't wait — the auction closes when the timer runs out!</p>`,
      'View Listing', listingUrl
    ),
  })
}

export async function sendAuctionWonEmail(to: string, name: string, listingTitle: string, amount: number, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `🎉 Congratulations! You won the auction for "${listingTitle}"`,
    html: baseTemplate(
      'You Won! 🎉',
      `<p>Congratulations ${name}!</p>
       <p>You won "<strong>${listingTitle}</strong>" with a bid of <strong style="color:#00d9a5">RM ${amount}</strong>.</p>
       <p>Complete your payment within 24 hours to confirm the purchase.</p>`,
      'Pay Now', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendAuctionExpiredSellerEmail(
  to: string, sellerName: string, listingTitle: string, winnerBid: number, listingId: string
) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Your auction has ended — ${listingTitle}`,
    html: baseTemplate(
      'Your Auction Has Ended! 🏁',
      `<p>Congratulations ${sellerName}!</p>
       <p>Your auction "<strong>${listingTitle}</strong>" has ended. The winning bid was:</p>
       <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
         <span style="color:#94a3b8;font-size:12px">Winning bid</span><br>
         <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${winnerBid}</span>
       </p>
       <p style="color:#94a3b8;font-size:13px">Wait for the buyer to complete payment. Prepare your item for shipping.</p>`,
      'View Listing Status', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendPaymentReceivedEmail(to: string, name: string, listingTitle: string, payout: number) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Payment received for "${listingTitle}"`,
    html: baseTemplate(
      'Payment Received',
      `<p>Hi ${name},</p><p>Payment of <strong style="color:#00d9a5">RM ${payout}</strong> for "<strong>${listingTitle}</strong>" has been processed.</p>`,
      'View Dashboard', `${BASE}/dashboard`
    ),
  })
}

// ── Swap Bid ──────────────────────────────────────────────────────

export async function sendSwapOfferReceivedEmail(to: string, sellerName: string, listingTitle: string, offerType: string, listingId: string) {
  const typeLabel = offerType === 'CASH' ? 'Cash' : offerType === 'SWAP' ? 'Item Swap' : 'Item + Cash'
  await getResend().emails.send({
    from: FROM, to,
    subject: `New offer on "${listingTitle}"`,
    html: baseTemplate(
      'New Offer Received! 🔄',
      `<p>Hi ${sellerName},</p><p>Someone made a <strong style="color:#16a34a">${typeLabel}</strong> offer on your listing "<strong>${listingTitle}</strong>".</p><p>Review the offer and accept, reject, or counter now.</p>`,
      'View Offer', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapOfferCounteredEmail(to: string, bidderName: string, listingTitle: string, listingId: string, isFromSeller: boolean) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Counter offer on "${listingTitle}"`,
    html: baseTemplate(
      'Your Offer Has Been Countered 💬',
      `<p>Hi ${bidderName},</p><p>${isFromSeller ? 'The listing owner' : 'The bidder'} has made a counter offer on "<strong>${listingTitle}</strong>".</p><p>Review the new terms and respond.</p>`,
      'View Counter Offer', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapOfferAcceptedEmail(to: string, buyerName: string, listingTitle: string, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Your offer was accepted for "${listingTitle}"! 🎉`,
    html: baseTemplate(
      'Offer Accepted! 🎉',
      `<p>Congratulations ${buyerName}!</p><p>Your offer for "<strong>${listingTitle}</strong>" has been accepted by the owner. The swap process has begun.</p><p><strong>Next step:</strong> Ship your item and upload proof of shipment.</p>`,
      'Start Swap Process', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapItemShippedEmail(to: string, recipientName: string, listingTitle: string, senderName: string, courier: string | null, tracking: string | null, listingId: string) {
  const trackingInfo = (courier || tracking)
    ? `<p style="background:#1e293b;padding:12px;border-radius:8px;font-family:monospace">${courier ? `Courier: ${courier}<br>` : ''}${tracking ? `Tracking No: ${tracking}` : ''}</p>`
    : ''
  await getResend().emails.send({
    from: FROM, to,
    subject: `${senderName} has shipped their item for "${listingTitle}"`,
    html: baseTemplate(
      'Item On Its Way 📦',
      `<p>Hi ${recipientName},</p><p><strong>${senderName}</strong> has shipped their item for the swap "<strong>${listingTitle}</strong>".</p>${trackingInfo}<p>Confirm receipt once the item arrives in good condition.</p>`,
      'Confirm Receipt', `${BASE}/listings/${listingId}`
    ),
  })
}

export async function sendSwapCompletedEmail(to: string, name: string, listingTitle: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `Swap completed for "${listingTitle}"! ✅`,
    html: baseTemplate(
      'Swap Completed! ✅',
      `<p>Congratulations ${name}!</p><p>The swap for "<strong>${listingTitle}</strong>" has been completed successfully. Your Swap Score has been updated.</p><p>Thank you for contributing to Malaysia's circular economy!</p>`,
      'View Profile', `${BASE}/dashboard`
    ),
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: 'Welcome to KASSIM! 🎉',
    html: baseTemplate(
      'Welcome to KASSIM!',
      `<p>Hi ${name},</p>
      <p>Thanks for joining <strong>KASSIM</strong> — Malaysia's #1 flash auction and item swap platform!</p>
      <p>Here's what you can do:</p>
      <ul style="padding-left:20px;color:#94a3b8;line-height:2">
        <li>⚡ <strong style="color:#e2e8f0">Flash Auctions</strong> — bid on pre-loved items in 30 minutes</li>
        <li>🔄 <strong style="color:#e2e8f0">Item Swaps</strong> — trade items without cash</li>
        <li>🤖 <strong style="color:#e2e8f0">AI Pricing</strong> — automatic price suggestions</li>
        <li>🛡️ <strong style="color:#e2e8f0">Secure Escrow</strong> — funds held until item arrives</li>
      </ul>
      <p style="margin-top:16px">Start by browsing listings or posting your first item!</p>`,
      'Browse Listings', `${BASE}/listings`,
    ),
  })
}

export async function sendSwapDisputeEmail(to: string, listingTitle: string, disputerName: string, reason: string, listingId: string) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `[Admin] Dispute filed: "${listingTitle}"`,
    html: baseTemplate(
      '⚠️ Dispute Filed',
      `<p>A new dispute has been filed by <strong>${disputerName}</strong> for listing "<strong>${listingTitle}</strong>".</p><p style="background:#1e293b;padding:12px;border-radius:8px">"${reason}"</p><p>Please review and resolve this dispute.</p>`,
      'Review Dispute', `${BASE}/admin`
    ),
  })
}

// ── Referral ──────────────────────────────────────────────────────

export async function sendReferralRewardEmail(to: string, name: string, friendName: string, credit: number) {
  await getResend().emails.send({
    from: FROM, to,
    subject: `🎁 RM${credit} credit added — your friend just signed up!`,
    html: baseTemplate(
      '🎁 Referral Credit Received!',
      `<p>Congratulations ${name}!</p>
       <p><strong>${friendName}</strong> just signed up on KASSIM using your referral code.</p>
       <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
         <span style="color:#94a3b8;font-size:12px">Credit added</span><br>
         <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">+RM${credit}</span>
       </p>
       <p style="color:#94a3b8;font-size:13px">Credit can be used as a discount when bidding on Flash auctions.</p>`,
      'View Dashboard', `${BASE}/dashboard`
    ),
  })
}
