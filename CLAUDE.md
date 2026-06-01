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
1. **Bid must be whole integer (RM)** — no decimals, no cents
2. **Minimum increment: +RM1** from current bid
3. **RM0 bid valid** — first bidder can win for free
4. **Timer starts ONLY on first bid** — `endsAt = null` until first bid
5. **No timer before first bid** — listing stays active indefinitely
6. **User cannot bid on own listing**
7. **Platform fee: 15%** of final bid (RM0 bid = RM0 fee)

## Timer Logic (Flash)
```
First bid      → endsAt = now + 15 min, firstBidAt = now
Counter bid 1  → +5 min (hard cap: firstBidAt + 30 min)
Counter bid 2+ → +2.5 min each (same hard cap)
Hard cap       → auction cannot exceed 30 min from first bid
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
- `POST /api/listings` — create listing (Flash or Swap)
- `GET  /api/listings?mode=flash|swap` — fetch with filters

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

## Courier Rates (Hardcoded + 30% Markup)
| Zone          | Base  | With Markup |
|---------------|-------|-------------|
| Same state    | RM8   | RM10.40     |
| Peninsular    | RM12  | RM15.60     |
| East Malaysia | RM20  | RM26.00     |

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
      admin/verify-ic|resolve-dispute
      cron/                       — Expire auctions
    listings/[id]/                — Listing detail (Flash + Swap + Escrow)
    sell/                         — Create listing (mode toggle + AI swap suggest)
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
      Navbar.tsx          — includes LanguageSwitcher
      Footer.tsx
      LanguageSwitcher.tsx — 5-language dropdown, sets 'kassim_locale' cookie
    sell/SellForm.tsx              — Mode toggle, swap fields, AI swap suggest
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

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL, DIRECT_URL
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLIC_KEY
RESEND_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL=https://kassim.app   ← set in Vercel Production
CRON_SECRET=rehome-cron-2026
ADMIN_EMAIL=syedshazni@todak.com
EASYPARCEL_API_KEY=          ← empty = hardcoded fallback; get from portal.easyparcel.com
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
| `kassim-v1` | Service Worker cache | SW cache name |

## PWA
- `src/app/manifest.ts` — name: KASSIM, theme: #14b8a6, standalone
- Shortcuts: "Flash Auctions" → `/listings?mode=flash`, "Sell Now" → `/sell`
- `public/sw.js` — cache: `kassim-v1`, notification tag: `kassim`
- `PWASetup.tsx` — SW registration + install banner (30s delay)
- `PushPermission.tsx` — push permission prompt (5s delay, logged-in only)

## Flash: Self-Pickup Flow
After Stripe payment, buyer redirects to listing page (`?payment=success`).

**APIs:**
- `GET  /api/transactions/[listingId]` — fetch flash tx (buyer/seller only)
- `POST /api/transactions/[listingId]/set-pickup` — `{ method: 'DELIVERY'|'PICKUP' }`
- `POST /api/transactions/[listingId]/pickup-confirm` — seller confirms pickup → RELEASED

**PICKUP flow:**
```
Buyer pays → redirect to listing?payment=success
→ buyer clicks "Self Pickup"
→ arrange via chat → seller clicks "Confirm Buyer Has Picked Up"
→ Transaction.sellerPickupConfirmed=true, status=RELEASED, rehomeScore+5
```

**DELIVERY flow:**
```
Buyer selects "Delivery"
→ seller enters tracking → POST /api/transactions/[id]/ship
→ buyer clicks "Confirm Received" → POST /api/transactions/[id]/confirm
→ status=RELEASED
```

## EasyParcel Integration
- `src/lib/easyparcel.ts` — state → postcode mapping, POST EasyParcel API, hardcoded fallback
- 5s timeout, returns `couriers[]` + `cheapest`
- **Activate**: set `EASYPARCEL_API_KEY` in Vercel (portal.easyparcel.com)
- Without key → hardcoded fallback (still works)

## Lalamove Integration
- `src/lib/lalamove.ts` — HMAC-SHA256 auth, state→coordinates, serviceType by weight
  - < 3kg → MOTORCYCLE · < 25kg → CAR · ≥ 25kg → VAN
- EasyParcel + Lalamove run **in parallel** (Promise.all), combined + sorted cheapest first
- **Webhook URL**: `https://kassim.app/api/lalamove/webhook`
- `PICKED_UP` → `shippingStatus=SHIPPED`
- `COMPLETED` → `shippingStatus=DELIVERED` + escrow released + `rehomeScore+5`

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
| `/api/cron/expire-auctions` | 0 0 * * * (daily) | Expire Flash auctions |
| `/api/cron/auto-release-swaps` | 0 18 * * * (2am MYT) | Auto-release stuck escrow + reminder + expire stale offers |

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
- ⚠️  Supabase RLS: needs manual verification in Supabase dashboard

## All Routes
| Route | Purpose |
|-------|---------|
| `/jual` | Seller acquisition landing page + fee calculator (English) |
| `/r/[code]` | Referral landing page (English) |
| `/offline` | PWA offline fallback |
| `/api/referral` | GET referral stats |
| `/api/referral/set-cookie` | Set kassim_ref cookie + redirect |
| `/api/push/subscribe` | POST/DELETE push subscription |
| `/api/pwa-icon` | Edge: generate PWA icon PNG |
| `/api/admin/feature-listing` | Toggle isFeatured (admin) |

## Last Deployed
2026-06-01 — Rebrand KASSIM + English UI + next-intl i18n foundation
Live: https://rehome-eta.vercel.app (target: https://kassim.app — add domain in Vercel dashboard)

## Pending (Manual Actions — Not Code)
- Add domain `kassim.app` in Vercel Dashboard → Project → Settings → Domains, then add DNS records
- Set `EASYPARCEL_API_KEY` in Vercel → portal.easyparcel.com
- Lalamove API key needs activation by Lalamove (502 error)
- Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel → sentry.io free tier
- Enable Vercel Analytics in Vercel dashboard
- Verify Supabase RLS policies for all tables
- Mark listings as featured via `/admin` to activate "Friday Mega Auction"
- Fill in `messages/id.json`, `messages/zh.json`, `messages/ar.json` translations
- Beta testing 100 users → LAUNCH 🚀
