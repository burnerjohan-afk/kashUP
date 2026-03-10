-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "ChallengeProgress" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Challenge_category_idx" ON "Challenge"("category");
