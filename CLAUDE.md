@AGENTS.md

# KASSIM — Project Context

## What is KASSIM?
Malaysian circular economy auction platform. Two modes:
- **Flash Auction** — 30-min auction, cash only
- **Item Swap** — 72-hour bidding, swap items / cash / hybrid

> **Naming note:** Folder is `rehome/`, GitHub repo is `shaze22/rehome`, Vercel slug is `rehome` — all intentional, do NOT rename. Only the brand name in UI/code is KASSIM.

## Tech Stack
- **Next.js 16.2.6** (App Router, Turbopack) — breaking changes from v15
- TypeScript + Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Realtime) via `@supabase/ssr`
- Prisma 7 — config: `prisma.config.ts`, generated client: `src/generated/`
- Stripe (payments + escrow Flash)
- Google Gemini `gemini-2.5-flash` via `src/lib/gemini.ts`
- Resend (email notifications) — FROM: `KASSIM <noreply@kassim.app>`
- next-intl 4.13.0 (i18n foundation)
- Vercel (deployment)

## Next.js 16 Rules
- `params` is `Promise<{...}>` — **must `await params`**
- No `middleware.ts` — use `proxy.ts`
- Read `node_modules/next/dist/docs/` before writing new code

## Flash Bidding Rules (CRITICAL)
1. **Starting bid is ALWAYS RM0** — mandatory, seller cannot change this. SellForm shows info box, not input.
2. **Bid must be whole integer (RM)** — no decimals, no cents
3. **Minimum increment: +RM1** from current bid
4. **Timer starts ONLY on first bid** — `endsAt = null` until first bid
5. **Timer is FIXED 30 minutes** — counter bids do NOT extend timer. No +5min/+2.5min extensions.
6. **No timer before first bid** — listing stays active indefinitely
7. **User cannot bid on own listing**
8. **Fee: buyer pays bid amount only. Seller pays 15% from proceeds.** (RM0 bid = RM0 fee)

## Timer Logic (Flash)
```
First bid   → endsAt = now + 30 min (FIXED), firstBidAt = now
Counter bid → endsAt unchanged — no extension
```

## Swap Bid Rules
1. **Timer 72h from listing creation** — `endsAt = now + 72h` (not null)
2. **Offer types: CASH | SWAP | HYBRID** — owner can restrict offer types
3. **Max 1 active offer per user per listing** — status PENDING or COUNTERED
4. **Counter-offer max 3 rounds** — after 3 rounds, owner must Accept or Reject
5. **On Accept** — all other offers auto-REJECTED + listing becomes SOLD + SwapTransaction created
6. **swapAcceptCash: false** — rejects CASH-only offers (HYBRID still ok)
7. **swapOpenOffers: true** — accepts all offer types regardless of category

## Swap Escrow Flow
```
Offer ACCEPTED
  → listing.status = SOLD
  → SwapTransaction created (escrowStatus: PENDING)
  → CASH: buyerItemShipped = null (not required)
  → SWAP/HYBRID: buyerItemShipped = false

Seller ships → sellerItemShipped = true + sellerPhotos + sellerTracking
Buyer ships  → buyerItemShipped = true + buyerPhotos (SWAP/HYBRID only)
  → when all shipped → escrowStatus = BOTH_SHIPPED

Buyer confirms receipt  → buyerItemReceived = true
Seller confirms receipt → sellerItemReceived = true (SWAP/HYBRID only)
  → when all received → escrowStatus = COMPLETED
  → SwapScore recalculated, successfulSwaps++, swapVerified check

Dispute → escrowStatus = DISPUTED → email admin → admin resolve/reopen
```

## SwapScore Formula
```typescript
swapScore = Math.min(4.0 + successfulSwaps * 0.1, 5.0)
// 1 swap → 4.1 | 5 swaps → 4.5 (Verified) | 10 swaps → 5.0
swapVerified = successfulSwaps >= 5
```

## Swap Bid Schema (Listing)
```prisma
mode               ListingMode  // FLASH | SWAP
swapWantedItem     String?
swapWantedCategory String?
swapOpenOffers     Boolean
swapAcceptCash     Boolean
swapMinCashTopup   Float?
swapValueEstimate  Float?       // AI-generated fair value
endsAt             DateTime?    // Flash: null until first bid | Swap: now+72h
status             // ACTIVE → SOLD (when offer accepted)
```

## Swap Bid Schema (Offer)
```prisma
offerType         OfferType   // CASH | SWAP | HYBRID
offeredCashAmount Float?
offeredItemPhotos String[]
offeredItemDesc   String?
offeredItemValue  Float?
totalOfferValue   Float?
status            OfferStatus // PENDING | COUNTERED | ACCEPTED | REJECTED | EXPIRED
counterRounds     Int         // max 3
parentOfferId     String?
```

## Swap Escrow Schema (SwapTransaction)
```prisma
listingId          String @unique
acceptedOfferId    String @unique
sellerId / buyerId String
offerType          OfferType
escrowStatus       EscrowStatus // PENDING | BOTH_SHIPPED | COMPLETED | DISPUTED
sellerItemShipped  Boolean
buyerItemShipped   Boolean?     // null = CASH (not required)
sellerItemReceived Boolean
buyerItemReceived  Boolean
sellerPhotos / buyerPhotos  String[]
sellerTracking / buyerTracking String?
sellerCourier / buyerCourier   String?
disputeReason      String?
resolvedAt         DateTime?
```

## Enums
```prisma
enum ListingMode  { FLASH  SWAP }
enum OfferType    { CASH   SWAP   HYBRID }
enum OfferStatus  { PENDING  COUNTERED  ACCEPTED  REJECTED  EXPIRED }
enum EscrowStatus { PENDING  BOTH_SHIPPED  COMPLETED  DISPUTED }
```

## API Routes

### Flash Bid
- `POST /api/bid` — place bid, extends timer
- `GET  /api/listings/[id]/delivery-quote` — calculate courier cost
- `POST /api/listings/[id]/expire` — expire auction
- `POST /api/payment/checkout` — Stripe checkout
- `POST /api/payment/webhook` — Stripe webhook
- `GET  /api/cron/expire-auctions` — cron job (CRON_SECRET=rehome-cron-2026)

### Swap Bid — Offers
- `POST /api/offers` — submit offer + email seller
- `GET  /api/offers?listingId=xxx` — seller: all; buyer: +`&myOffer=true`
- `PUT  /api/offers/[id]` — `{ action: 'accept'|'reject'|'counter', ...fields }` + email

