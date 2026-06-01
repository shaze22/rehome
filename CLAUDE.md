@AGENTS.md

# BALLOUT — Project Context

## Apa itu BALLOUT?
Malaysian circular economy auction platform. Dua mod:
- **Lelong Pantas** — lelongan 30 minit, wang tunai sahaja
- **Tukar Barang** — tawar 3 hari, boleh tukar barang / wang / gabungan

## Tech Stack
- **Next.js 16.2.6** (App Router, Turbopack) — ada breaking changes dari v15
- TypeScript + Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Realtime) via `@supabase/ssr`
- Prisma 7 — config: `prisma.config.ts`, generated client: `src/generated/`
- Stripe (payments + escrow Flash)
- Google Gemini `gemini-2.5-flash` via `src/lib/gemini.ts`
- Resend (email notifications)
- Vercel (deployment)

## Peraturan Wajib Next.js 16
- `params` adalah `Promise<{...}>` — **mesti `await params`**
- Tiada `middleware.ts` — guna `proxy.ts`
- Baca `node_modules/next/dist/docs/` sebelum tulis code baru

## Peraturan Bidding Flash (KRITIKAL)
1. **Bid mesti whole integer (RM)** — tiada decimal, tiada sen
2. **Minimum increment: +RM1** dari bid semasa
3. **RM0 bid sah** — first bidder boleh menang percuma
4. **Timer bermula HANYA pada bid pertama** — `endsAt = null` sehingga ada bid
5. **Tiada timer sebelum bid pertama** — listing aktif selama-lamanya
6. **User tidak boleh bid pada listing sendiri**
7. **Platform fee: 15%** dari nilai bid akhir (RM0 bid = RM0 fee)

## Timer Logic (Flash)
```
Bid pertama    → endsAt = now + 15 minit, firstBidAt = now
Counter bid 1  → +5 minit (hard cap: firstBidAt + 30 minit)
Counter bid 2+ → +2.5 minit setiap satu (same hard cap)
Had mutlak     → auction tidak boleh melebihi 30 minit dari bid pertama
```

## Peraturan Swap Bid
1. **Timer 72 jam dari masa listing dicipta** — `endsAt = now + 72h` (bukan null)
2. **Offer types: CASH | SWAP | HYBRID** — pemilik boleh restrict jenis tawaran
3. **Max 1 active offer per user per listing** — status PENDING atau COUNTERED
4. **Counter-offer max 3 rounds** — selepas 3 round, pemilik mesti Accept atau Reject
5. **Bila Accept** — semua offer lain auto-REJECTED + listing jadi SOLD + SwapTransaction dicipta
6. **swapAcceptCash: false** — tolak CASH-only offer (tapi HYBRID masih ok)
7. **swapOpenOffers: true** — terima semua jenis tawaran walaupun kategori berbeza

