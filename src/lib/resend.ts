import { Resend } from 'resend'
import { queueEmail } from './email-queue'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'
const FROM = 'KASSIM <noreply@kassim.app>'

async function safeSend(to: string, subject: string, html: string): Promise<void> {
  await getResend().emails.send({ from: FROM, to, subject, html }).catch(() => {
    void queueEmail(to, subject, html)
  })
}

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
  await safeSend(to, `⚡ You've been outbid — ${listingTitle}`, baseTemplate(
    '⚡ You\'ve Been Outbid!',
    `<p>Hi ${name},</p>
     <p>Someone just outbid you on "<strong>${listingTitle}</strong>".</p>
     <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
       <span style="color:#94a3b8;font-size:12px">Current bid</span><br>
       <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${newBid}</span>
     </p>
     ${timeStr ? `<p style="color:#f59e0b;font-size:13px">⏱ ${timeStr} Don't let someone else win!</p>` : ''}`,
    'Bid Again Now', url
  ))
}

export async function sendWatchlistAlertEmail(
  to: string, listingTitle: string, currentBid: number, listingUrl: string
) {
  await safeSend(to, `🔔 New bid on your saved item — ${listingTitle}`, baseTemplate(
    '🔔 New Bid Alert!',
    `<p>Your saved item "<strong>${listingTitle}</strong>" just received a new bid.</p>
     <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
       <span style="color:#94a3b8;font-size:12px">Current bid</span><br>
       <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${currentBid}</span>
     </p>
     <p style="color:#94a3b8;font-size:13px">Want to place a bid? Don't wait — the auction closes when the timer runs out!</p>`,
    'View Listing', listingUrl
  ))
}

export async function sendAuctionWonEmail(to: string, name: string, listingTitle: string, amount: number, listingId: string) {
  await safeSend(to, `🎉 Congratulations! You won the auction for "${listingTitle}"`, baseTemplate(
    'You Won! 🎉',
    `<p>Congratulations ${name}!</p>
     <p>You won "<strong>${listingTitle}</strong>" with a bid of <strong style="color:#00d9a5">RM ${amount}</strong>.</p>
     <p>Complete your payment within 24 hours to confirm the purchase.</p>`,
    'Pay Now', `${BASE}/listings/${listingId}`
  ))
}

export async function sendAuctionExpiredSellerEmail(
  to: string, sellerName: string, listingTitle: string, winnerBid: number, listingId: string
) {
  await safeSend(to, `Your auction has ended — ${listingTitle}`, baseTemplate(
    'Your Auction Has Ended! 🏁',
    `<p>Congratulations ${sellerName}!</p>
     <p>Your auction "<strong>${listingTitle}</strong>" has ended. The winning bid was:</p>
     <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
       <span style="color:#94a3b8;font-size:12px">Winning bid</span><br>
       <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">RM ${winnerBid}</span>
     </p>
     <p style="color:#94a3b8;font-size:13px">Wait for the buyer to complete payment. Prepare your item for shipping.</p>`,
    'View Listing Status', `${BASE}/listings/${listingId}`
  ))
}

export async function sendPaymentReceivedEmail(to: string, name: string, listingTitle: string, payout: number) {
  await safeSend(to, `Payment received for "${listingTitle}"`, baseTemplate(
    'Payment Received',
    `<p>Hi ${name},</p><p>Payment of <strong style="color:#00d9a5">RM ${payout}</strong> for "<strong>${listingTitle}</strong>" has been processed.</p>`,
    'View Dashboard', `${BASE}/dashboard`
  ))
}

