import request from 'supertest';
import { subMinutes } from 'date-fns';
import { beforeAll, describe, expect, it } from 'vitest';
import createApp from '../src/app';
import prisma from '../src/config/prisma';

const app = createApp();

const basePath = '/api/v1';

describe('Delta sync across mobile-facing resources', () => {
  const updatedSince = subMinutes(new Date(), 5).toISOString();
  let partnerId: string;

  beforeAll(async () => {
    // Clean relevant tables (best-effort for sqlite dev)
    await prisma.partnerOffer.deleteMany({});
    await prisma.boost.deleteMany({});
    await prisma.giftCard.deleteMany({});
    await prisma.predefinedGift.deleteMany({});
    await prisma.giftBox.deleteMany({});
    await prisma.donationAssociation.deleteMany({});
    await prisma.donationCategory.deleteMany({});
    await prisma.partner.deleteMany({});
    await prisma.partnerCategory.deleteMany({});

    // Seed category + partner for offers
    const category = await prisma.partnerCategory.create({ data: { name: 'Services' } });
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Partner',
        slug: 'test-partner',
        tauxCashbackBase: 5,
        categoryId: category.id,
        territories: JSON.stringify(['Martinique'])
      }
    });
    partnerId = partner.id;
  });

  it('offers/current honors updatedSince + pagination defaults', async () => {
    const now = new Date();
    await prisma.partnerOffer.create({
      data: {
        partnerId,
        title: 'Test Offer',
        cashbackRate: 5,
        startsAt: subMinutes(now, 10),
        endsAt: subMinutes(now, -10),
        stock: 10,
        status: 'active',
        active: true
      }
    });

    const res = await request(app)
      .get(`${basePath}/offers/current`)
      .query({ updatedSince })
      .expect(200);

    const items = res.body.data ?? res.body.data?.offers ?? res.body;
    expect(Array.isArray(items)).toBeTruthy();
    expect(items.find((o: any) => o.title === 'Test Offer')).toBeTruthy();
  });

  it('rewards/boosts honors updatedSince', async () => {
    const now = new Date();
    await prisma.boost.create({
      data: {
        name: 'Test Boost',
        description: 'Boost desc',
        multiplier: 1.2,
        target: 'all',
        costInPoints: 10,
        startsAt: subMinutes(now, 10),
        endsAt: subMinutes(now, -10),
        active: true
      }
    });

    const res = await request(app)
      .get(`${basePath}/rewards/boosts`)
      .query({ updatedSince })
      .expect(200);

    const items = res.body.data ?? res.body;
    expect(items.find((b: any) => b.name === 'Test Boost')).toBeTruthy();
  });

  it('gift-cards catalog honors updatedSince', async () => {
    await prisma.giftCard.create({
      data: {
        name: 'Test GC',
        description: 'Gift card',
        type: 'bon_achat',
        value: 20,
        isGiftable: true
      }
    });

    const res = await request(app)
      .get(`${basePath}/gift-cards`)
      .query({ updatedSince })
      .expect(200);

    const payload = res.body.data ?? res.body;
    const items = Array.isArray(payload) ? payload : payload.data ?? [];
    expect(items.find((g: any) => g.name === 'Test GC')).toBeTruthy();
  });

  it('donations categories honor updatedSince', async () => {
    await prisma.donationCategory.create({
      data: {
        name: 'Enviro',
        description: 'Enviro cat'
      }
    });

    const res = await request(app)
      .get(`${basePath}/donations/categories`)
      .query({ updatedSince })
      .expect(200);

    const items = res.body.data ?? res.body;
    expect(items.find((c: any) => c.name === 'Enviro')).toBeTruthy();
  });
});