## Swap Escrow Flow
```
Offer ACCEPTED
  → listing.status = SOLD
  → SwapTransaction dicipta (escrowStatus: PENDING)
  → CASH: buyerItemShipped = null (tidak perlu)
  → SWAP/HYBRID: buyerItemShipped = false

Seller hantar → sellerItemShipped = true + sellerPhotos + sellerTracking
Buyer hantar  → buyerItemShipped = true + buyerPhotos (SWAP/HYBRID sahaja)
  → bila semua hantar → escrowStatus = BOTH_SHIPPED

Buyer sahkan terima  → buyerItemReceived = true
Seller sahkan terima → sellerItemReceived = true (SWAP/HYBRID sahaja)
  → bila semua terima → escrowStatus = COMPLETED
  → SwapScore dikira semula, successfulSwaps++, swapVerified check

Pertikaian → escrowStatus = DISPUTED → email admin → admin resolve/buka semula
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
endsAt             DateTime?    // Flash: null sehingga bid | Swap: now+72h
status             // ACTIVE → SOLD (bila offer diterima)
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
buyerItemShipped   Boolean?     // null = CASH (tidak perlu)
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
- `POST /api/offers` — hantar tawaran + email seller
- `GET  /api/offers?listingId=xxx` — seller: semua; buyer: +`&myOffer=true`
- `PUT  /api/offers/[id]` — `{ action: 'accept'|'reject'|'counter', ...fields }` + email

### Swap Bid — Escrow
- `GET  /api/swap-transactions?listingId=xxx` — fetch tx (seller/buyer sahaja)
- `POST /api/swap-transactions/[id]/ship` — `{ photos[], trackingNumber?, courier? }` + email
- `POST /api/swap-transactions/[id]/receive` — `{ conditionOk }` → COMPLETED + SwapScore + email
- `POST /api/swap-transactions/[id]/dispute` — `{ reason }` → DISPUTED + email admin

### Listings
- `POST /api/listings` — cipta listing (Flash atau Swap)
- `GET  /api/listings?mode=flash|swap` — fetch dengan filter

### Gemini AI
- `POST /api/gemini/price` — AI pricing suggestion
- `POST /api/gemini/analyze` — analyze foto → title, description, conditionScore
- `POST /api/gemini/swap-suggest` — AI suggest swap items → suggestedItems[], suggestedCategories[], reasoning

### Admin
- `POST /api/admin/verify-ic` — verify IC pengguna
- `POST /api/admin/resolve-dispute` — `{ transactionId, resolution: 'complete'|'cancel' }`

## Notifications (Resend — `src/lib/resend.ts`)
| Trigger | Fungsi | Penerima |
|---------|--------|---------|
| Offer masuk | `sendSwapOfferReceivedEmail` | Seller |
| Offer di-counter | `sendSwapOfferCounteredEmail` | Pihak lain |
| Offer diterima | `sendSwapOfferAcceptedEmail` | Buyer |
| Barang dihantar | `sendSwapItemShippedEmail` | Penerima |
| Swap selesai | `sendSwapCompletedEmail` | Seller + Buyer |
| Pertikaian difailkan | `sendSwapDisputeEmail` | Admin |

## Gemini AI (`src/lib/gemini.ts`)
```typescript
getAIPriceSuggestion({ category, condition, originalPrice, state })
→ { low, fair, high, suggested_min, suggested_max, reasoning }

analyzeItemPhotos(photoUrls, category)
→ { conditionScore, title, description, isPhotoValid, invalidReason }

getSwapSuggestions({ title, category, condition, estimatedValue })
→ { suggestedItems[], suggestedCategories[], valueSuggestion, reasoning, confidence }
```

## Courier Rates (Hardcoded + 30% Markup)
| Zon           | Base  | Dengan Markup |
|---------------|-------|---------------|
| Same state    | RM8   | RM10.40       |
| Peninsular    | RM12  | RM15.60       |
| East Malaysia | RM20  | RM26.00       |

## Struktur Projek
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
    profile/[id]/                 — Profil + swap history + SwapScore + badges
    admin/                        — IC verify + disputed swaps
  lib/
    gemini.ts   — getAIPriceSuggestion(), analyzeItemPhotos(), getSwapSuggestions()
    resend.ts   — Flash + Swap email notifications (6 swap functions)
    delivery.ts — Courier rate calculator
    co2.ts      — Carbon savings calculator
    badges.ts   — Impact badge logic
    prisma.ts   — Prisma client
    stripe.ts   — Stripe helpers
    supabase/   — Server + client Supabase
  components/
    sell/SellForm.tsx              — Mode toggle, swap fields, AI swap suggest
    listings/ListingCard.tsx       — Flash card
    listings/SwapListingCard.tsx   — Swap card (hijau, nilai, dicari, offer count)
    listings/ListingDetailClient.tsx — Detail (Flash + Swap + Escrow)
    listings/OfferModal.tsx        — 3-tab offer form
    listings/OwnerOffersPanel.tsx  — Accept/reject/counter + Match% score
    listings/SwapEscrowPanel.tsx   — Escrow progress + ship/receive/dispute
proxy.ts              — Auth middleware (bukan middleware.ts!)
```

## Migrations
- `20260601032951_add_swap_bid_feature` — Offer model, swap fields, ListingMode/OfferType/OfferStatus
- `20260601041150_add_swap_transaction_escrow` — SwapTransaction, EscrowStatus
- `20260601044752_add_pickup_method` — Transaction.pickupMethod + sellerPickupConfirmed
- `20260601052748_add_listing_weight` — Listing.weightKg (default 1kg, untuk EasyParcel quote)

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL, DIRECT_URL
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLIC_KEY
RESEND_API_KEY
GEMINI_API_KEY
NEXT_PUBLIC_APP_URL
CRON_SECRET=rehome-cron-2026
ADMIN_EMAIL=syedshazni@todak.com
EASYPARCEL_API_KEY=          ← kosong = guna hardcoded fallback; isi dari portal.easyparcel.com
LALAMOVE_API_KEY=            ← dari developers.lalamove.com
LALAMOVE_API_SECRET=
LALAMOVE_SANDBOX=false       ← sudah set di Vercel
UPSTASH_REDIS_REST_URL=      ← ✅ sudah set di Vercel (ballout-ratelimit, Singapore)
UPSTASH_REDIS_REST_TOKEN=    ← ✅ sudah set di Vercel
```

## Deployment
```bash
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
Live: https://rehome-eta.vercel.app