export async function sendShipNowEmail(
  to: string, sellerName: string, listingTitle: string, listingId: string,
  courierName: string | null, buyerPostcode: string | null, easyparcelOrderId: string | null,
) {
  const deliveryBlock = courierName
    ? `<div style="background:#1e293b;padding:16px;border-radius:8px;margin:16px 0">
        <p style="color:#94a3b8;font-size:12px;margin:0 0 8px">Delivery Details</p>
        ${courierName ? `<p style="margin:4px 0"><span style="color:#94a3b8">Courier:</span> <strong>${courierName}</strong></p>` : ''}
        ${buyerPostcode ? `<p style="margin:4px 0"><span style="color:#94a3b8">Buyer Postcode:</span> <strong>${buyerPostcode}</strong></p>` : ''}
        ${easyparcelOrderId ? `<p style="margin:4px 0"><span style="color:#94a3b8">EasyParcel Order ID:</span> <strong style="color:#14b8a6;font-family:monospace">${easyparcelOrderId}</strong></p>` : ''}
       </div>`
    : '<p>Buyer has chosen self pick-up. Arrange with them via the chat on the listing page.</p>'

  await safeSend(to, `📦 Ship your item — ${listingTitle}`, baseTemplate(
    '📦 Payment Confirmed — Ship Now!',
    `<p>Hi ${sellerName},</p>
     <p>Your item "<strong>${listingTitle}</strong>" has been paid for. Please ship it as soon as possible.</p>
     ${deliveryBlock}
     <p style="color:#f59e0b;font-size:13px">⚠️ Please ship within 3 working days to keep your seller score high.</p>`,
    'View Listing', `${BASE}/listings/${listingId}`
  ))
}

// ── Swap Bid ──────────────────────────────────────────────────────

export async function sendSwapOfferReceivedEmail(to: string, sellerName: string, listingTitle: string, offerType: string, listingId: string) {
  const typeLabel = offerType === 'CASH' ? 'Cash' : offerType === 'SWAP' ? 'Item Swap' : 'Item + Cash'
  await safeSend(to, `New offer on "${listingTitle}"`, baseTemplate(
    'New Offer Received! 🔄',
    `<p>Hi ${sellerName},</p><p>Someone made a <strong style="color:#16a34a">${typeLabel}</strong> offer on your listing "<strong>${listingTitle}</strong>".</p><p>Review the offer and accept, reject, or counter now.</p>`,
    'View Offer', `${BASE}/listings/${listingId}`
  ))
}

export async function sendSwapOfferCounteredEmail(to: string, bidderName: string, listingTitle: string, listingId: string, isFromSeller: boolean) {
  await safeSend(to, `Counter offer on "${listingTitle}"`, baseTemplate(
    'Your Offer Has Been Countered 💬',
    `<p>Hi ${bidderName},</p><p>${isFromSeller ? 'The listing owner' : 'The bidder'} has made a counter offer on "<strong>${listingTitle}</strong>".</p><p>Review the new terms and respond.</p>`,
    'View Counter Offer', `${BASE}/listings/${listingId}`
  ))
}

export async function sendSwapOfferAcceptedEmail(to: string, buyerName: string, listingTitle: string, listingId: string) {
  await safeSend(to, `Your offer was accepted for "${listingTitle}"! 🎉`, baseTemplate(
    'Offer Accepted! 🎉',
    `<p>Congratulations ${buyerName}!</p><p>Your offer for "<strong>${listingTitle}</strong>" has been accepted by the owner. The swap process has begun.</p><p><strong>Next step:</strong> Ship your item and upload proof of shipment.</p>`,
    'Start Swap Process', `${BASE}/listings/${listingId}`
  ))
}

export async function sendSwapItemShippedEmail(to: string, recipientName: string, listingTitle: string, senderName: string, courier: string | null, tracking: string | null, listingId: string) {
  const trackingInfo = (courier || tracking)
    ? `<p style="background:#1e293b;padding:12px;border-radius:8px;font-family:monospace">${courier ? `Courier: ${courier}<br>` : ''}${tracking ? `Tracking No: ${tracking}` : ''}</p>`
    : ''
  await safeSend(to, `${senderName} has shipped their item for "${listingTitle}"`, baseTemplate(
    'Item On Its Way 📦',
    `<p>Hi ${recipientName},</p><p><strong>${senderName}</strong> has shipped their item for the swap "<strong>${listingTitle}</strong>".</p>${trackingInfo}<p>Confirm receipt once the item arrives in good condition.</p>`,
    'Confirm Receipt', `${BASE}/listings/${listingId}`
  ))
}

