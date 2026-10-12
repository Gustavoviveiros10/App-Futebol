-- Upgrade de plano cobrado à parte (aditivo)
ALTER TABLE "Subscription" ADD COLUMN "upgradePaymentId" TEXT;
CREATE INDEX "Subscription_upgradePaymentId_idx" ON "Subscription"("upgradePaymentId");
