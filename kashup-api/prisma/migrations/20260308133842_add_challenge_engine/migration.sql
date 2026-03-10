/*
  Warnings:

  - Added the required column `updatedAt` to the `ChallengeProgress` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChallengeProgress" DROP CONSTRAINT "ChallengeProgress_challengeId_fkey";

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficulty" TEXT DEFAULT 'medium',
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "rewardId" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'challenge_purchase',
ALTER COLUMN "status" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "ChallengeProgress" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ChallengeReward" (
    "id" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardCurrency" TEXT DEFAULT 'EUR',
    "expirationDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "Challenge_type_idx" ON "Challenge"("type");

-- CreateIndex
CREATE INDEX "ChallengeProgress_userId_idx" ON "ChallengeProgress"("userId");

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "ChallengeReward"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeProgress" ADD CONSTRAINT "ChallengeProgress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
