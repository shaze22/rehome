-- CreateIndex
CREATE INDEX "Bid_listingId_createdAt_idx" ON "Bid"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_expiresAt_idx" ON "Offer"("expiresAt");

-- CreateIndex
CREATE INDEX "Offer_listingId_status_idx" ON "Offer"("listingId", "status");

-- CreateIndex
CREATE INDEX "SwapTransaction_escrowStatus_idx" ON "SwapTransaction"("escrowStatus");

-- CreateIndex
CREATE INDEX "SwapTransaction_createdAt_idx" ON "SwapTransaction"("createdAt");