### Swap Bid — Escrow
- `GET  /api/swap-transactions?listingId=xxx` — fetch tx (seller/buyer only)
- `POST /api/swap-transactions/[id]/ship` — `{ photos[], trackingNumber?, courier? }` + email
- `POST /api/swap-transactions/[id]/receive` — `{ conditionOk }` → COMPLETED + SwapScore + email
- `POST /api/swap-transactions/[id]/dispute` — `{ reason }` → DISPUTED + email admin

### Listings
- `POST  /api/listings` — create listing (Flash or Swap)
- `GET   /api/listings?mode=flash|swap` — fetch with filters
- `PATCH /api/listings/[id]` — edit listing (seller only, ACTIVE, 0 bids/offers for mode switch)
- `DELETE /api/listings/[id]` — hide listing (seller only, ALL statuses allowed). ACTIVE: cancels pending offers + sets status=CANCELLED + hiddenBySeller=true. ENDED/CANCELLED/SOLD: sets hiddenBySeller=true only. Dashboard filters `hiddenBySeller: false`.

### Gemini AI
- `POST /api/gemini/price` — AI pricing suggestion
- `POST /api/gemini/analyze` — analyze photos → title, description, conditionScore (generates **English** content)
- `POST /api/gemini/swap-suggest` — AI suggest swap items → suggestedItems[], suggestedCategories[], reasoning (generates **English** content)

### Admin
- `POST /api/admin/verify-ic` — verify user IC
- `POST /api/admin/resolve-dispute` — `{ transactionId, resolution: 'complete'|'cancel' }`

## Notifications (Resend — `src/lib/resend.ts`)
All emails are in **English**. FROM: `KASSIM <noreply@kassim.app>`

| Trigger | Function | Recipient |
|---------|----------|-----------|
| Offer received | `sendSwapOfferReceivedEmail` | Seller |
| Offer countered | `sendSwapOfferCounteredEmail` | Other party |
| Offer accepted | `sendSwapOfferAcceptedEmail` | Buyer |
| Item shipped | `sendSwapItemShippedEmail` | Recipient |
| Swap completed | `sendSwapCompletedEmail` | Seller + Buyer |
| Dispute filed | `sendSwapDisputeEmail` | Admin |
| Outbid | `sendOutbidEmail` | Previous bidder |
| Watchlist alert | `sendWatchlistAlertEmail` | Watchers |
| Auction expired | `sendAuctionExpiredSellerEmail` | Seller |
| Welcome | `sendWelcomeEmail` | New user |
| Referral reward | `sendReferralRewardEmail` | Referrer |
| Flash item shipped | `sendBuyerShippedEmail` | Buyer (Flash) |
| Auction re-listed (unpaid) | `sendAuctionRelistedEmail` | Seller |
| Payment window expired | `sendPaymentWindowExpiredEmail` | Former winner (when listing auto-relistts) |

## Push Notifications (English)
| Event | Route | Message |
|-------|-------|---------|
| Outbid | `/api/bid` | ⚡ You've been outbid! |
| Offer received | `/api/offers` POST | 🔄 New offer received! |
| Offer accepted | `/api/offers/[id]` accept | 🎉 Your offer was accepted! |
| Counter offer | `/api/offers/[id]` counter | 💬 New counter offer! |
| Item shipped | `/api/swap-transactions/[id]/ship` | 📦 Item on its way! |
| Swap completed | `/api/swap-transactions/[id]/receive` | ✅ Swap completed! (both parties) |
| Dispute filed | `/api/swap-transactions/[id]/dispute` | ⚠️ Dispute filed |

## Gemini AI (`src/lib/gemini.ts`)
```typescript
getAIPriceSuggestion({ category, condition, originalPrice, state })
→ { low, fair, high, suggested_min, suggested_max, reasoning }

analyzeItemPhotos(photoUrls, category)
→ { conditionScore, title, description, isPhotoValid, invalidReason }
// Prompts are in English — generates English titles/descriptions

getSwapSuggestions({ title, category, condition, estimatedValue })
→ { suggestedItems[], suggestedCategories[], valueSuggestion, reasoning, confidence }
// confidence: 'high' | 'medium' | 'low'  (was 'tinggi'|'sederhana'|'rendah')
```

## Delivery Revenue Model
- kassim.app takes **30% markup ON TOP** of courier base price (not a cut from it)
- Example: courier charges RM10 → buyer pays RM13 → kassim.app pays courier RM10, keeps RM3
- `basePrice` = what courier charges · `markup` = 30% of base · `chargedPrice` = base + markup
- Fallback hardcoded rates (when EasyParcel + Lalamove both unavailable):

| Zone          | Base  | Markup | Buyer pays |
|---------------|-------|--------|------------|
| Same state    | RM8   | RM2.40 | RM10.40    |
| Peninsular    | RM12  | RM3.60 | RM15.60    |
| East Malaysia | RM20  | RM6.00 | RM26.00    |

## Project Structure
```
src/
  app/
    api/
      bid/                        — Flash bidding engine + timer
      offers/                     — Swap offer CRUD + counter + email
      swap-transactions/          — Escrow: GET, ship, receive, dispute
      gemini/price|analyze|swap-suggest — AI endpoints
      listings/                   — Listing CRUD + delivery quote
      payment/                    — Stripe checkout + webhook
      transactions/               — Flash: confirm receipt + ship
      admin/verify-ic|resolve-dispute|feature-listing|audit-log
      cron/                       — Expire auctions
    listings/[id]/                — Listing detail (Flash + Swap + Escrow)
    sell/                         — Create listing (mode toggle + AI swap suggest)
    sell/edit/[id]/               — Edit listing (pre-filled form, mode switch, photo management)
    dashboard/                    — Seller/buyer dashboard
    profile/[id]/                 — Profile + swap history + SwapScore + badges
    admin/                        — IC verify + disputed swaps
    jual/                         — Seller acquisition landing page
    r/[code]/                     — Referral landing page
    offline/                      — PWA offline fallback
  i18n/
    routing.ts   — locales config: ['en','ms','id','zh','ar'], defaultLocale='en'
    request.ts   — reads locale from cookie 'kassim_locale', falls back to 'en'
  lib/
    gemini.ts   — getAIPriceSuggestion(), analyzeItemPhotos(), getSwapSuggestions()
    resend.ts   — Flash + Swap email notifications (all English)
    delivery.ts — Courier rate calculator
    co2.ts      — Carbon savings calculator
    badges.ts   — Impact badge logic
    prisma.ts   — Prisma client
    stripe.ts   — Stripe helpers
    push.ts     — sendPushToUser() web push
    supabase/   — Server + client Supabase
  components/
    layout/
      Navbar.tsx          — includes LanguageSwitcher + ThemeToggle
      Footer.tsx          — includes Terms + Privacy links
      LanguageSwitcher.tsx — 5-language dropdown, sets 'kassim_locale' cookie
      ThemeToggle.tsx     — Sun/Moon toggle, persists in localStorage 'kassim_theme'
    sell/SellForm.tsx              — Mode toggle, swap fields, AI swap suggest. Photos compressed via Canvas (max 1200px JPEG 0.82)
    sell/EditListingForm.tsx       — Pre-filled edit form: all fields + mode switch + photo add/remove
    listings/ListingCard.tsx       — Flash card
    listings/SwapListingCard.tsx   — Swap card (green, value, wants, offer count)
    listings/ListingDetailClient.tsx — Detail (Flash + Swap + Escrow)
    listings/OfferModal.tsx        — 3-tab offer form
    listings/OwnerOffersPanel.tsx  — Accept/reject/counter + Match% score
    listings/SwapEscrowPanel.tsx   — Escrow progress + ship/receive/dispute
messages/
  en.json   — English master (full — nav, home, listing, errors, sell, dashboard, etc.)
  ms.json   — Bahasa Melayu (full translation)
  id.json   — Indonesian (empty — ready for translation)
  zh.json   — Chinese (empty — ready for translation)
  ar.json   — Arabic (empty — ready for translation)
proxy.ts              — Auth middleware (NOT middleware.ts!)
next.config.ts        — withNextIntl() wrapper + image patterns
```

