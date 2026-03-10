-- CreateTable
CREATE TABLE "CommunityJackpotConfig" (
    "id" TEXT NOT NULL,
    "cashbackContributionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lotteryPointsContribution" INTEGER NOT NULL DEFAULT 0,
    "challengePointsContribution" INTEGER NOT NULL DEFAULT 0,
    "globalPartnerPurchaseAmountThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "globalActionsThreshold" INTEGER NOT NULL DEFAULT 0,
    "minActionsPerUser" INTEGER NOT NULL DEFAULT 0,
    "minPartnerPurchasesPerUser" INTEGER,
    "freeParticipationTickets" INTEGER NOT NULL DEFAULT 1,
    "partnerPurchaseTickets" INTEGER NOT NULL DEFAULT 0,
    "lotteryTicketTickets" INTEGER NOT NULL DEFAULT 0,
    "challengeCompletionTickets" INTEGER NOT NULL DEFAULT 0,
    "maxDrawDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityJackpotConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityJackpot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Jackpot KashUP',
    "description" TEXT,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxDrawDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalActions" INTEGER NOT NULL DEFAULT 0,
    "totalPartnerPurchasesAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastWinnerUserId" TEXT,
    "lastWinningAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityJackpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JackpotContribution" (
    "id" TEXT NOT NULL,
    "jackpotId" TEXT NOT NULL,
    "userId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceReferenceId" TEXT,
    "contributionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JackpotContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JackpotEntry" (
    "id" TEXT NOT NULL,
    "jackpotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tickets" INTEGER NOT NULL DEFAULT 0,
    "actionsCount" INTEGER NOT NULL DEFAULT 0,
    "partnerPurchasesCount" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JackpotEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JackpotWinner" (
    "id" TEXT NOT NULL,
    "jackpotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "winningAmount" DOUBLE PRECISION NOT NULL,
    "drawDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JackpotWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityJackpot_status_idx" ON "CommunityJackpot"("status");

-- CreateIndex
CREATE INDEX "CommunityJackpot_maxDrawDate_idx" ON "CommunityJackpot"("maxDrawDate");

-- CreateIndex
CREATE INDEX "JackpotContribution_jackpotId_idx" ON "JackpotContribution"("jackpotId");

-- CreateIndex
CREATE INDEX "JackpotContribution_userId_idx" ON "JackpotContribution"("userId");

-- CreateIndex
CREATE INDEX "JackpotContribution_sourceType_idx" ON "JackpotContribution"("sourceType");

-- CreateIndex
CREATE INDEX "JackpotEntry_jackpotId_idx" ON "JackpotEntry"("jackpotId");

-- CreateIndex
CREATE INDEX "JackpotEntry_userId_idx" ON "JackpotEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JackpotEntry_jackpotId_userId_key" ON "JackpotEntry"("jackpotId", "userId");

-- CreateIndex
CREATE INDEX "JackpotWinner_jackpotId_idx" ON "JackpotWinner"("jackpotId");

-- CreateIndex
CREATE INDEX "JackpotWinner_userId_idx" ON "JackpotWinner"("userId");

-- AddForeignKey
ALTER TABLE "JackpotContribution" ADD CONSTRAINT "JackpotContribution_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "CommunityJackpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JackpotContribution" ADD CONSTRAINT "JackpotContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JackpotEntry" ADD CONSTRAINT "JackpotEntry_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "CommunityJackpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JackpotEntry" ADD CONSTRAINT "JackpotEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JackpotWinner" ADD CONSTRAINT "JackpotWinner_jackpotId_fkey" FOREIGN KEY ("jackpotId") REFERENCES "CommunityJackpot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JackpotWinner" ADD CONSTRAINT "JackpotWinner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
