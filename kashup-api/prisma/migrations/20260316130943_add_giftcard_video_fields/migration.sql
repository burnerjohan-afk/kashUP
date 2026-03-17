-- AlterTable
ALTER TABLE "GiftCardPurchase" ADD COLUMN     "videoDeletedAt" TIMESTAMP(3),
ADD COLUMN     "videoDurationSeconds" INTEGER,
ADD COLUMN     "videoOpenedAt" TIMESTAMP(3),
ADD COLUMN     "videoRetentionUntil" TIMESTAMP(3),
ADD COLUMN     "videoSentAt" TIMESTAMP(3),
ADD COLUMN     "videoStatus" TEXT DEFAULT 'none',
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "videoViewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videoViewedAt" TIMESTAMP(3);