export async function sendSwapCompletedEmail(to: string, name: string, listingTitle: string) {
  await safeSend(to, `Swap completed for "${listingTitle}"! ✅`, baseTemplate(
    'Swap Completed! ✅',
    `<p>Congratulations ${name}!</p><p>The swap for "<strong>${listingTitle}</strong>" has been completed successfully. Your Swap Score has been updated.</p><p>Thank you for contributing to Malaysia's circular economy!</p>`,
    'View Profile', `${BASE}/dashboard`
  ))
}

export async function sendWelcomeEmail(to: string, name: string) {
  await safeSend(to, 'Welcome to KASSIM! 🎉', baseTemplate(
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
    'Browse Listings', `${BASE}/listings`
  ))
}

export async function sendSwapDisputeEmail(to: string, listingTitle: string, disputerName: string, reason: string, listingId: string) {
  await safeSend(to, `[Admin] Dispute filed: "${listingTitle}"`, baseTemplate(
    '⚠️ Dispute Filed',
    `<p>A new dispute has been filed by <strong>${disputerName}</strong> for listing "<strong>${listingTitle}</strong>".</p><p style="background:#1e293b;padding:12px;border-radius:8px">"${reason}"</p><p>Please review and resolve this dispute.</p>`,
    'Review Dispute', `${BASE}/admin`
  ))
}

// ── Referral ──────────────────────────────────────────────────────

export async function sendReferralRewardEmail(to: string, name: string, friendName: string, credit: number) {
  await safeSend(to, `🎁 RM${credit} credit added — your friend just signed up!`, baseTemplate(
    '🎁 Referral Credit Received!',
    `<p>Congratulations ${name}!</p>
     <p><strong>${friendName}</strong> just signed up on KASSIM using your referral code.</p>
     <p style="background:#1e293b;padding:16px;border-radius:8px;text-align:center">
       <span style="color:#94a3b8;font-size:12px">Credit added</span><br>
       <span style="color:#00d9a5;font-size:28px;font-weight:700;font-family:monospace">+RM${credit}</span>
     </p>
     <p style="color:#94a3b8;font-size:13px">Credit can be used as a discount when bidding on Flash auctions.</p>`,
    'View Dashboard', `${BASE}/dashboard`
  ))
}

export async function sendEasyParcelFailureEmail(
  sellerEmail: string, sellerName: string,
  listingTitle: string, listingId: string,
  errorMsg: string
) {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'syedshazni@todak.com'
  const listingUrl = `${BASE}/listings/${listingId}`

  // Notify seller — book manually
  await safeSend(sellerEmail, `Action needed: Book delivery for "${listingTitle}"`, baseTemplate(
    'Please Book Delivery Manually',
    `<p>Hi ${sellerName},</p>
     <p>Great news — your item <strong>${listingTitle}</strong> has been sold and payment received!</p>
     <p style="background:#2d1515;border:1px solid #ef444430;padding:16px;border-radius:8px;color:#fca5a5">
       Our automatic courier booking encountered an issue. Please arrange delivery manually.
     </p>
     <p>Steps:</p>
     <ol>
       <li>Log in to your dashboard</li>
       <li>Go to Orders and find this item</li>
       <li>Book a courier via EasyParcel, J&amp;T, or any courier</li>
       <li>Enter the tracking number in your dashboard</li>
     </ol>
     <p style="color:#94a3b8;font-size:13px">Contact support via WhatsApp if you need help: +60189899495</p>`,
    'Go to Dashboard', `${BASE}/dashboard`
  ))

  // Alert admin
  await safeSend(adminEmail, `[KASSIM] EasyParcel booking failed — ${listingTitle}`, `
    <div style="font-family:monospace;padding:16px">
      <h3>EasyParcel Auto-Booking Failed</h3>
      <p><b>Listing:</b> ${listingTitle}</p>
      <p><b>Listing ID:</b> ${listingId}</p>
      <p><b>Seller:</b> ${sellerName} (${sellerEmail})</p>
      <p><b>Error:</b> ${errorMsg}</p>
      <p><a href="${listingUrl}">View listing</a></p>
      <p>Manual action required: book courier for seller or contact seller to book manually.</p>
    </div>
  `)
}
