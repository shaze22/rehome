-- DropIndex
DROP INDEX IF EXISTS "Review_listingId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Review_listingId_reviewerId_key" ON "Review"("listingId", "reviewerId");
