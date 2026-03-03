import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { TERRITORIES } from '../src/types/domain';

const prisma = new PrismaClient();

const hashPassword = (password: string) => bcrypt.hash(password, 10);

async function seed() {
  // Catégories fonctionnelles selon le contexte métier
  const categories = [
    'restauration',
    'loisir',
    'beaute-et-bien-etre',
    'mobilite',
    'culture',
    'sport',
    'mode',
    'services',
    'electronique',
    'retails'
  ];

  const categoryIds = new Map<string, string>();
  for (const name of categories) {
    const category = await prisma.partnerCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    categoryIds.set(name, category.id);
  }

  const partners = [
    {
      name: 'Carrefour Dillon',
      slug: 'carrefour-dillon',
      category: 'retails',
      territory: TERRITORIES[0],
      tauxCashbackBase: 5,
      latitude: 14.6167,
      longitude: -61.0588
    },
    {
      name: 'Hitbox Guadeloupe',
      slug: 'hitbox-guadeloupe',
      category: 'loisir',
      territory: TERRITORIES[1],
      tauxCashbackBase: 6,
      latitude: 16.2411,
      longitude: -61.534
    }
  ];

  for (const partner of partners) {
    const territoriesJson = JSON.stringify([partner.territory]);
    await prisma.partner.upsert({
      where: { slug: partner.slug },
      update: {
        name: partner.name,
        territories: territoriesJson,
        tauxCashbackBase: partner.tauxCashbackBase
      },
      create: {
        name: partner.name,
        slug: partner.slug,
        categoryId: categoryIds.get(partner.category)!,
        territories: territoriesJson,
        tauxCashbackBase: partner.tauxCashbackBase,
        latitude: partner.latitude,
        longitude: partner.longitude
      }
    });
  }

  const adminPassword = await hashPassword('Kashup123!');

  await prisma.user.upsert({
    where: { email: 'admin@kashup.com' },
    update: {},
    create: {
      email: 'admin@kashup.com',
      firstName: 'Léa',
      lastName: 'Admin',
      role: 'admin',
      hashedPassword: adminPassword,
      wallet: {
        create: {
          soldeCashback: 120,
          soldePoints: 800
        }
      }
    }
  });

  // Config coffre-fort : 2 mois de blocage, 10 points par € par mois
  const existingCoffreConfig = await prisma.coffreFortConfig.findFirst();
  if (!existingCoffreConfig) {
    await prisma.coffreFortConfig.create({
      data: { lockPeriodMonths: 2, pointsPerEuroPerMonth: 10 }
    });
  }

  console.log('🌱 Seed minimal exécuté.');
}

seed()
  .catch((error) => {
    console.error('❌ Erreur pendant le seed Prisma', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

