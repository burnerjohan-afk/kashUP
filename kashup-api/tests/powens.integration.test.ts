import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import createApp from '../src/app';
import prisma from '../src/config/prisma';
import { signAccessToken } from '../src/utils/token';
import { USER_ROLE } from '../src/types/domain';

const app = createApp();

// Helper pour générer un token admin
const adminToken = () =>
  signAccessToken({
    sub: 'admin-user',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: USER_ROLE.admin
  });

describe('Powens Integration - Empty DB', () => {
  it('GET /admin/dashboard should return zeros when DB is empty', async () => {
    // S'assurer que la DB est vide (ou au moins vérifier les valeurs)
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    
    // Vérifier que les KPI sont à 0 ou des tableaux vides
    if (res.body.data.kpis) {
      expect(res.body.data.kpis.revenue).toBe(0);
      expect(res.body.data.kpis.cashback).toBe(0);
      expect(res.body.data.kpis.users).toBeGreaterThanOrEqual(0);
      expect(res.body.data.kpis.partners).toBeGreaterThanOrEqual(0);
    }
    
    if (res.body.data.dailyTransactions) {
      expect(Array.isArray(res.body.data.dailyTransactions)).toBe(true);
    }
    
    if (res.body.data.territories) {
      expect(Array.isArray(res.body.data.territories)).toBe(true);
    }
  });

  it('GET /admin/statistics/table should return empty rows when DB is empty', async () => {
    const res = await request(app)
      .get('/api/v1/admin/statistics/table')
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.rows)).toBe(true);
    
    // Si aucune transaction, rows doit être vide
    const transactionCount = await prisma.transaction.count({
      where: { status: 'confirmed' }
    });
    
    if (transactionCount === 0) {
      expect(res.body.data.rows.length).toBe(0);
      expect(res.body.data.totals.transactions).toBe(0);
      expect(res.body.data.totals.revenue).toBe(0);
      expect(res.body.data.totals.cashback).toBe(0);
    }
  });
});

