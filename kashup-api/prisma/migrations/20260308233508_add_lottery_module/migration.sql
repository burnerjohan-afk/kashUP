-- AlterTable
ALTER TABLE "Lottery" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "drawDate" TIMESTAMP(3),
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isTicketStockLimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTicketsPerUser" INTEGER,
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "pointsPerTicket" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "prizeCurrency" TEXT DEFAULT 'EUR',
ADD COLUMN     "prizeDescription" TEXT,
ADD COLUMN     "prizeTitle" TEXT,
ADD COLUMN     "prizeType" TEXT,
ADD COLUMN     "prizeValue" DOUBLE PRECISION,
ADD COLUMN     "rewardId" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "showOnHome" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showOnRewards" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "totalTicketsAvailable" INTEGER,
ADD COLUMN     "totalTicketsSold" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "winnerUserId" TEXT,
ALTER COLUMN "ticketCost" DROP NOT NULL;

-- AlterTable
ALTER TABLE "LotteryEntry" ADD COLUMN     "pointsSpent" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticketCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "LotteryTicket" (
    "id" TEXT NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryWinner" (
    "id" TEXT NOT NULL,
    "lotteryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "ticketId" TEXT,
    "drawDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardStatus" TEXT NOT NULL DEFAULT 'pending',
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LotteryTicket_lotteryId_idx" ON "LotteryTicket"("lotteryId");

-- CreateIndex
CREATE INDEX "LotteryTicket_userId_idx" ON "LotteryTicket"("userId");

-- CreateIndex
CREATE INDEX "LotteryTicket_entryId_idx" ON "LotteryTicket"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryTicket_lotteryId_ticketNumber_key" ON "LotteryTicket"("lotteryId", "ticketNumber");

-- CreateIndex
CREATE INDEX "LotteryWinner_lotteryId_idx" ON "LotteryWinner"("lotteryId");

-- CreateIndex
CREATE INDEX "LotteryWinner_userId_idx" ON "LotteryWinner"("userId");

-- CreateIndex
CREATE INDEX "Lottery_status_idx" ON "Lottery"("status");

-- CreateIndex
CREATE INDEX "Lottery_showOnHome_idx" ON "Lottery"("showOnHome");

-- CreateIndex
CREATE INDEX "Lottery_showOnRewards_idx" ON "Lottery"("showOnRewards");

-- CreateIndex
CREATE INDEX "LotteryEntry_lotteryId_idx" ON "LotteryEntry"("lotteryId");

-- CreateIndex
CREATE INDEX "LotteryEntry_userId_idx" ON "LotteryEntry"("userId");

-- AddForeignKey
ALTER TABLE "Lottery" ADD CONSTRAINT "Lottery_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTicket" ADD CONSTRAINT "LotteryTicket_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "Lottery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTicket" ADD CONSTRAINT "LotteryTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryTicket" ADD CONSTRAINT "LotteryTicket_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "LotteryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryWinner" ADD CONSTRAINT "LotteryWinner_lotteryId_fkey" FOREIGN KEY ("lotteryId") REFERENCES "Lottery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryWinner" ADD CONSTRAINT "LotteryWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
