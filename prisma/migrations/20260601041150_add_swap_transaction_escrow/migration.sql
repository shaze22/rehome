-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'BOTH_SHIPPED', 'COMPLETED', 'DISPUTED');

-- CreateTable
CREATE TABLE "SwapTransaction" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "acceptedOfferId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "sellerItemShipped" BOOLEAN NOT NULL DEFAULT false,
    "buyerItemShipped" BOOLEAN,
    "sellerItemReceived" BOOLEAN NOT NULL DEFAULT false,
    "buyerItemReceived" BOOLEAN NOT NULL DEFAULT false,
    "sellerPhotos" TEXT[],
    "buyerPhotos" TEXT[],
    "sellerTracking" TEXT,
    "buyerTracking" TEXT,
    "sellerCourier" TEXT,
    "buyerCourier" TEXT,
    "disputeReason" TEXT,
    "disputeEvidence" TEXT[],
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SwapTransaction_listingId_key" ON "SwapTransaction"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "SwapTransaction_acceptedOfferId_key" ON "SwapTransaction"("acceptedOfferId");

-- CreateIndex
CREATE INDEX "SwapTransaction_sellerId_idx" ON "SwapTransaction"("sellerId");

-- CreateIndex
CREATE INDEX "SwapTransaction_buyerId_idx" ON "SwapTransaction"("buyerId");

-- AddForeignKey
ALTER TABLE "SwapTransaction" ADD CONSTRAINT "SwapTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapTransaction" ADD CONSTRAINT "SwapTransaction_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapTransaction" ADD CONSTRAINT "SwapTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapTransaction" ADD CONSTRAINT "SwapTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
