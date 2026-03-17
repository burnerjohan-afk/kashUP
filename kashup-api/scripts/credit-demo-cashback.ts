import prisma from '../src/config/prisma';

function parseArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = (parseArg('--email') ?? 'test@kashup.com').trim().toLowerCase();
  const amountRaw = parseArg('--amount') ?? '1000';
  const amount = Number(amountRaw);

  if (!email) throw new Error('Missing --email');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid --amount (must be > 0)');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true },
  });
  if (!user) throw new Error(`User not found for email: ${email}`);

  const partner =
    (await prisma.partner.findFirst({ where: { slug: 'partenaire-demo' } })) ??
    (await prisma.partner.findFirst({}));
  if (!partner) throw new Error('No partner found in database');

  const result = await prisma.$transaction(async (tx) => {
    const wallet =
      user.wallet ??
      (await tx.wallet.create({
        data: { userId: user.id, soldeCashback: 0, soldePoints: 0, soldeCoffreFort: 0 },
      }));

    const transaction = await tx.transaction.create({
      data: {
        userId: user.id,
        partnerId: partner.id,
        amount: 0,
        cashbackEarned: amount,
        pointsEarned: 0,
        source: 'demo_credit',
        status: 'confirmed',
        metadata: JSON.stringify({
          type: 'demo_credit',
          note: 'Crédit démo cashback',
          creditedAmount: amount,
        }),
      },
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldeCashback: { increment: amount } },
    });

    return { transactionId: transaction.id, newSoldeCashback: updatedWallet.soldeCashback };
  });

  // eslint-disable-next-line no-console
  console.log(
    `✅ Cashback crédité: ${amount}€ | user=${email} | transaction=${result.transactionId} | solde=${result.newSoldeCashback}`
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ credit-demo-cashback failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

