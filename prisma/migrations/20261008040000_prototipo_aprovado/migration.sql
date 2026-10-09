-- Aditiva: só cria tipos, colunas com default e tabelas novas (o código antigo continua funcionando).
-- CreateEnum
CREATE TYPE "GameFormat" AS ENUM ('TWO_TEAMS', 'ROTATION');

-- CreateEnum
CREATE TYPE "MatchAccess" AS ENUM ('RESTRICTED', 'APPROVAL', 'OPEN');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('FUTSAL', 'SOCIETY', 'FIELD');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "JoinStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('COURT', 'EQUIPMENT', 'FOOD', 'DRINK', 'REFEREE', 'OTHER');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "access" "MatchAccess" NOT NULL DEFAULT 'RESTRICTED',
ADD COLUMN     "format" "GameFormat" NOT NULL DEFAULT 'TWO_TEAMS',
ADD COLUMN     "level" "Level" NOT NULL DEFAULT 'INTERMEDIATE',
ADD COLUMN     "modality" "Modality" NOT NULL DEFAULT 'SOCIETY';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "access" "MatchAccess" NOT NULL DEFAULT 'RESTRICTED',
ADD COLUMN     "format" "GameFormat" NOT NULL DEFAULT 'TWO_TEAMS',
ADD COLUMN     "shareCode" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wins" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PeerRating" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "conduct" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "status" "JoinStatus" NOT NULL DEFAULT 'PENDING',
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Barbecue" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Barbecue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BbqPerson" (
    "id" TEXT NOT NULL,
    "bbqId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "playerId" TEXT,
    "guest" BOOLEAN NOT NULL DEFAULT false,
    "attending" BOOLEAN NOT NULL DEFAULT true,
    "drinks" BOOLEAN NOT NULL DEFAULT true,
    "paid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BbqPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BbqItem" (
    "id" TEXT NOT NULL,
    "bbqId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "payerId" TEXT NOT NULL,
    "drinksOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BbqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "receipt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeerRating_ratedId_idx" ON "PeerRating"("ratedId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerRating_matchId_raterId_ratedId_key" ON "PeerRating"("matchId", "raterId", "ratedId");

-- CreateIndex
CREATE INDEX "JoinRequest_matchId_status_idx" ON "JoinRequest"("matchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Barbecue_matchId_key" ON "Barbecue"("matchId");

-- CreateIndex
CREATE INDEX "BbqPerson_bbqId_idx" ON "BbqPerson"("bbqId");

-- CreateIndex
CREATE INDEX "BbqItem_bbqId_idx" ON "BbqItem"("bbqId");

-- CreateIndex
CREATE INDEX "Expense_groupId_date_idx" ON "Expense"("groupId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Match_shareCode_key" ON "Match"("shareCode");

-- CreateIndex
CREATE INDEX "Match_access_date_idx" ON "Match"("access", "date");

-- AddForeignKey
ALTER TABLE "PeerRating" ADD CONSTRAINT "PeerRating_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerRating" ADD CONSTRAINT "PeerRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerRating" ADD CONSTRAINT "PeerRating_ratedId_fkey" FOREIGN KEY ("ratedId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Barbecue" ADD CONSTRAINT "Barbecue_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BbqPerson" ADD CONSTRAINT "BbqPerson_bbqId_fkey" FOREIGN KEY ("bbqId") REFERENCES "Barbecue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BbqItem" ADD CONSTRAINT "BbqItem_bbqId_fkey" FOREIGN KEY ("bbqId") REFERENCES "Barbecue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BbqItem" ADD CONSTRAINT "BbqItem_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "BbqPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

