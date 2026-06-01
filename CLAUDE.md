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
```

## Deployment
```bash
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
Live: https://rehome-eta.vercel.app

## Pending (Phase 5 — Beta + Polish)
- Beta testing 100 users
- Real EasyParcel API (sekarang hardcoded base rates)
- Flash: winner email via cron (cron ada, email belum)
- Flash: self-pickup arrangement flow selepas menang
- Performance optimization (swap feed <2s target)
- Full public launch