## Phase 5 — Selesai Separa (commit 1add65b, 2026-06-01)

### Flash: Self-Pickup Flow (BARU)
Selepas Stripe payment berjaya, pembeli redirect ke listing page (`?payment=success`).

**API baru:**
- `GET  /api/transactions/[listingId]` — fetch flash tx (buyer/seller sahaja)
- `POST /api/transactions/[listingId]/set-pickup` — `{ method: 'DELIVERY'|'PICKUP' }` — buyer pilih kaedah
- `POST /api/transactions/[listingId]/pickup-confirm` — seller sahkan ambil sendiri → status RELEASED

**Flow PICKUP:**
```
Buyer bayar → redirect ke listing?payment=success
→ buyer klik "Ambil Sendiri"
→ atur melalui chat → seller klik "Sahkan Pembeli Telah Ambil"
→ Transaction.sellerPickupConfirmed=true, status=RELEASED, rehomeScore+5
```

**Flow DELIVERY:**
```
Buyer pilih "Penghantaran Pos"
→ seller masuk tracking → POST /api/transactions/[id]/ship
→ buyer klik "Sahkan Terima" → POST /api/transactions/[id]/confirm
→ status=RELEASED
```

### Listings Pagination
- 12 item/halaman, navigasi Sebelum/Seterusnya
- `?page=N` query param

### Home Page
- Dual section: Lelong Pantas ⚡ + Tukar Barang 🔄
- Stats live: sold, swapDone, CO₂

## EasyParcel Integration (commit 3f2602b, 2026-06-01)
- `src/lib/easyparcel.ts` — state → postcode mapping, POST EasyParcel API, fallback hardcoded
- Delivery-quote API guna EasyParcel (5s timeout), return `couriers[]` + `cheapest`
- ListingDetailClient: fetch API (400ms debounce), expandable courier list
- SellForm: weight slider 0.1–30kg
- **Aktifkan EasyParcel**: set `EASYPARCEL_API_KEY` di Vercel (portal.easyparcel.com)
- Tanpa key → fallback hardcoded (masih berfungsi)

## Lalamove Integration (commit f6a8cdd → 76c7b02, 2026-06-01)
- `src/lib/lalamove.ts` — HMAC-SHA256 auth, state→koordinat, serviceType by weight
  - < 3kg → MOTORCYCLE · < 25kg → CAR · ≥ 25kg → VAN
- EasyParcel + Lalamove run **serentak** (Promise.all), hasil digabung sort cheapest first
- `DeliveryQuoteResult.source` kini boleh jadi `'easyparcel' | 'lalamove' | 'fallback'`
- **Aktifkan**: `LALAMOVE_API_KEY=pk_prod_xxx` + `LALAMOVE_API_SECRET=sk_prod_xxx` + `LALAMOVE_SANDBOX=false`
- Keys sudah set di Vercel (2026-06-01)

### Lalamove Webhook (commit 76c7b02)
- `POST /api/lalamove/webhook` — terima delivery status update dari Lalamove
- `GET /api/lalamove/webhook` — return 200 untuk verification ping semasa register
- Verify `X-Lalamove-Signature` (HMAC-SHA256); POST tanpa signature → 200 (verification ping)
- `PICKED_UP` → `shippingStatus=SHIPPED`
- `COMPLETED` → `shippingStatus=DELIVERED` + escrow released + `rehomeScore+5`
- Match order via `Transaction.trackingNumber` (simpan Lalamove orderId di sini)
- **Webhook URL**: `https://rehome-eta.vercel.app/api/lalamove/webhook`
- Register di: developers.lalamove.com → Webhooks → tambah URL → event `ORDER_STATUS_CHANGED`

