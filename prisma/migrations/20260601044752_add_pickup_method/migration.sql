-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "pickupMethod" TEXT,
ADD COLUMN     "sellerPickupConfirmed" BOOLEAN NOT NULL DEFAULT false;
