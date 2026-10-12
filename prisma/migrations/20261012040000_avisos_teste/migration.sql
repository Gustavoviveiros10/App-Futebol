-- Avisos de fim do teste grátis por e-mail (aditivo)
ALTER TABLE "Subscription" ADD COLUMN "trialReminderAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN "trialEndedAt" TIMESTAMP(3);
