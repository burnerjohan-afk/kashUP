/**
 * Migration des données SQLite (prisma/dev.db) vers PostgreSQL (Neon).
 * Usage: npx tsx scripts/migrate-sqlite-to-postgres.ts
 * Prérequis: DATABASE_URL dans .env pointe vers PostgreSQL
 * 
 * IMPORTANT: Vide d'abord les tables PostgreSQL puis importe les données SQLite.
 * Le compte démo du seed sera remplacé par les données migrées.
 */
import path from 'path';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const SQLITE_PATH = path.join(__dirname, '../prisma/dev.db');
const prisma = new PrismaClient();

// Mapping Prisma table name -> model name (camelCase)
function tableToModel(table: string): string {
  return table.charAt(0).toLowerCase() + table.slice(1);
}

// Ordre des tables respectant les contraintes de clés étrangères
const TABLE_ORDER = [
  'PartnerCategory',
  'Partner',
  'PartnerOffer',
  'HomeBanner',
  'CashbackRate',
  'CoffreFortConfig',
  'DonationCategory',
  'DonationAssociation',
  'Badge',
  'Lottery',
  'Challenge',
  'GiftCardConfig',
  'BoxUpConfig',
  'CarteUpLibreConfig',
  'User',
  'Wallet',
  'CoffreFortMovement',
  'CoffreFortWithdrawal',
  'CoffreFortPointsEntry',
  'WalletMonthlySnapshot',
  'Points',
  'Transaction',
  'Boost',
  'UserBoost',
  'UserBadge',
  'GiftCard',
  'GiftBox',
  'GiftBoxItem',
  'GiftCardAmount',
  'CarteUpPredefinie',
  'PredefinedGift',
  'PredefinedGiftSend',
  'FavoritePartner',
  'Notification',
  'Referral',
  'ReferralInvite',
  'DonationImpact',
  'SpotlightAssociation',
  'RewardHistory',
  'LotteryEntry',
  'ChallengeProgress',
  'BoxUpPartner',
  'UserBankConnection',
  'UserBudgetSnapshot',
  'UserPaymentMethod',
  'UserSecurityEvent',
  'PowensLinkToken',
  'PowensConnection',
  'BankAccount',
  'BankTransaction',
  'AdminReportLog',
  'PartnerDocument',
  'UserConsent',
  'BankConsent',
  'BankAccessLog',
  'GiftCardPurchase',
];

// Colonnes booléennes (SQLite stocke 0/1, Prisma attend true/false)
const BOOLEAN_COLUMNS = new Set([
  'boostable', 'giftCardEnabled', 'active', 'usesAppleSignIn', 'supportsTablet',
  'isGiftable', 'edgeToEdgeEnabled', 'predictiveBackGestureEnabled'
]);

// Colonnes DateTime (SQLite peut stocker des ms, Prisma attend Date/ISO)
const DATETIME_COLUMNS = new Set([
  'createdAt', 'updatedAt', 'deletedAt', 'startsAt', 'endsAt', 'lockedAt',
  'unlockAt', 'withdrawnAt', 'earnedAt', 'transactionDate', 'activatedAt',
  'expiresAt', 'obtainedAt', 'expiresAt'
]);

function convertValue(val: unknown, column?: string): unknown {
  if (val === null || val === undefined) return null;
  if (val instanceof Buffer) return val.toString();
  // SQLite booleans: 0/1 -> true/false
  if (column && BOOLEAN_COLUMNS.has(column) && (val === 0 || val === 1)) {
    return Boolean(val);
  }
  // DateTime: nombre (ms) -> ISO string
  if (column && DATETIME_COLUMNS.has(column) && typeof val === 'number') {
    const ms = val > 1e12 ? val : val * 1000; // ms ou secondes
    return new Date(ms).toISOString();
  }
  return val;
}

function rowToObject(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = convertValue(v, k);
  }
  return out;
}

async function migrateTable(
  sqlite: Database.Database,
  table: string
): Promise<number> {
  const tableExists = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    )
    .get(table);
  if (!tableExists) return 0;

  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<
    string,
    unknown
  >[];
  if (rows.length === 0) return 0;

  const data = rows.map((r) => rowToObject(r));
  const modelName = tableToModel(table);
  const model = (prisma as Record<string, { createMany?: (opts: { data: unknown[] }) => Promise<unknown> }>)[modelName];
  if (!model || typeof model.createMany !== 'function') {
    console.warn(`  ⚠️ Pas de modèle Prisma pour ${table}, skip`);
    return 0;
  }
  try {
    const result = await model.createMany({ data, skipDuplicates: true }) as { count: number };
    return result?.count ?? data.length;
  } catch (err) {
    // Fallback: insert one by one
    let count = 0;
    const createModel = (prisma as Record<string, { create?: (opts: { data: unknown }) => Promise<unknown> }>)[modelName];
    for (const row of data) {
      try {
        await createModel.create!({ data: row });
        count++;
      } catch (e) {
        console.warn(`  ⚠️ Erreur ligne ${table}:`, (e as Error).message);
      }
    }
    return count;
  }
}

async function truncatePostgresTables(): Promise<void> {
  console.log('   🗑️  Vidage des tables PostgreSQL...');
  // Tables racines d'abord, CASCADE vide les enfants
  const truncateOrder = [
    'PartnerCategory', 'Partner', 'HomeBanner', 'User', 'DonationCategory',
    'DonationAssociation', 'Badge', 'Lottery', 'Challenge', 'CoffreFortConfig',
    'GiftCardConfig', 'BoxUpConfig', 'CarteUpLibreConfig'
  ];
  for (const table of truncateOrder) {
    try {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`
      );
    } catch {
      // Table peut ne pas exister
    }
  }
  console.log('   ✅ Tables vidées\n');
}

async function main() {
  console.log('🔄 Migration SQLite → PostgreSQL');
  console.log('   Source:', SQLITE_PATH);
  console.log('   Cible: PostgreSQL (DATABASE_URL)\n');

  await truncatePostgresTables();

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const tables = sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
    )
    .all() as { name: string }[];

  const tableNames = tables.map((t) => t.name);
  console.log('   Tables SQLite trouvées:', tableNames.length);

  let total = 0;
  for (const table of TABLE_ORDER) {
    if (!tableNames.includes(table)) continue;
    const n = await migrateTable(sqlite, table);
    if (n > 0) {
      console.log(`   ✅ ${table}: ${n} lignes`);
      total += n;
    }
  }

  // Tables non listées dans TABLE_ORDER
  for (const table of tableNames) {
    if (TABLE_ORDER.includes(table)) continue;
    const n = await migrateTable(sqlite, table);
    if (n > 0) {
      console.log(`   ✅ ${table}: ${n} lignes`);
      total += n;
    }
  }

  sqlite.close();
  await prisma.$disconnect();
  console.log(`\n✅ Migration terminée: ${total} lignes migrées`);
}

main().catch((e) => {
  console.error('❌ Erreur:', e);
  process.exit(1);
});
