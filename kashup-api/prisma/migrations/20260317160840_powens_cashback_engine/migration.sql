/*
  Warnings:

  - You are about to drop the column `offerId` on the `GiftCardPurchase` table. All the data in the column will be lost.
  - You are about to drop the column `offerType` on the `GiftCardPurchase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BankTransaction" ADD COLUMN     "cashbackProcessed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cashbackProcessedAt" TIMESTAMP(3),
ADD COLUMN     "cashbackReason" TEXT,
ADD COLUMN     "cashbackStatus" TEXT,
ADD COLUMN     "extractedMerchant" TEXT,
ADD COLUMN     "isWalletPayment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchantNormalized" TEXT,
ADD COLUMN     "normalizedLabel" TEXT;

-- AlterTable
ALTER TABLE "GiftCardPurchase" DROP COLUMN "offerId",
DROP COLUMN "offerType";

-- CreateTable
CREATE TABLE "PartnerAlias" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "aliasText" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashbackTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "bankTransactionId" TEXT NOT NULL,
    "powensTransactionId" TEXT,
    "transactionAmount" DOUBLE PRECISION NOT NULL,
    "cashbackRate" DOUBLE PRECISION NOT NULL,
    "cashbackAmount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashbackTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerAlias_partnerId_idx" ON "PartnerAlias"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerAlias_aliasText_idx" ON "PartnerAlias"("aliasText");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerAlias_partnerId_aliasText_key" ON "PartnerAlias"("partnerId", "aliasText");

-- CreateIndex
CREATE UNIQUE INDEX "CashbackTransaction_bankTransactionId_key" ON "CashbackTransaction"("bankTransactionId");

-- CreateIndex
CREATE INDEX "CashbackTransaction_userId_idx" ON "CashbackTransaction"("userId");

-- CreateIndex
CREATE INDEX "CashbackTransaction_partnerId_idx" ON "CashbackTransaction"("partnerId");

-- CreateIndex
CREATE INDEX "CashbackTransaction_powensTransactionId_idx" ON "CashbackTransaction"("powensTransactionId");

-- CreateIndex
CREATE INDEX "CashbackTransaction_status_idx" ON "CashbackTransaction"("status");

-- CreateIndex
CREATE INDEX "BankTransaction_cashbackProcessed_idx" ON "BankTransaction"("cashbackProcessed");

-- CreateIndex
CREATE INDEX "BankTransaction_merchantNormalized_idx" ON "BankTransaction"("merchantNormalized");

-- AddForeignKey
ALTER TABLE "PartnerAlias" ADD CONSTRAINT "PartnerAlias_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashbackTransaction" ADD CONSTRAINT "CashbackTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashbackTransaction" ADD CONSTRAINT "CashbackTransaction_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashbackTransaction" ADD CONSTRAINT "CashbackTransaction_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
