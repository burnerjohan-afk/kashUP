/**
 * Simule un jackpot communautaire pour l'affichage sur la page d'accueil.
 * Crée ou met à jour la config et le jackpot actif avec des valeurs de démo.
 *
 * Usage: npx tsx scripts/seed-jackpot-demo.ts
 */
/// <reference types="node" />
import prisma from '../src/config/prisma';

const DEMO_AMOUNT = 350;
const DEMO_PARTNER_PURCHASES = 2500;
const DEMO_ACTIONS = 120;
const DEMO_PARTICIPANTS = 5;
const THRESHOLD_PURCHASES = 10000;
const THRESHOLD_ACTIONS = 2000;
const DRAW_DAYS_FROM_NOW = 30;

async function main() {
  // Config singleton : créer ou mettre à jour avec des seuils lisibles
  let config = await prisma.communityJackpotConfig.findFirst();
  if (!config) {
    const maxDraw = new Date();
    maxDraw.setDate(maxDraw.getDate() + DRAW_DAYS_FROM_NOW);
    config = await prisma.communityJackpotConfig.create({
      data: {
        cashbackContributionPercent: 5,
        lotteryPointsContribution: 2,
        challengePointsContribution: 2,
        globalPartnerPurchaseAmountThreshold: THRESHOLD_PURCHASES,
        globalActionsThreshold: THRESHOLD_ACTIONS,
        minActionsPerUser: 1,
        minPartnerPurchasesPerUser: null,
        freeParticipationTickets: 1,
        partnerPurchaseTickets: 5,
        lotteryTicketTickets: 2,
        challengeCompletionTickets: 2,
        maxDrawDate: maxDraw,
      },
    });
    console.log('Config jackpot créée.');
  } else {
    await prisma.communityJackpotConfig.update({
      where: { id: config.id },
      data: {
        globalPartnerPurchaseAmountThreshold: THRESHOLD_PURCHASES,
        globalActionsThreshold: THRESHOLD_ACTIONS,
        maxDrawDate: config.maxDrawDate ?? (() => {
          const d = new Date();
          d.setDate(d.getDate() + DRAW_DAYS_FROM_NOW);
          return d;
        })(),
      },
    });
    console.log('Config jackpot mise à jour.');
  }

  const maxDrawDate = new Date();
  maxDrawDate.setDate(maxDrawDate.getDate() + DRAW_DAYS_FROM_NOW);

  let jackpot = await prisma.communityJackpot.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!jackpot) {
    jackpot = await prisma.communityJackpot.create({
      data: {
        title: 'Jackpot KashUP',
        description: 'Jackpot communautaire alimenté par le cashback, les loteries et les challenges.',
        currentAmount: DEMO_AMOUNT,
        currency: 'EUR',
        status: 'active',
        totalParticipants: DEMO_PARTICIPANTS,
        totalActions: DEMO_ACTIONS,
        totalPartnerPurchasesAmount: DEMO_PARTNER_PURCHASES,
        maxDrawDate,
      },
    });
    console.log('Jackpot démo créé.');
  } else {
    jackpot = await prisma.communityJackpot.update({
      where: { id: jackpot.id },
      data: {
        currentAmount: DEMO_AMOUNT,
        totalParticipants: DEMO_PARTICIPANTS,
        totalActions: DEMO_ACTIONS,
        totalPartnerPurchasesAmount: DEMO_PARTNER_PURCHASES,
        maxDrawDate: jackpot.maxDrawDate ?? maxDrawDate,
      },
    });
    console.log('Jackpot démo mis à jour.');
  }

  console.log('');
  console.log('Jackpot simulé:');
  console.log(`  Montant: ${jackpot.currentAmount} ${jackpot.currency}`);
  console.log(`  Achats partenaires: ${jackpot.totalPartnerPurchasesAmount} € / ${THRESHOLD_PURCHASES} €`);
  console.log(`  Actions: ${jackpot.totalActions} / ${THRESHOLD_ACTIONS}`);
  console.log(`  Participants: ${jackpot.totalParticipants}`);
  console.log(`  Tirage avant: ${jackpot.maxDrawDate?.toLocaleDateString('fr-FR') ?? '—'}`);
  console.log('');
  console.log('Rechargez la page d\'accueil de l\'app pour voir le bloc Jackpot.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
