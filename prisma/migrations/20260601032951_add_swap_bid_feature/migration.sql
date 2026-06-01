-- CreateEnum
CREATE TYPE "ListingMode" AS ENUM ('FLASH', 'SWAP');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('CASH', 'SWAP', 'HYBRID');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "mode" "ListingMode" NOT NULL DEFAULT 'FLASH',
ADD COLUMN     "swapAcceptCash" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "swapMinCashTopup" DOUBLE PRECISION,
ADD COLUMN     "swapOpenOffers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "swapValueEstimate" DOUBLE PRECISION,
ADD COLUMN     "swapWantedCategory" TEXT,
ADD COLUMN     "swapWantedItem" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "successfulSwaps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "swapScore" DOUBLE PRECISION,
ADD COLUMN     "swapVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "offeredItemPhotos" TEXT[],
    "offeredItemDesc" TEXT,
    "offeredCashAmount" DOUBLE PRECISION,
    "offeredItemValue" DOUBLE PRECISION,
    "totalOfferValue" DOUBLE PRECISION,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "counterRounds" INTEGER NOT NULL DEFAULT 0,
    "parentOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_listingId_idx" ON "Offer"("listingId");

-- CreateIndex
CREATE INDEX "Offer_bidderId_idx" ON "Offer"("bidderId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Listing_mode_status_idx" ON "Listing"("mode", "status");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_bidderId_fkey" FOREIGN KEY ("bidderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_parentOfferId_fkey" FOREIGN KEY ("parentOfferId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
