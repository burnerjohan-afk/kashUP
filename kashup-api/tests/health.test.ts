import request from 'supertest';
import { describe, expect, it } from 'vitest';
import createApp from '../src/app';

const app = createApp();

describe('Health endpoint', () => {
  it('should return ok status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data.status', 'ok');
  });
});


