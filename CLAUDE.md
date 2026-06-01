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
- Stripe (payments + escrow)
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
5. **Bila Accept** — semua offer lain pada listing itu auto-REJECTED
6. **swapAcceptCash: false** — tolak CASH-only offer (tapi HYBRID masih ok)
7. **swapOpenOffers: true** — terima semua jenis tawaran walaupun kategori berbeza

## Swap Bid Schema (Listing)
```prisma
mode               ListingMode  // FLASH | SWAP
swapWantedItem     String?      // "Laptop MacBook"
swapWantedCategory String?      // "ELECTRONICS"
swapOpenOffers     Boolean      // terima apa-apa sahaja
swapAcceptCash     Boolean      // terima wang tunai sahaja
swapMinCashTopup   Float?       // min tambahan wang jika HYBRID
swapValueEstimate  Float?       // AI-generated fair value
endsAt             DateTime?    // Flash: null sehingga bid pertama | Swap: now+72h
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
parentOfferId     String?     // link ke offer sebelum (counter chain)
```

## API Routes

### Flash Bid
- `POST /api/bid` — place bid, extends timer
- `GET /api/listings/[id]/delivery-quote` — calculate courier cost
- `POST /api/listings/[id]/expire` — expire auction
- `POST /api/payment/checkout` — Stripe checkout
- `POST /api/payment/webhook` — Stripe webhook
- `GET /api/cron/expire-auctions` — cron job (CRON_SECRET required)

### Swap Bid (BARU)
- `POST /api/offers` — hantar tawaran (CASH/SWAP/HYBRID)
- `GET /api/offers?listingId=xxx` — seller: semua offers; buyer: tambah `&myOffer=true`
- `PUT /api/offers/[id]` — `{ action: 'accept' | 'reject' | 'counter', ...fields }`

### Listings
- `POST /api/listings` — cipta listing (Flash atau Swap, ikut field `mode`)
- `GET /api/listings?mode=flash|swap` — fetch dengan filter

### Gemini AI
- `POST /api/gemini/price` — AI pricing suggestion
- `POST /api/gemini/analyze` — analyze foto → title, description, conditionScore

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
      bid/            — Flash bidding engine + timer logic
      offers/         — Swap offer CRUD + counter flow
      gemini/         — price/ + analyze/
      listings/       — Listing CRUD + delivery quote
      payment/        — Stripe checkout + webhook
      transactions/   — Confirm receipt + ship
      cron/           — Expire auctions
    listings/[id]/    — Listing detail (Flash + Swap UI)
    sell/             — Create listing (mode toggle)
    dashboard/        — Seller/buyer dashboard
  lib/
    gemini.ts         — geminiGenerate(), getAIPriceSuggestion(), analyzeItemPhotos()
    delivery.ts       — Courier rate calculator
    co2.ts            — Carbon savings calculator
    badges.ts         — Impact badge logic
    prisma.ts         — Prisma client
    stripe.ts         — Stripe helpers
    resend.ts         — Email helpers
    supabase/         — Server + client Supabase
  components/
    sell/SellForm.tsx             — Mode toggle + swap fields
    listings/ListingCard.tsx      — Flash listing card
    listings/SwapListingCard.tsx  — Swap listing card (hijau, nilai + dicari)
    listings/ListingDetailClient.tsx — Detail page (Flash + Swap)
    listings/OfferModal.tsx       — Modal buat tawaran (3 tab jenis)
    listings/OwnerOffersPanel.tsx — Dashboard seller: semua offer, accept/reject/counter
proxy.ts              — Auth middleware (bukan middleware.ts!)
```

## Gemini AI
```typescript
import { geminiGenerate, getAIPriceSuggestion, analyzeItemPhotos } from '@/lib/gemini'
// Model: gemini-2.5-flash
// getAIPriceSuggestion({ category, condition, originalPrice, state })
// → { low, fair, high, suggested_min, suggested_max, reasoning }
// analyzeItemPhotos(photoUrls, category)
// → { conditionScore, title, description, isPhotoValid, invalidReason }
```

## Database Key Fields
```prisma
Listing {
  mode       ListingMode  // FLASH (default) | SWAP
  endsAt     DateTime?    // Flash: null sehingga bid | Swap: now+72h
  firstBidAt DateTime?    // Flash only
  status     ListingStatus // ACTIVE | ENDED | SOLD | CANCELLED
}

enum ListingMode { FLASH  SWAP }
enum OfferType   { CASH   SWAP   HYBRID }
enum OfferStatus { PENDING  COUNTERED  ACCEPTED  REJECTED  EXPIRED }
```

## Cara Cipta Listing (API)
```json
// Flash
{ "mode": "FLASH", "title": "...", "startingBid": 50, ... }

// Swap
{ "mode": "SWAP", "title": "...", "swapWantedItem": "Laptop", "swapWantedCategory": "ELECTRONICS", "swapAcceptCash": true, "swapOpenOffers": false, ... }
```

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
```

## Deployment
```bash
vercel deploy --prod --force --scope syedshazni-7682s-projects
```
Live: https://rehome-eta.vercel.app

## Pending (Belum Buat)
- Escrow untuk Swap (photo verification, shipping tracking, receipt confirmation) — Phase 3
- AI Value Matcher suggestions (AML-001 to AML-003) — Phase 4
- Swap Score auto-update selepas swap selesai — Phase 4
- Dispute resolution UI — Phase 4
- Winner email bila auction tamat (cron) — ada cron tapi email belum
- Real EasyParcel API (sekarang hardcoded base rates)
- Self-pickup arrangement flow selepas menang
