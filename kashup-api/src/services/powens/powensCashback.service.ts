import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { AppError } from '../../utils/errors';

const WALLET_KEYWORDS = [
  'APPLE PAY',
  'GOOGLE PAY',
  'GPAY',
  'ANDROID PAY',
];

const TECH_WORDS = new Set([
  'CB',
  'CARTE',
  'VISA',
  'MASTERCARD',
  'PAIEMENT',
  'PAYMENT',
  'DEBIT',
  'CREDIT',
  'FACT',
  'FACTURE',
  'PRELEVEMENT',
  'PRELEV',
  'PRLV',
  'SEPA',
  'VIREMENT',
  'VIR',
  'ONLINE',
  'INTERNET',
  'EU',
  'EUR',
]);

function toAsciiUpper(input: string): string {
  const s = input ?? '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function stripSpecialChars(input: string): string {
  return input
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeNumericTokens(input: string): string {
  return input
    .split(' ')
    .filter((t) => !/^\d+$/.test(t))
    .join(' ')
    .trim();
}

export function normalizeMerchantLabel(raw: string): string {
  let s = stripSpecialChars(toAsciiUpper(raw));
  s = removeNumericTokens(s);
  const tokens = s
    .split(' ')
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !TECH_WORDS.has(t));
  return tokens.join(' ').trim();
}

export function detectWalletPayment(labelUpper: string): { isWallet: boolean; paymentMethod?: 'apple_pay' | 'google_pay' } {
  const upper = labelUpper;
  if (upper.includes('APPLE PAY')) return { isWallet: true, paymentMethod: 'apple_pay' };
  if (upper.includes('GOOGLE PAY') || upper.includes('GPAY') || upper.includes('ANDROID PAY')) return { isWallet: true, paymentMethod: 'google_pay' };
  return { isWallet: WALLET_KEYWORDS.some((k) => upper.includes(k)) };
}

