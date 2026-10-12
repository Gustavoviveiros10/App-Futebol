-- Pagamentos via Asaas (somente colunas novas e opcionais)
ALTER TABLE "Subscription" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "pendingPlan" "Plan";
ALTER TABLE "Subscription" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lastPaymentId" TEXT;
CREATE INDEX "Subscription_externalId_idx" ON "Subscription"("externalId");
