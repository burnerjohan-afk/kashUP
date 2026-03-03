import request from 'supertest';
import { v4 as uuid } from 'uuid';
import createApp from '../src/app';
import prisma from '../src/config/prisma';
import { signAccessToken } from '../src/utils/token';
import { USER_ROLE } from '../src/types/domain';

const app = createApp();

// Helpers
const adminToken = () =>
  signAccessToken({
    sub: 'admin-user',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: USER_ROLE.admin
  });

const ensureCategory = async (name: string) => {
  const existing = await prisma.partnerCategory.findFirst({ where: { name } });
  if (existing) return existing.id;
  const created = await prisma.partnerCategory.create({ data: { name } });
  return created.id;
};

describe('Partner sync contract', () => {
  const basePath = '/api/v1/partners';
  let categoryId: string;

  beforeAll(async () => {
    categoryId = await ensureCategory('Services');
  });

  it('POST -> GET list -> GET list with updatedSince returns newly created partner', async () => {
    const uniqueName = `Test Partner ${uuid()}`;
    const createPayload = {
      name: uniqueName,
      categoryId,
      territories: ['Martinique'],
      tauxCashbackBase: 5
    };

    const createRes = await request(app)
      .post(`${basePath}/create-simple`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(createPayload)
      .expect(201);

    const created = createRes.body.data;
    expect(created?.id).toBeTruthy();
    expect(created?.name).toBe(uniqueName);
    expect(created?.updatedAt).toBeTruthy();

    // Liste complète triée par updatedAt desc par défaut
    const listRes = await request(app)
      .get(basePath)
      .query({ limit: 5 })
      .expect(200);

    const partners = listRes.body.data?.partners || listRes.body.data;
    const found = partners.find((p: any) => p.id === created.id);
    expect(found).toBeTruthy();

    // Delta sync: updatedSince juste avant la création
    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const deltaRes = await request(app)
      .get(basePath)
      .query({ updatedSince: cutoff, limit: 10 })
      .expect(200);

    const deltaPartners = deltaRes.body.data?.partners || deltaRes.body.data;
    const foundDelta = deltaPartners.find((p: any) => p.id === created.id);
    expect(foundDelta).toBeTruthy();
  });
});