## SEO Meta/OG Tags (commit 9bd1647, 2026-06-01)
- `layout.tsx` — metadata template `'%s | BALLOUT'`, OG default, Twitter card
- `listings/[id]` — `generateMetadata`: title=listing title+price, OG image=foto listing
- `listings/page.tsx`, `sell/page.tsx`, `profile/[id]` — page-specific metadata
- `GET /api/og` — Edge ImageResponse 1200×630, branded, params: `title`, `subtitle`, `price`, `mode`
  - mode=flash → teal · mode=swap → hijau
- `/robots.txt` — allow public, disallow dashboard/api/admin/auth
- `/sitemap.xml` — homepage + listings feed + sehingga 500 active listings

## Beta Testing Prep (commit 4f86bbc, 2026-06-01)

### Rate Limiting (`src/lib/rate-limit.ts`)
- In-memory Map, auto-cleanup setiap 5 minit
- Bid: 30/5min · Offer: 10/jam · Listing: 5/jam · Feedback: 5/jam per IP

### Welcome Email
- `sendWelcomeEmail()` dalam resend.ts
- Dihantar bila user daftar buat kali pertama (dalam `/api/user/sync`)

### Feedback Widget (`src/components/feedback/FeedbackWidget.tsx`)
- Floating button bottom-right pada semua pages
- 3 jenis: Bug 🐛 / Cadangan 💡 / Lain-lain 💬
- `POST /api/feedback` → email ke ADMIN_EMAIL

### Vercel Analytics
- `<Analytics />` dari `@vercel/analytics/next` dalam layout.tsx

### Error Pages
- `src/app/error.tsx` — 500 page dengan Sentry.captureException + error.digest
- `src/app/global-error.tsx` — root layout crash handler

### Sentry (`sentry.client/server/edge.config.ts`)
- Setup siap, perlukan `NEXT_PUBLIC_SENTRY_DSN` dari sentry.io
- tracesSampleRate: 0.1

### Admin: Beta Users Table
- `/admin` kini ada table semua users — email, role, skor, listing count, IC, tarikh daftar