export function extractWalletMerchant(normalizedLabelUpper: string): string | null {
  // Heuristique simple: retirer les mots wallet et reprendre le reste
  let s = normalizedLabelUpper;
  s = s.replace(/\bAPPLE PAY\b/g, ' ');
  s = s.replace(/\bGOOGLE PAY\b/g, ' ');
  s = s.replace(/\bANDROID PAY\b/g, ' ');
  s = s.replace(/\bGPAY\b/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return s;
}

type AliasRow = { partnerId: string; aliasText: string; priority: number };

function bestAliasMatch(merchantNormalized: string, aliases: AliasRow[]): { partnerId: string; aliasText: string } | null {
  const hay = merchantNormalized;
  let best: { partnerId: string; aliasText: string; score: number } | null = null;
  for (const a of aliases) {
    const aliasNorm = normalizeMerchantLabel(a.aliasText);
    if (!aliasNorm) continue;
    if (!hay.includes(aliasNorm)) continue;
    // Score: priorité d'abord, puis longueur alias (plus long = plus spécifique)
    const score = (a.priority ?? 1) * 1000 + aliasNorm.length;
    if (!best || score > best.score) best = { partnerId: a.partnerId, aliasText: a.aliasText, score };
  }
  return best ? { partnerId: best.partnerId, aliasText: best.aliasText } : null;
}

export async function processCashbackForConnection(connectionId: string): Promise<{ scanned: number; processed: number; rewarded: number }> {
  const connection = await prisma.powensConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, userId: true, status: true },
  });
  if (!connection) throw new AppError('Connexion Powens introuvable', 404);
  if (connection.status !== 'active') {
    return { scanned: 0, processed: 0, rewarded: 0 };
  }

  const [aliasesDb, partners] = await Promise.all([
    prisma.partnerAlias.findMany({ select: { partnerId: true, aliasText: true, priority: true } }),
    prisma.partner.findMany({ select: { id: true, name: true, slug: true, status: true, tauxCashbackBase: true, pointsPerTransaction: true } }),
  ]);
  const partnerById = new Map(partners.map((p) => [p.id, p]));

  // Aliases effectifs: DB + fallback (nom + slug) pour que ça marche "out of the box"
  const aliases: AliasRow[] = [
    ...aliasesDb,
    ...partners.flatMap((p) => {
      const extra: AliasRow[] = [];
      if (p.name) extra.push({ partnerId: p.id, aliasText: p.name, priority: 1 });
      if (p.slug) extra.push({ partnerId: p.id, aliasText: p.slug, priority: 0 });
      return extra;
    }),
  ];

  const txns = await prisma.bankTransaction.findMany({
    where: {
      cashbackProcessed: false,
      account: { connectionId },
    },
    orderBy: { date: 'asc' },
    take: 1000,
    select: {
      id: true,
      powensTransactionId: true,
      amount: true,
      date: true,
      label: true,
      accountId: true,
    },
  });

  let processed = 0;
  let rewarded = 0;

  for (const t of txns) {
    const labelUpper = toAsciiUpper(t.label ?? '');
    const normalized = normalizeMerchantLabel(labelUpper);
    const { isWallet, paymentMethod } = detectWalletPayment(labelUpper);
    const extracted = isWallet ? extractWalletMerchant(normalized) : normalized;
    const merchantNormalized = extracted ? normalizeMerchantLabel(extracted) : '';

    // Ignorer les crédits/remboursements (montant positif)
    if (t.amount >= 0) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: isWallet,
          extractedMerchant: extracted ?? null,
          merchantNormalized: merchantNormalized || null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: t.amount === 0 ? 'ignored_credit' : 'ignored_credit',
          cashbackReason: 'Transaction crédit / remboursement ignorée',
        },
      });
      processed += 1;
      continue;
    }

    if (isWallet && !merchantNormalized) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: true,
          extractedMerchant: null,
          merchantNormalized: null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: 'wallet_unknown',
          cashbackReason: 'Wallet détecté mais marchand non identifiable',
        },
      });
      processed += 1;
      continue;
    }

    const match = merchantNormalized ? bestAliasMatch(merchantNormalized, aliases) : null;
    if (!match) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: isWallet,
          extractedMerchant: extracted ?? null,
          merchantNormalized: merchantNormalized || null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: 'no_match',
          cashbackReason: 'Aucun partenaire correspondant',
        },
      });
      processed += 1;
      continue;
    }

    const partner = partnerById.get(match.partnerId);
    if (!partner || (partner.status ?? 'active') !== 'active') {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: isWallet,
          extractedMerchant: extracted ?? null,
          merchantNormalized: merchantNormalized || null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: 'rejected',
          cashbackReason: 'Partenaire inactif',
        },
      });
      processed += 1;
      continue;
    }

    const transactionAmountAbs = Math.abs(t.amount);
    const rate = Number(partner.tauxCashbackBase ?? 0);
    const cashbackAmount = Math.round(((transactionAmountAbs * rate) / 100) * 100) / 100;
    const pointsToAdd = Math.max(0, Math.round(Number(partner.pointsPerTransaction ?? 0)));
    if (!Number.isFinite(cashbackAmount) || cashbackAmount <= 0) {
      await prisma.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: isWallet,
          extractedMerchant: extracted ?? null,
          merchantNormalized: merchantNormalized || null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: 'rejected',
          cashbackReason: 'Taux cashback nul',
        },
      });
      processed += 1;
      continue;
    }

    // Anti-doublon: bankTransactionId unique sur CashbackTransaction
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashbackTransaction.findUnique({ where: { bankTransactionId: t.id } });
      if (existing) {
        return { already: true as const, cashbackAmount: existing.cashbackAmount, id: existing.id };
      }

      const wallet = await tx.wallet.upsert({
        where: { userId: connection.userId },
        create: { userId: connection.userId, soldeCashback: 0, soldePoints: 0, soldeCoffreFort: 0 },
        update: {},
      });

      const cbTx = await tx.cashbackTransaction.create({
        data: {
          userId: connection.userId,
          partnerId: partner.id,
          bankTransactionId: t.id,
          powensTransactionId: t.powensTransactionId ?? null,
          transactionAmount: transactionAmountAbs,
          cashbackRate: rate,
          cashbackAmount,
          paymentMethod: isWallet ? (paymentMethod ?? 'wallet_unknown') : 'card',
          status: 'confirmed',
        },
      });

      await tx.transaction.create({
        data: {
          userId: connection.userId,
          partnerId: partner.id,
          amount: transactionAmountAbs,
          cashbackEarned: cashbackAmount,
          pointsEarned: pointsToAdd,
          source: 'powens',
          status: 'confirmed',
          metadata: JSON.stringify({
            type: 'powens_cashback',
            bankTransactionId: t.id,
            powensTransactionId: t.powensTransactionId ?? null,
            label: t.label,
            normalizedLabel: normalized,
            merchantNormalized,
            aliasMatched: match.aliasText,
            isWalletPayment: isWallet,
          }),
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          soldeCashback: { increment: cashbackAmount },
          ...(pointsToAdd > 0 && { soldePoints: { increment: pointsToAdd } }),
        },
      });

      if (pointsToAdd > 0) {
        await tx.points.create({
          data: {
            userId: connection.userId,
            delta: pointsToAdd,
            reason: `Points partenaire - transaction détectée (${partner.name})`,
          },
        });
      }

      await tx.bankTransaction.update({
        where: { id: t.id },
        data: {
          normalizedLabel: normalized,
          isWalletPayment: isWallet,
          extractedMerchant: extracted ?? null,
          merchantNormalized: merchantNormalized || null,
          cashbackProcessed: true,
          cashbackProcessedAt: new Date(),
          cashbackStatus: 'confirmed',
          cashbackReason: null,
          cashbackTxId: cbTx.id,
        },
      });

      return { already: false as const, cashbackAmount, id: cbTx.id };
    });

    processed += 1;
    if (!created.already) {
      rewarded += 1;
    }
  }

  logger.info(
    { connectionId, userId: connection.userId, scanned: txns.length, processed, rewarded },
    '[Powens cashback] Traitement terminé'
  );

  return { scanned: txns.length, processed, rewarded };
}

