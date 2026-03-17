import prisma from '../src/config/prisma';
import { processCashbackForConnection } from '../src/services/powens/powensCashback.service';

function parseArg(name: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const connectionId = parseArg('--connectionId')?.trim();
  const userId = parseArg('--userId')?.trim();

  let connectionIds: string[] = [];
  if (connectionId) {
    connectionIds = [connectionId];
  } else if (userId) {
    const conns = await prisma.powensConnection.findMany({
      where: { userId, status: 'active' },
      select: { id: true },
    });
    connectionIds = conns.map((c) => c.id);
  } else {
    const conns = await prisma.powensConnection.findMany({
      where: { status: 'active' },
      select: { id: true },
    });
    connectionIds = conns.map((c) => c.id);
  }

  if (connectionIds.length === 0) {
    // eslint-disable-next-line no-console
    console.log('Aucune connexion Powens active à traiter.');
    return;
  }

  let scanned = 0;
  let processed = 0;
  let rewarded = 0;

  for (const id of connectionIds) {
    const res = await processCashbackForConnection(id);
    scanned += res.scanned;
    processed += res.processed;
    rewarded += res.rewarded;
    // eslint-disable-next-line no-console
    console.log(`✅ connection=${id} scanned=${res.scanned} processed=${res.processed} rewarded=${res.rewarded}`);
  }

  // eslint-disable-next-line no-console
  console.log(`\nTotal scanned=${scanned} processed=${processed} rewarded=${rewarded}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ process-powens-cashback failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

