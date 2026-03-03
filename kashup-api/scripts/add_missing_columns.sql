-- Add description column if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS, so we'll try to add it and ignore errors if it exists
ALTER TABLE "Partner" ADD COLUMN "description" TEXT;

-- Add updatedAt column if it doesn't exist
ALTER TABLE "Partner" ADD COLUMN "updatedAt" DATETIME;

-- Set updatedAt to createdAt for existing rows
UPDATE "Partner" SET "updatedAt" = COALESCE("createdAt", datetime('now')) WHERE "updatedAt" IS NULL;