## Security Fixes (2026-06-01)
- ✅ Admin routes sudah ada auth check (role === 'ADMIN')
- ✅ Stripe webhook: validate metadata vs DB + idempotency check
- ✅ Upload foto: had saiz 10MB + MIME image/* check (SellForm, OfferModal, SwapEscrowPanel)
- ✅ Rate limit: Upstash Redis sliding window (ganti in-memory yang tidak efektif di Vercel)
- ⚠️  Supabase RLS: perlu verify manual di Supabase dashboard untuk semua tables

## Cron Schedule (vercel.json)
| Route | Schedule | Fungsi |
|-------|----------|--------|
| `/api/cron/expire-auctions` | 0 0 * * * (daily) | Expire Flash auctions |
| `/api/cron/auto-release-swaps` | 0 18 * * * (2am MYT) | Auto-release stuck escrow + reminder + expire stale offers |

## Beta Bug Fixes Round 1 (commit c5800bf, 2026-06-01)

| Bug | Fix |
|-----|-----|
| Flash feed search overwrite Flash time filter | `listings/page.tsx`: guna `AND` combine endsAt OR + search OR |
| Profile tunjuk SWAP listings sebagai Flash card (RM 0) | `profile/[id]/page.tsx`: render `SwapListingCard` untuk SWAP, `ListingCard` untuk FLASH |
| Profile not-found tiada navigasi | `profile/[id]/page.tsx`: inline not-found UI + "Balik ke Laman Utama" |
| `SellerListingCard` crash bila Flash `endsAt=null` | `SellerListingCard.tsx`: `endsAt: null` → tunjuk "Menunggu bidder" |

## Beta Bug Fixes Round 2 (commit 703ea8e, 2026-06-01)

Missing page metadata — semua pages kini ada `<title>` yang betul:

| Page | Title sebelum | Title sekarang |
|------|--------------|----------------|
| `/impact` | BALLOUT (default) | Impak Alam \| BALLOUT |
| `/auth/login` | BALLOUT (default) | Log Masuk \| BALLOUT |
| `/auth/register` | BALLOUT (default) | Daftar Akaun \| BALLOUT |

- `impact/page.tsx`: tambah `export const metadata`
- `auth/login/layout.tsx`: layout baru (client component tak boleh export metadata terus)
- `auth/register/layout.tsx`: layout baru

## Beta Test Full Report (2026-06-01)

| Page | Status |
|------|--------|
| Home, Flash feed, Swap feed | ✅ |
| Flash/Swap search + filters | ✅ |
| Flash/Swap listing detail | ✅ |
| Profile (valid + invalid) | ✅ |
| Impact, Login, Register | ✅ |
| Protected routes redirect | ✅ |
| Mobile 390px | ✅ |
| robots.txt, sitemap.xml | ✅ |
| Pagination | ✅ |
| Console errors | ✅ 0 errors |

## Marketing Overhaul (commit 255b306, 2026-06-01)

### PROMPT 1 — Homepage
- Hero headline: "Jual Barang Lama. Duit Masuk Hari Ini."
- CTA primary: "Mula Jual Sekarang" → `/jual` | secondary: "Semak Barangan" → `/listings`
- Stats: tunjuk credibility stats (Escrow/AI/IC/30min) bila `sold=0`; real stats bila ada data
- New section: "Kenapa BALLOUT Selamat?" — 4 trust cards
- `WasteCounter`: tersembunyi sampai `totalTransactions > 0`
- Testimonials section (3 static quotes) sebelum HowItWorks

### PROMPT 2 — Listing Detail
- `ListingDetailClient.tsx`: tambah `viewCount`, `relatedListingsSlot` props
- 👁 View count + offer/bid interest indicator bawah tajuk listing
- Escrow trust badge hijau prominent (ganti teks kecil lama)
- Seller card: "Balas < 24 jam" + bilangan listing aktif dari `seller._count.listings`
- Flash first bid button: "Bid Pertama — Mungkin Menang Percuma!"
- WhatsApp share: viral copy berbeza untuk Flash vs Swap
- `listings/[id]/page.tsx`: fetch relatedListings — awalnya sama seller, kini same category+mode (PROMPT 5 update)
- "Mungkin Anda Suka Juga" horizontal scroll di bawah bid history

### PROMPT 3 — Seller Landing Page + Navbar
- New route `/jual` (`src/app/jual/page.tsx`) — seller acquisition page
- New component `src/components/sell/FeeCalculator.tsx` — client component, slider real-time
- Page sections: Hero → Fee Calculator → Success Stories → How To Sell → FAQ → Final CTA
- FAQ guna native `<details>/<summary>` (no JS needed)
- Navbar: "Jual Barangan" → `/jual` (desktop + mobile)

## Marketing Overhaul — PROMPT 4–8 (commit 68e4553, 2026-06-01)

### PROMPT 4 — Email Notifications
- `sendOutbidEmail`: subject "⚡ Tawaran anda dikalahkan", body dengan countdown + tawaran semasa, CTA "Bid Semula Sekarang"
- `sendWatchlistAlertEmail`: notify semua watcher listing bila ada bid baru (exclude new bidder + outbid user)
- `sendAuctionExpiredSellerEmail`: seller dapat email bila lelongan tamat dengan harga menang
- `sendReferralRewardEmail`: notify referrer bila kawan berjaya daftar
- `/api/bid`: hantar watchlist alerts kepada semua watcher selepas setiap bid
- `/api/cron/expire-auctions`: hantar seller email serentak dengan winner email

### PROMPT 5 — Related Listings + Recently Viewed
- Related listings: tukar dari "same seller" → **same category + same mode**, order by viewCount desc, take 4
- Section title: "Mungkin Anda Suka Juga"
- `RecentlyViewed.tsx`: client component, localStorage max 6 items, horizontal scroll
- `trackRecentlyViewed()`: dipanggil dalam `ListingDetailClient` via `useEffect` on mount
- Home page: "Anda Baru Tengok" section (bila ada data), "🔥 Trending Minggu Ini" (viewCount desc, 7 hari)

### PROMPT 6 — FOMO Triggers
- `ListingCard` + `SwapListingCard`: "🔥 Popular" HOT badge bila viewCount≥20 ATAU bid/offer≥3
- `ListingCard`: Flash listing >7 hari tanpa bid tunjuk "Sudah X hari" ganti timer
- `isFeatured Boolean @default(false)` ditambah pada Listing model
- `MegaLelongCountdown.tsx`: countdown ke Jumaat 9pm MYT, tunjuk Isnin-Khamis sahaja
- Home page: "⚡ Mega Lelong Jumaat" section (tunjuk bila ada featured listings)
- `/api/admin/feature-listing`: toggle isFeatured (admin only)
- `AdminPanel`: `FeaturedListingRow` dengan ⚡ Feature / Unfeature button per listing
- WhatsApp share text lebih viral: "Aku jumpa [ITEM]... Kau nak bid tak?"
- `ListingDetailClient`: auto-track via `trackRecentlyViewed` useEffect

### PROMPT 7 — Referral Program
- Schema: `User.referralCode String? @unique`, `User.creditBalance Float @default(0)`, model `Referral`
- `/api/user/sync`: auto-generate 8-char referralCode (nanoid) pada first register; process `ballout_ref` cookie → credit RM5 dua-dua pihak + create Referral record
- `/api/referral/set-cookie`: validate code, set httpOnly cookie 1 hari, redirect ke /auth/register
- `/api/referral`: GET stats (code, creditBalance, referralCount, totalRewards)
- `/r/[code]`: landing page — nama pengaju, reward RM5, feature list, CTA "Daftar & Dapat RM5 Credit"
- `ReferralSection.tsx`: dashboard widget — credit balance, stats, copy link, WhatsApp share
- `/api/payment/checkout`: kurang credit dari harga (max bidAmount-1 untuk Stripe min RM1), simpan `creditUsed` dalam metadata
- `/api/payment/webhook`: deduct `creditUsed` dari `creditBalance` selepas payment berjaya
- `CreditCheckoutButton`: tunjuk preview diskaun dalam listing detail sebelum checkout

### PROMPT 8 — PWA (selesai sepenuhnya commit 301bd14)
- `src/app/manifest.ts`: name BALLOUT, theme #14b8a6, standalone, shortcuts (Flash/Jual)
- `/api/pwa-icon?size=N`: edge route generate ⚡ branded PNG icon via ImageResponse (192, 512)
- `public/sw.js`: cache-first navigation, skip API/Supabase/Stripe, push event handler, notificationclick handler
- `/offline`: fallback page bila tiada internet (anchor tag, bukan onClick)
- `PWASetup.tsx`: register SW on mount, capture beforeinstallprompt, banner selepas 30s, dismiss ke localStorage
- `PushPermission.tsx`: prompt permission 5s selepas load (logged-in users), sekali sahaja
- Schema: model `PushSubscription` (endpoint unique, cascade delete)
- `/api/push/subscribe`: POST upsert, DELETE remove subscription
- `src/lib/push.ts`: `sendPushToUser()` — hantar ke semua device, auto-cleanup expired (410/404)
- VAPID keys set di Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`
- `layout.tsx`: async, fetch user server-side, render `<PushPermission userId>` conditionally
- Push triggers (semua fire-and-forget):

| Event | Route | Push |
|-------|-------|------|
| Outbid | `/api/bid` | ⚡ Tawaran anda dikalahkan! |
| Offer received | `/api/offers` POST | 🔄 Tawaran baru diterima! |
| Offer accepted | `/api/offers/[id]` accept | 🎉 Tawaran anda diterima! |
| Counter offer | `/api/offers/[id]` counter | 💬 Counter tawaran baru! |
| Item shipped | `/api/swap-transactions/[id]/ship` | 📦 Barang sedang dalam perjalanan! |
| Swap completed | `/api/swap-transactions/[id]/receive` | ✅ Swap selesai! (kedua-dua) |
| Dispute filed | `/api/swap-transactions/[id]/dispute` | ⚠️ Pertikaian difailkan |

## Last Deployed
2026-06-01, commit `301bd14` (PROMPT 8 PWA selesai sepenuhnya)
Live: https://rehome-eta.vercel.app

## All Routes
| Route | Purpose |
|-------|---------|
| `/jual` | Seller acquisition landing page + fee calculator |
| `/r/[code]` | Referral landing page |
| `/offline` | PWA offline fallback |
| `/api/referral` | GET referral stats |
| `/api/referral/set-cookie` | Set referral cookie + redirect |
| `/api/push/subscribe` | POST/DELETE push subscription |
| `/api/pwa-icon` | Edge: generate PWA icon PNG |
| `/api/admin/feature-listing` | Toggle isFeatured (admin) |

## Pending (Tindakan Manual — Bukan Kod)
- Set `EASYPARCEL_API_KEY` di Vercel → portal.easyparcel.com
- Lalamove API key perlu diaktifkan oleh Lalamove (502 error)
- Set `NEXT_PUBLIC_SENTRY_DSN` di Vercel → sentry.io free tier
- Enable Vercel Analytics di dashboard Vercel
- Verify Supabase RLS policies untuk semua tables
- Mark listing sebagai featured via `/admin` untuk aktifkan "Mega Lelong Jumaat"
- Beta testing 100 users → LAUNCH 🚀