## Migrations
- `20260601032951_add_swap_bid_feature` — Offer model, swap fields, ListingMode/OfferType/OfferStatus
- `20260601041150_add_swap_transaction_escrow` — SwapTransaction, EscrowStatus
- `20260601044752_add_pickup_method` — Transaction.pickupMethod + sellerPickupConfirmed
- `20260601052748_add_listing_weight` — Listing.weightKg (default 1kg, for EasyParcel quote)
- `20260601120000_fix_review_unique_constraint`
- `20260601120001_add_performance_indexes`
- `20260601120002_add_listing_view_count`
- `20260601130000_add_featured_listing`
- `20260601140000_add_referral_system`
- `20260601150000_add_push_subscriptions`
- `add_featured_scheduling` (2026-06-03, Supabase MCP) — Listing.featuredAt + Listing.featuredUntil
- `create_audit_log` (2026-06-03, Supabase MCP) — AuditLog table (id, adminId, action, targetId, targetType, details, createdAt)
- `add_user_postcode_saved_address` (2026-06-06, Supabase MCP) — User.postcode TEXT, User.savedAddress TEXT

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL, DIRECT_URL
STRIPE_SECRET_KEY            ← ✅ LIVE mode (sk_live_...) set in Vercel
STRIPE_WEBHOOK_SECRET        ← ✅ LIVE webhook we_1TfCHICGekCA1beqFy1dpImz (checkout.session.completed → kassim.app/api/payment/webhook)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY ← ✅ LIVE mode (pk_live_...) set in Vercel
# Stripe payment methods: ['card', 'fpx'] — FPX enabled 2026-06-06
RESEND_API_KEY               ← ✅ rotated (Fasa 13), DKIM verified 2026-06-06
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL=https://kassim.app   ← set in Vercel Production
CRON_SECRET=rehome-cron-2026
ADMIN_EMAIL=syedshazni@todak.com
EASYPARCEL_CLIENT_ID=        ← ✅ set in Vercel (OAuth2, pending EP activation)
EASYPARCEL_CLIENT_SECRET=    ← ✅ set in Vercel (OAuth2, pending EP activation)
LALAMOVE_API_KEY=            ← from developers.lalamove.com
LALAMOVE_API_SECRET=
LALAMOVE_SANDBOX=false       ← already set in Vercel
UPSTASH_REDIS_REST_URL=      ← ✅ set in Vercel (Singapore)
UPSTASH_REDIS_REST_TOKEN=    ← ✅ set in Vercel
NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL  ← ✅ set in Vercel
```

## Deployment
```bash
vercel --prod --scope syedshazni-7682s-projects
```
Live: https://rehome-eta.vercel.app → target domain: https://kassim.app

## i18n Setup (next-intl 4.13.0)

### Architecture
- **Cookie-based locale selection** — no URL prefix restructuring required
- Locale stored in cookie `kassim_locale` (1 year expiry)
- Default: `en` — falls back to English if cookie missing or invalid
- `layout.tsx` wraps everything in `<NextIntlClientProvider>`
- RTL support: `dir={locale === 'ar' ? 'rtl' : 'ltr'}` on `<html>`

### Adding translations to a component
```tsx
// Server component
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('nav')

// Client component
import { useTranslations } from 'next-intl'
const t = useTranslations('nav')

