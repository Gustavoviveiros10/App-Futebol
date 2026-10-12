-- Pedido de vaga pela busca passa a exigir conta
ALTER TABLE "JoinRequest" ADD COLUMN "userId" TEXT;
CREATE INDEX "JoinRequest_userId_idx" ON "JoinRequest"("userId");
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
