import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    $queryRaw: vi
      .fn()
      .mockRejectedValue(new Error('sensitive database details')),
  },
}));
import app from '../../src/app.js';
describe('Healthcheck indisponible', () => {
  it('retourne 503 sans divulguer les détails de connexion', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'error', db: 'error' });
  });
});
