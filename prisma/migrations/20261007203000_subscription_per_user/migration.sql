-- A assinatura passa a ser do organizador (usuário), não da pelada.
-- Migração aditiva: "groupId" continua existindo (agora opcional) para a versão
-- anterior do app seguir funcionando até o deploy novo entrar no ar.
-- Uma migração futura remove a coluna.
ALTER TABLE "Subscription" ADD COLUMN "userId" TEXT;
UPDATE "Subscription" s SET "userId" = g."ownerId" FROM "Group" g WHERE g."id" = s."groupId";
UPDATE "Subscription" a SET "userId" = NULL
  FROM "Subscription" b WHERE a."userId" = b."userId" AND a."id" > b."id";

ALTER TABLE "Subscription" ALTER COLUMN "groupId" DROP NOT NULL;

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