// Usage
t('browse')  // → "Browse" (en) or "Semak Imbas" (ms)
```

### Translation key structure (messages/en.json)
Top-level namespaces: `nav`, `home`, `listing`, `errors`, `sell`, `dashboard`, `referral`, `offline`, `notFound`, `auth`, `pwa`, `impact`, `footer`, `categories`

### Adding a new locale
1. Create `messages/{locale}.json` with translations
2. Add locale to `src/i18n/routing.ts` locales array
3. Add label to `LOCALE_LABELS` in `LanguageSwitcher.tsx`

### Language Switcher
`src/components/layout/LanguageSwitcher.tsx` — dropdown in Navbar
- 🇬🇧 English · 🇲🇾 Melayu · 🇮🇩 Indonesia · 🇨🇳 中文 · 🇸🇦 العربية
- Sets `kassim_locale` cookie → `window.location.reload()`

## Key Cookie & Storage Names
| Key | Location | Purpose |
|-----|----------|---------|
| `kassim_ref` | httpOnly cookie | Referral code (1 day) |
| `kassim_locale` | cookie | Language preference (1 year) |
| `kassim_recently_viewed` | localStorage | Recent items (max 6) |
| `kassim_install_dismissed` | localStorage | PWA install banner dismissed |
| `kassim_push_asked` | localStorage | Push notification asked |
| `kassim_theme` | localStorage | UI theme: 'dark' (default) or 'light' |
| `kassim-v1` | Service Worker cache | SW cache name |

## PWA
- `src/app/manifest.ts` — name: KASSIM, theme: #14b8a6, standalone
- Shortcuts: "Flash Auctions" → `/listings?mode=flash`, "Sell Now" → `/sell`
- `public/sw.js` — cache: `kassim-v1`, notification tag: `kassim`
- `PWASetup.tsx` — SW registration + install banner (30s delay)
- `PushPermission.tsx` — push permission prompt (5s delay, logged-in only)

## Flash Bid UX Flow (updated 2026-06-03)

**Pre-bid (listing detail page):**
- Client-side auth fallback: if server SSR misses session, `createClient().auth.getUser()` runs on mount
- No delivery method selection required before bidding — removed, was too much friction
- Auto-fetches delivery estimate from `currentUserState` (profile) silently, shown as "~RM X" note
- Bid button: always available once logged in (no delivery gate)
- After bid: green banner "Bid placed! You are now the highest bidder."
- Login link: `/auth/login?next=/listings/[id]` (returns to listing after login)

**Post-win (auction ended, user won):**
- `DeliveryCheckout` component: **courier only** (self-pickup removed)
- Pre-populates phone from `currentUserPhone` (saved in profile)
- Buyer enters postcode → sees EasyParcel rates → selects courier → enters phone + address → Stripe checkout
- Checkout URL includes all delivery params → Stripe line items → webhook books EasyParcel

## Flash: Delivery Flow (Self-Pickup Removed)
After Stripe payment, buyer redirects to listing page (`?payment=success`).
Webhook auto-sets `pickupMethod = 'DELIVERY'` on Transaction creation.

**APIs:**
- `GET  /api/transactions/[listingId]` — fetch flash tx (buyer/seller only)
- `POST /api/transactions/[listingId]/ship` — seller enters tracking number
- `POST /api/transactions/[listingId]/confirm` — buyer confirms receipt → RELEASED

**DELIVERY flow:**
```
Buyer wins → fills courier + address in DeliveryCheckout → Stripe payment
→ webhook: Transaction created, pickupMethod=DELIVERY, EasyParcel auto-booked
→ redirect to listing?payment=success
→ seller enters tracking → POST /api/transactions/[id]/ship
→ buyer clicks "Confirm Received" → POST /api/transactions/[id]/confirm
→ status=RELEASED → seller email: "payout within 7 working days"
→ Transaction appears in Admin → Pending Seller Payouts
→ Admin manually bank-transfers sellerPayout amount to seller
→ Admin clicks "Mark Paid" (+ optional note) → sellerPaid=true, disappears from list
```

**Payout fields on Transaction:** `sellerPaid Boolean @default(false)`, `sellerPaidAt DateTime?`, `payoutNote String?`
**No Stripe Connect** — manual bank transfer for beta. Upgrade to Stripe Connect for auto-payout post-launch.

> **Note:** `set-pickup` and `pickup-confirm` APIs still exist in codebase but are no longer called from UI.

## EasyParcel Integration (OAuth2 — Fasa 6)
- `src/lib/easyparcel.ts` — OAuth2 `client_credentials` (EASYPARCEL_CLIENT_ID + EASYPARCEL_CLIENT_SECRET)
- In-memory token cache (1 hour TTL, auto-refresh 60s before expiry)
- `getDeliveryQuote(sellerState, buyerState, weightKg, buyerPostcode?)` — returns rates with **30% markup applied**
- `CourierRate`: `{ id, courierName, serviceName, basePrice, chargedPrice, markup, eta? }`
- `createEasyParcelShipment(input)` — books courier after payment confirmed
- EasyParcel + Lalamove run in parallel (Promise.all), combined + sorted cheapest first
- Hardcoded fallback if both APIs unavailable
- **Revenue**: platform keeps 30% delivery markup; pays courier base price
- Webhook auto-books EasyParcel on `checkout.session.completed` + stores `easyparcelOrderId`

## Logo Assets
| File | Size | Use |
|------|------|-----|
| `public/logo.svg` | 320×90 | Navbar (used via `<img>`) |
| `public/logo-square.svg` | 200×200 | **Primary favicon (SVG)** + PWA icon source |
| `public/logo-512.png` | 512×512 | Favicon PNG fallback, apple-touch-icon |
| `public/logo-wide.png` | 640×180 | Email, marketing |

Live URLs: `https://kassim.app/logo-512.png`, `https://kassim.app/logo.svg`
Design: teal (#14b8a6) lightning bolt on dark (#0a0a0f) background
Favicon order in `layout.tsx`: `logo-square.svg` (SVG, shortcut) → `logo-512.png` (PNG fallback)

## Lalamove Integration
- **REMOVED** (2026-06-03) — EasyParcel sudah cukup untuk parcel delivery
- `lalamove.ts` + `/api/lalamove/webhook` dah delete
- Kalau nak same-day delivery, boleh tambah balik kemudian

## SEO
- `layout.tsx` — metadata template `'%s | KASSIM'`, OG default, Twitter card
- `listings/[id]` — `generateMetadata`: title=listing title+price, OG image=listing photo
- `GET /api/og` — Edge ImageResponse 1200×630, branded ⚡ KASSIM
- `/robots.txt` — allow public, disallow dashboard/api/admin/auth
- `/sitemap.xml` — homepage + listings feed + up to 500 active listings
- `sitemap.ts` + `robots.ts` — BASE URL: `process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'`

## Rate Limiting (`src/lib/rate-limit.ts`)
- Upstash Redis sliding window
- Bid: 30/5min · Offer: 10/hr · Listing: 5/hr · Feedback: 5/hr per IP

## Cron Schedule (vercel.json)
| Route | Schedule | Function |
|-------|----------|---------|
| `/api/cron/expire-auctions` | 0 0 * * * (daily midnight) | Expire Flash auctions |
| `/api/cron/auto-release-swaps` | 0 18 * * * (2am MYT) | Auto-release stuck escrow + reminder + expire stale offers |
| `/api/cron/retry-emails` | 0 6 * * * (daily 6am) | Process Upstash Redis email retry queue (max 3 retries) |
| `/api/cron/expire-featured` | 0 12 * * * (daily noon) | Auto-expire isFeatured listings past featuredUntil |

**Note:** Hobby plan = daily crons only. Upgrade to Pro for sub-daily schedules.

## Referral Program
- `User.referralCode String? @unique`, `User.creditBalance Float @default(0)`, model `Referral`
- `/api/user/sync`: auto-generate 8-char referralCode (nanoid) on first register; process `kassim_ref` cookie → RM5 credit both parties + create Referral record
- `/api/referral/set-cookie`: validate code, set httpOnly cookie `kassim_ref` (1 day), redirect to /auth/register
- `/r/[code]`: referral landing page — inviter name, RM5 reward, feature list, CTA "Sign Up & Get RM5 Credit"
- `CreditCheckoutButton`: shows discount preview before checkout

## Security
- ✅ Admin routes have auth check (role === 'ADMIN')
- ✅ Stripe webhook: validate metadata vs DB + idempotency check
- ✅ Photo upload: 10MB size limit + MIME image/* check (SellForm, OfferModal, SwapEscrowPanel)
- ✅ Rate limit: Upstash Redis sliding window
- ✅ Supabase RLS: enabled on ALL 12 tables with policies (migration: `enable_rls_all_tables`, 2026-06-01)
- ✅ Bid race condition: SELECT FOR UPDATE inside Prisma $transaction (Fasa 19)
- ✅ Delivery fee: recalculated server-side in checkout — client params ignored (Fasa 19)

## Supabase RLS Summary
Prisma (DATABASE_URL) bypasses RLS as postgres superuser — all app writes are safe.
RLS protects direct Supabase REST/client API access (anon key vectors).

| Table | RLS | Key Rules |
|-------|-----|-----------|
| `User` | ✅ | authenticated can read any; update own only |
| `Listing` | ✅ | anon+auth can read ACTIVE; seller: read/update/delete own |
| `Bid` | ✅ | public read; authenticated create as own bidder |
| `Offer` | ✅ | seller+bidder read; authenticated create as own |
| `SwapTransaction` | ✅ | seller+buyer read+update only |
| `Transaction` | ✅ | seller+buyer read only |
| `Watchlist` | ✅ | own CRUD only |
| `Message` | ✅ | seller+sender read; authenticated create as sender |
| `Review` | ✅ | public read; authenticated create as own reviewer |
| `Referral` | ✅ | referrer+referred read own |
| `PushSubscription` | ✅ | own CRUD only |
| `_prisma_migrations` | ✅ | no client access (0 policies) |

## All Routes
| Route | Purpose |
|-------|---------|
| `/terms` | Terms of Service (English, Malaysian law, Contract Act 1950) |
| `/privacy` | Privacy Policy (PDPA 2010 compliant) |
| `/how-it-works` | Flash vs Swap guide + 8 FAQ accordion |
| `/jual` | Seller acquisition landing page + fee calculator (English) |
| `/r/[code]` | Referral landing page (English) |
| `/offline` | PWA offline fallback |
| `/api/time` | Edge: server timestamp for client clock sync |
| `/api/referral` | GET referral stats |
| `/api/referral/set-cookie` | Set kassim_ref cookie + redirect |
| `/api/push/subscribe` | POST/DELETE push subscription |
| `/api/pwa-icon` | Edge: generate PWA icon PNG |
| `/api/admin/feature-listing` | Toggle isFeatured + set featuredAt/featuredUntil (admin) |
| `/api/admin/mark-payout` | POST `{ transactionId, note? }` — mark seller as paid (admin only) |
| `/api/cron/retry-emails` | Process email retry queue from Upstash Redis |
| `/api/cron/expire-featured` | Auto-expire isFeatured listings |
| `/api/admin/audit-log` | GET last 50 AuditLog entries (admin only) |
| `/api/listings/[id]/cancel` | POST — seller cancel ACTIVE listing with 0 bids |
| `/sell/edit/[id]` | Edit listing page — pre-filled form, mode switch (Flash↔Swap if 0 bids/offers), photo management |

## Sentry Error Tracking
- `@sentry/nextjs` v10.55.0 installed
- `sentry.client.config.ts` — client init + `replayIntegration` (maskAllText: false)
- `sentry.server.config.ts` — server init
- `sentry.edge.config.ts` — edge runtime init
- `src/instrumentation.ts` — Next.js App Router hook: loads server/edge Sentry on `register()`
- `src/lib/sentry-user.ts` — `setSentryUser(id, email, name)` + `clearSentryUser()`
- **`NEXT_PUBLIC_SENTRY_DSN`** set in Vercel ✅ (2026-06-01)

## Email Queue (`src/lib/email-queue.ts`)
- `queueEmail(to, subject, html)` — push to Upstash Redis list `kassim:email_queue`
- `processEmailQueue()` — pop up to 50 items, send via Resend, retry up to 3x on failure
- All email functions in `resend.ts` use `safeSend()` wrapper — auto-queues on Resend failure
- Cron: `/api/cron/retry-emails` runs daily 6am

## Featured Listing Scheduling
- `Listing.featuredAt DateTime?` — timestamp when featured was toggled ON
- `Listing.featuredUntil DateTime?` — auto-set to next Friday 8pm MYT when featured
- Admin toggle: ON → sets both fields, OFF → clears both fields + isFeatured=false
- AdminPanel `FeaturedListingRow` shows expiry date in amber
- Cron: `/api/cron/expire-featured` auto-expires past `featuredUntil` daily at noon

## Dashboard Seller Analytics ("My Performance")
Shown when user has at least 1 listing:
- Total Views (sum viewCount across all listings)
- Watchlisted (count Watchlist records on user's listings)
- Total Earnings (sum Transaction.sellerPayout, RELEASED)
- Active / Sold count
- Avg Rating (from Review table)

## Audit Log (`src/lib/audit.ts`)
- Table: `AuditLog` (Supabase, not Prisma — query via service role key)
- `logAdminAction(adminId, action, targetId?, targetType?, details?)`
- Called in: `verify-ic` (IC_APPROVED / IC_REJECTED), `resolve-dispute` (DISPUTE_COMPLETE / DISPUTE_CANCEL), `feature-listing` (LISTING_FEATURED / LISTING_UNFEATURED)
- AdminPanel: "Audit Log" section loads via `/api/admin/audit-log` GET (50 latest)

## Dark Mode
- CSS: `[data-theme="light"]` in `globals.css` — light bg/text vars, teal unchanged
- `ThemeToggle.tsx` — Sun/Moon button, `document.documentElement.dataset.theme`
- Default: **system preference** (`prefers-color-scheme`). Falls back to dark if no preference. Persists override in `localStorage.kassim_theme`
- **Desktop Navbar**: ThemeToggle placed next to Heart (watchlist) icon — inside both logged-in and logged-out desktop nav sections
- **Mobile**: ThemeToggle removed from top bar; accessible inside the hamburger menu (top of menu, "Theme" label + toggle)

## HeroBanner (`src/components/home/HeroBanner.tsx`)
Simplified above-fold section (updated 2026-06-07):
- Badge: "Malaysia's #1 Pre-Loved Marketplace"
- H1: italic gradient — "One man's trash is another man's treasure." (orange gradient on "One man's trash", teal gradient on "treasure.")
- **CTAs**: 2 buttons side-by-side — ⚡ Flash Bid (orange gradient) + 🔄 Swap Bid (green gradient). No "Sell Now" button (that's in the Navbar).
- **Search bar**: `<form action="/listings" method="get">`
- 4 trust micro-indicators: 🔒 Escrow, ✅ IC Verified, 📦 Auto Delivery, 0% Free to List (flex-wrap, tight gap on mobile)
- "New here? Learn how..." link → `/how-it-works`
- No split Flash/Swap explanation cards — moved fully to /how-it-works

## Listings Page (`src/app/listings/page.tsx`)
- **Ending Soon section** (Flash only, no active search): `getEndingSoonListings()` — Flash listings with `endsAt < now + 2h`, max 6, sorted ASC. Red FOMO banner at top.
- **Search bar**: prominent `<form method="get">` above filters. Preserves `mode` param.
- Tabs: ⚡ FLASH BID / 🔄 SWAP BID with gradient active state + glow
- Mode explainer strip below tabs: one-liner rule + active count
- `ListingCard`: ⚡ FLASH BID gradient badge (orange→yellow) top-left on every Flash card
- `SwapListingCard`: 🔄 SWAP BID gradient badge (green→teal), offer type chips
- **Listing card placeholders**: when no photo, shows category emoji + gradient bg (`CATEGORY_PLACEHOLDERS` map in both `ListingCard.tsx` and `SwapListingCard.tsx`)

## Performance Architecture
- **Fonts**: `next/font/google` (Inter + JetBrains Mono) in `layout.tsx` — eliminates render-blocking Google Fonts @import
- **Suspense streaming** (Fasa 20): `HomePage` is non-async — `HeroBanner` renders instantly. `HomeContent` (async server component with all 5 DB queries) is wrapped in `<Suspense fallback={<HomePageSkeleton />}>`. Hero HTML arrives in ~100ms; listings stream in after DB resolves.
- **Homepage cache**: all 5 DB query functions wrapped in `unstable_cache`. Flash/swap/trending/mega: `revalidate: 60`. Stats: `revalidate: 120`.
- **Layout auth**: `getSession()` instead of `getUser()` — reads cookie locally, no Supabase network call per page
- **Loading skeleton**: `src/app/loading.tsx` — instant shell shown while page data loads (route-level). `HomePageSkeleton` shown during Suspense resolve.
- **LCP images**: `priority={i === 0}` on first ListingCard and SwapListingCard in homepage grids. Image `sizes` updated to `"50vw"` for 2-col mobile (smaller downloads).
- **DB indexes added** (2026-06-04, Supabase MCP): `isFeatured+status`, `status+updatedAt`, `viewCount`, `createdAt`
- **Prisma connection**: `PrismaPg` adapter with `max: 1` in `src/lib/prisma.ts` — serverless-optimised pooling. Config via `prisma.config.ts` (Prisma 7 — no url/directUrl in schema.prisma)

## Last Deployed
2026-06-07 (session 2), dashboard + hero + UX fixes. Live: https://kassim.app (also: www.kassim.app, rehome-eta.vercel.app)

### 2026-06-07 Session 2 Changes
- **hiddenBySeller** — `Listing.hiddenBySeller Boolean @default(false)` added (Supabase MCP + schema + prisma generate). Dashboard query filters `hiddenBySeller: false`. DELETE API sets this for all statuses.
- **Delete any listing** — DELETE /api/listings/[id] now works on ALL statuses (no bid/offer restriction). ACTIVE: pending offers auto-REJECTED + status=CANCELLED + hiddenBySeller=true. ENDED/CANCELLED/SOLD: hiddenBySeller=true only. Card disappears immediately (deleted state → null).
- **Flash/Swap badge on SellerListingCard** — ⚡ (orange) or 🔄 (green) emoji before listing title in dashboard.
- **HeroBanner** — h1 replaced with italic proverb "One man's trash is another man's treasure." (orange + teal gradient). CTAs reduced to 2: Flash Bid + Swap Bid (no Sell Now). Proverb divider on homepage removed (redundant).
- **ThemeToggle moved** — Desktop: next to Heart icon in navbar (both logged-in and logged-out). Mobile: removed from top bar, accessible inside hamburger menu (top row).
- **Floating buttons above BottomNav** — WhatsApp + Beta Feedback buttons now use `bottom-20 md:bottom-6` so they don't overlap mobile BottomNav.

### 2026-06-07 Session 1 Changes
- **Supabase storage policies** — added INSERT/SELECT/DELETE/UPDATE policies for `rehome-photos` bucket (was RLS-enabled but no policies → all uploads blocked)
- **Photo upload compression** — Canvas API in SellForm + EditListingForm: max 1200px, JPEG 0.82 quality. Always uploads as `image/jpeg`. Fixes large phone photos as og:image.
- **ListingChat fully English** — "Ask Seller", "No messages yet. Ask the seller now!", "User", "(Seller)", "Type a message...", "Sign in to send a message"
- **Original price decimals** — step={0.01} on originalPrice + swapMinCashTopup inputs (was step={1})
- **navigator.share() fix** — URL no longer duplicated: text field has no URL, url field handles it
- **Edit Listing** — PATCH /api/listings/[id] + /sell/edit/[id] page + EditListingForm component
  - Edit: title, description, category, state, weight, price, condition flags, photos (add/remove), swap fields
  - Mode switch Flash↔Swap: allowed only if 0 bids (Flash) or 0 active offers (Swap)
  - Flash→Swap: sets endsAt=now+72h. Swap→Flash: clears endsAt, resets startingBid/currentBid to 0
- **SellerListingCard** — teal Edit button (pencil) on all Active listings. All labels English ("Active", "Ended", "bids", "Waiting for bid", "Yes, Delete")

> **Note:** GitHub→Vercel auto-deploy kadang tidak trigger. Guna `vercel deploy --prod --scope syedshazni-7682s-projects --yes` untuk force deploy bila perlu.

## Completed Fasa
| Fasa | What |
|------|------|
| 1 | USP copywriting, trust badges, WhatsApp seller deep link, urgency copy |
| 2 | Live stats bar, CO2 impact card, HowItWorks redesign (Flash vs Swap), /how-it-works FAQ |
| 3 | Server time sync (/api/time), timer urgency levels (orange→red→pulse), ENDING SOON card, realtime fallback |
| 4 | Email retry queue (Upstash), featured scheduling (Friday 8pm MYT), seller analytics dashboard |
| 5 | /terms + /privacy (PDPA), Dark Mode toggle, AuditLog table + AdminPanel tab, Sentry replayIntegration |
| Hero | New split-panel HeroBanner: Flash Bid + Swap Bid USP, rules, examples, mode CTAs |
| Listings | ⚡ FLASH BID / 🔄 SWAP BID tabs, mode explainer strip, card badges, offer type chips |
| Homepage | Removed HowItWorks section — hero already covers it. /how-it-works page still exists. |
| Branding | Section headers: Friday FLASH BID Night, ⚡ FLASH BID, 🔄 SWAP BID — fully consistent |
| 6 | EasyParcel OAuth2 client, 30% delivery markup enforced, checkout has delivery line item, webhook auto-books shipment, Transaction schema +10 delivery fields |
| 6b | DeliveryCheckout UI: winner enters postcode → live EasyParcel quotes → pick courier → phone+address → checkout with delivery line item |
| 6c | Seller phone: User.phone field + PUT /api/user/profile + ProfileEditForm in dashboard (warns if missing) + EasyParcel booking uses real phone |
| 6d | Logo: public/logo.svg (wordmark) + logo-512.png (EasyParcel/favicon/PWA) + logo-wide.png — Navbar uses logo.svg, layout.tsx icons metadata updated |
| 6e | Bid UX fix: remove Step 1 delivery selector, auto-estimate from profile state, client-side auth fallback, correct success message, login ?next= redirect, pre-fill phone in DeliveryCheckout |
| 6f | Onboarding: phone+state in register form → synced via auth/callback user_metadata. Seller ship email (sendShipNowEmail) with courier+postcode+EasyParcel ID. OrderCard shows delivery info. id/zh/ar translations complete. |
| **7** | **13 UI/UX improvements:** consumer copy, CTA above fold, search bar in hero, register 3 fields, footer logo, ThemeToggle system pref, feedback icon-only, Ending Soon section, card placeholders, Why Sell section, testimonials BM+stars, WhatsApp support button. |
| **8** | **Branding cleanup:** em dashes replaced, Ballout→KASSIM Score, login logo fix, Flash RM0 reset, Supabase Auth URL → kassim.app. |
| **9** | **19 UX overhaul (2026-06-04):** Simplified hero (no rule cards), homepage reorder (Flash→Swap→Trust), Navbar profile dropdown + bell, BottomNav mobile (Home/Browse/Sell/Saved/Account), max 2 card image overlays + condition label in body, WhatsApp uses seller.phone, breadcrumb history.back(), DeliveryCheckout 4-step indicator, mobile filter slide-up drawer, KASSIM Score tooltip, new user onboarding card (3 steps), password strength bars, LanguageSwitcher removed from navbar. |
| **10** | **/how-it-works visual infographic (2026-06-04):** Quick Compare cards, Flash Bid + Swap Bid 8-step process diagrams (grid-cols-4 desktop, vertical mobile), timer mechanics bar diagram, real scenarios with payout breakdown, 3 offer type cards, KASSIM Shield escrow explainer. All "Flash Auction"→"Flash Bid", "Item Swap"→"Swap Bid". |
| **11** | **Rule corrections (2026-06-04):** Flash starting bid locked to RM0 (mandatory). Timer fixed 30min, no extensions. Buyer pays bid only, seller pays 15%. Self-pickup removed — all delivery via KASSIM platform (webhook auto-sets DELIVERY). how-it-works examples and rules corrected. |
| **12** | **Copy + perf fixes (2026-06-04):** "Browse Flash Bid" / "Browse Swap Bid" button labels. How-it-works Flash "Best for" text fixed (no overpromise). next/font replaces Google Fonts @import. Homepage 5 query groups cached 60s (unstable_cache). getSession() in layout (no network). loading.tsx skeleton. priority prop on first card images. 4 new DB indexes. |
| **13** | **UX + viral fixes (2026-06-04):** "Pay Now" orange banner in dashboard for unpaid Flash Bid wins. "Ship Now" teal alert for seller ESCROWED orders. Copy Link button on listing detail (clipboard + "Copied!" feedback). Post-bid WhatsApp share prompt ("Tell friends before someone outbids you!"). Referral section moved above My Listings. Test users created (testseller@kassim.app, testbuyer@kassim.app). |
| **14** | **Reliability fixes (2026-06-04):** EasyParcel webhook failure handling — on booking error, seller gets "book manually" email + admin gets alert email with listing ID + error. sendEasyParcelFailureEmail() added to resend.ts. kassim.app DKIM added to Resend (domain ID: d887ba9e). RESEND_API_KEY rotated in Vercel. |
| **15** | **Bug fixes (2026-06-05):** React hydration error #418 fixed — `isEnded` now initialises from `endsAt` comparison (no more bid form flicker on ended auctions), `suppressHydrationWarning` on `toLocaleString('ms-MY')` and `toLocaleDateString('en-MY')` elements. "Winning Bid" label shows correctly on ended auctions (was "Starting Bid"). Flash trust badge: "Timer starts on first bid" when `endsAt=null`, "30 Min Only" once timer running. DeliveryCheckout postcode hint hides after step 1. |
| **19** | **17 comprehensive fixes (2026-06-06):** (1) Bid race condition — SELECT FOR UPDATE in $transaction. (2) Delivery fee — server-side recalc, client params ignored. (3) Seller postcode — STATE_POSTCODE[] map, not hardcoded. (4) Auto-relist — unpaid wins reset to ACTIVE after 24h + seller email. (5) Flash 14-day expiry — ACTIVE+no-bid listings expire after 14 days. (6) Admin naming bug — allUsers/disputedSwaps properly wired. (7) N+1 fix — enrichedPayouts via single raw SQL JOIN. (8) Dashboard limits — take:100 listings, take:50 orders. (9) View count — fire-and-forget outside Promise.all. (10) Remove fake testimonials. (11) Seller profile link — ListingCard + SwapListingCard. (12) Cancel listing — POST /api/listings/[id]/cancel + SellerListingCard button. (13) Dashboard — show all listings (no slice). (14) User.postcode + User.savedAddress fields + ProfileEditForm UI. (15) Buyer ship email — sendBuyerShippedEmail on seller mark shipped. (16) sendAuctionRelistedEmail new function. (17) Profile API updated for postcode + savedAddress. |
| **Impact** | **/impact page fully translated to English (2026-06-06):** Title, all stat labels, CO2 methodology section, category names (Perabot→Furniture etc.), badges section. Badge display: English name primary, Malay (nameMs) as subtitle. |
| **20** | **Perf streaming + Mobile overhaul (2026-06-06):** (1) Suspense streaming — HeroBanner renders instantly, HomeContent async component wrapped in Suspense. (2) Mobile grid — all listing grids changed to grid-cols-2 (homepage, listings page, watchlist, loadings). (3) Card compactness — smaller padding/text on mobile, verbose text hidden (sm:block), footer condensed, image sizes="50vw". (4) Hero CTA — Flash Bid + Sell Now side-by-side on mobile, Swap below. (5) Section spacing — py-6 sm:py-10. (6) Section headers — removed duplicate Lucide icons, text-xl sm:text-2xl. (7) Stats — text-lg sm:text-2xl. (8) Why KASSIM — 2-col on mobile, desc hidden on mobile. (9) SwapListingCard — Wants/chips hidden mobile, timer always visible. |
| **FPX** | **FPX payment method enabled (2026-06-06):** checkout/route.ts: payment_method_types=['card','fpx'] + customer_email for pre-fill. webhook/route.ts: payment_status guard (skip if not 'paid' — handles FPX async confirmation edge case). |
| **Beta UX** | **Pre-launch UX fixes (2026-06-06):** (1) cancel_url → ?payment=cancelled; amber banner shown to winner who abandons Stripe checkout ("Payment not completed. You have 24 hours."). (2) DeliveryCheckout pre-fills postcode+address from User.postcode+User.savedAddress (listing/[id]/page.tsx fetches + passes to ListingDetailClient). (3) sendPaymentWindowExpiredEmail — new email to former winner when listing auto-relistts after 24h; cron now emails both seller (relisted) and former winner (window expired). |

## Supabase Auth URL Config (updated 2026-06-03)
- **Site URL:** `https://kassim.app`
- **Redirect URLs:** `https://kassim.app/**`, `https://www.kassim.app/**`, `http://localhost:3000/**`
- Keep localhost entry — needed for local dev (`npm run dev`)

## Naming Conventions (Important)
- Brand name: **KASSIM** (all caps in logo/badge, "Kassim" in prose)
- Score displayed to users: **KASSIM Score** (was "Ballout Score" — fixed)
- DB field: `rehomeScore` (internal only — do NOT rename, will break DB)
- Supabase storage bucket: `rehome-photos` (internal only — do NOT rename)
- Em dashes (—) are banned in all user-visible text. Use `.`, `,`, `:`, `-`, or `|` instead.

## UX Architecture Notes (Fasa 9)

### Navigation
- **Navbar desktop**: Logo | Browse | How It Works | (logged-in: ❤ ThemeToggle Bell + Sell + Avatar dropdown) | (logged-out: ThemeToggle + Sign In + Register)
- **Navbar mobile**: Logo | Hamburger (ThemeToggle at top of dropdown + Browse + HowItWorks + user links)
- **Avatar dropdown**: Dashboard · Saved Items · Sign Out
- **BottomNav** (`src/components/layout/BottomNav.tsx`): mobile-only sticky nav, md:hidden. Home/Browse/Sell(float CTA)/Saved/Account
- **Floating buttons**: WhatsApp support (bottom-left) + Beta Feedback (bottom-right). On mobile: `bottom-20` to clear BottomNav. On desktop: `bottom-6`.
- **LanguageSwitcher**: removed from Navbar (translations incomplete). Still in `src/components/layout/LanguageSwitcher.tsx` for future use.

### Listing Cards (updated Fasa 20)
- **Mobile grid**: `grid-cols-2` on mobile (was `grid-cols-1`). All grids: `grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, gap `gap-3 sm:gap-6`.
- Max 2 image overlays: ENDING SOON banner (top, red) + mode badge (bottom-left: FLASH BID / SWAP BID). Badge text abbreviated on mobile: "FLASH" / "SWAP".
- Bid count shown bottom-right only when ≥2 bids (abbreviated: `🔥 {count}`)
- Condition: label text in card body with color-coded pill. Category text `hidden sm:inline`.
- Card padding: `p-2 sm:p-3`. Title: `text-xs sm:text-sm`. Bid price: `text-sm sm:text-lg`.
- Verbose text hidden on mobile (bid sublabel, seller name, view count, full "FREE if only bidder" string).
- Footer: mobile shows state + IC check only. Desktop shows full footer with seller link.
- SwapListingCard: "Wants:" section and offer chips hidden on mobile. Timer always visible.

### Mobile Filter Drawer (`src/components/listings/MobileFilterDrawer.tsx`)
- "Filters (N)" button visible on mobile, hidden on desktop (lg:hidden)
- Desktop: sticky sidebar `top-20`, hidden on mobile (hidden lg:block)
- Drawer: slide-up from bottom, backdrop click to close, auto-close on filter change (300ms delay)

### DeliveryCheckout Steps
3-step progress indicator (courier only, no pickup option): Postcode → Courier → Your Details → Pay
`step` computed from postcode/selected/phone+address state. No pickup toggle.

### WhatsApp Seller
- Uses `seller.phone` — formatted as `wa.me/60${phone.replace(/^0/, '')}`
- Shown only when seller.phone exists
- Falls back to "Contact via chat below" message

## Test Accounts
| Role | Email | Password |
|------|-------|----------|
| Test Seller | testseller@kassim.app | KassimTest2026! |
| Test Buyer | testbuyer@kassim.app | KassimTest2026! |
| Admin | syedshazni@gmail.com | (own password) |
| Admin | syedshazni@todak.com | (own password) |

Admin panel: https://kassim.app/admin

## Pending (Manual Actions — Not Code)
- ✅ kassim.app + www.kassim.app connected to Vercel (DNS A records set)
- ✅ Supabase RLS: all 12 tables enabled with policies (2026-06-01)
- ✅ Supabase Auth Site URL → https://kassim.app (2026-06-03)
- ✅ Friday Mega Auction: 5 listings featured
- ✅ Sentry: fully live — `instrumentation.ts` + `NEXT_PUBLIC_SENTRY_DSN` set in Vercel
- ✅ Fasa 1-13 complete
- ✅ EASYPARCEL_CLIENT_ID + EASYPARCEL_CLIENT_SECRET set in Vercel (OAuth2)
- ✅ All 15 active Flash listings reset to RM0
- ✅ Test users created (testseller + testbuyer @kassim.app)
- ✅ kassim.app DKIM added to Resend (domain ID: d887ba9e-900c-439e-be03-4f8dfd674cbd, region: ap-northeast-1) — DNS records added, pending verification
- ✅ RESEND_API_KEY rotated in Vercel (2026-06-04)
- ✅ EasyParcel webhook failure — seller + admin email notification on booking error
- ✅ Fasa 19: 17 comprehensive fixes deployed (b0fa098, 2026-06-06)
- ✅ /impact page fully translated to English (f19d0f5, 2026-06-06)
- ✅ Fasa 20: Suspense streaming + 2-col mobile + card compactness (3e738be, 2026-06-06)
- ✅ FPX enabled: payment_method_types=['card','fpx'], customer_email, webhook payment_status guard (9c4c040, 2026-06-06)
- ✅ Beta UX fixes: payment cancel banner, DeliveryCheckout pre-fill, sendPaymentWindowExpiredEmail (deaf9dd, 2026-06-06)
- ✅ Onboarding redirect: new users after auth go to /sell?welcome=1 (293fafa, 2026-06-06)
- ✅ FPX minimum guard: checkout rejects total < RM 1 with ?payment=amount_too_low (293fafa, 2026-06-06)
- ✅ WhatsApp share button on SellerListingCard (active listings only, Flash/Swap message variants) (8ccfce6, 2026-06-06)
- ✅ All share/copy URLs hardcoded to kassim.app — no more window.location.href/origin (08a9767, 2026-06-06)
- EasyParcel OAuth2 approval still pending ("Unauthorize Access") — fallback rates working fine
- Beta testing 100 users → LAUNCH 🚀
