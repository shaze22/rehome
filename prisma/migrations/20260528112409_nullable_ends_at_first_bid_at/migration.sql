-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "firstBidAt" TIMESTAMP(3),
ALTER COLUMN "endsAt" DROP NOT NULL;
