-- Plano anual: ciclo de cobrança da assinatura (aditivo)
CREATE TYPE "PlanCycle" AS ENUM ('MONTHLY', 'YEARLY');
ALTER TABLE "Subscription" ADD COLUMN "cycle" "PlanCycle" NOT NULL DEFAULT 'MONTHLY';
