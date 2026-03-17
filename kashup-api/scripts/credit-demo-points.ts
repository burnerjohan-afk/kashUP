import prisma from '../src/config/prisma';

function parseArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = (parseArg('--email') ?? 'partenaire@kashup.com').trim().toLowerCase();
  const pointsRaw = parseArg('--points') ?? '2000';
  const points = Math.floor(Number(pointsRaw));

  if (!email) throw new Error('Missing --email');
  if (!Number.isFinite(points) || points <= 0) throw new Error('Invalid --points (must be > 0)');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { wallet: true },
  });
  if (!user) throw new Error(`User not found for email: ${email}`);

  const result = await prisma.$transaction(async (tx) => {
    const wallet =
      user.wallet ??
      (await tx.wallet.create({
        data: { userId: user.id, soldeCashback: 0, soldePoints: 0, soldeCoffreFort: 0 },
      }));

    await tx.points.create({
      data: {
        userId: user.id,
        delta: points,
        reason: 'Crédit démo points KashUP',
      },
    });

    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldePoints: { increment: points } },
    });

    return { newSoldePoints: updatedWallet.soldePoints };
  });

  // eslint-disable-next-line no-console
  console.log(
    `✅ Points crédités: ${points} | user=${email} | nouveau solde points=${result.newSoldePoints}`
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ credit-demo-points failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
