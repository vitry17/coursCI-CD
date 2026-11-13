import { URL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signToken } from '../../src/lib/jwt.js';
import { TOKEN_COOKIE } from '../../src/lib/cookies.js';

const DOMAIN = '@lot3.test';

function newUser(overrides = {}) {
  return {
    firstName: 'Léa',
    lastName: 'Martin',
    email: `lea-${Date.now()}-${Math.random().toString(36).slice(2)}${DOMAIN}`,
    phone: '0612345678',
    password: 'motdepasse1',
    ...overrides,
  };
}

async function registerAgent() {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(newUser());
  return { agent, id: res.body.user.id };
}

beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL || 'postgres://x/none').pathname;
  if (!database.endsWith('_test')) {
    throw new Error('Les tests nécessitent une DATABASE_URL dédiée (_test).');
  }
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
});

afterAll(() => prisma.$disconnect());

describe('PATCH /api/users/me', () => {
  it('modifie prénom et téléphone', async () => {
    const { agent, id } = await registerAgent();
    const res = await agent
      .patch('/api/users/me')
      .send({ firstName: 'Léna', phone: '0700000000' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ firstName: 'Léna', phone: '0700000000' });
    const inDb = await prisma.user.findUnique({ where: { id } });
    expect(inDb.firstName).toBe('Léna');
  });

  it('refuse un téléphone invalide (400 VALIDATION_ERROR)', async () => {
    const { agent } = await registerAgent();
    const res = await agent.patch('/api/users/me').send({ phone: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuse sans authentification (401)', async () => {
    const res = await request(app).patch('/api/users/me').send({ firstName: 'X' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/users/me', () => {
  it('supprime le compte et ses rendez-vous en cascade (R11)', async () => {
    const { agent, id } = await registerAgent();
    await prisma.appointment.create({
      data: {
        userId: id,
        startAt: new Date('2026-11-18T08:00:00Z'),
        endAt: new Date('2026-11-18T09:00:00Z'),
      },
    });

    const res = await agent.delete('/api/users/me');
    expect(res.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.appointment.count({ where: { userId: id } })).toBe(0);
  });

  it('interdit la suppression du compte admin (403 FORBIDDEN)', async () => {
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}${DOMAIN}`,
        passwordHash: 'test-only',
        firstName: 'Admin',
        lastName: 'Naturo',
        phone: '0600000000',
        role: 'ADMIN',
      },
    });
    const token = signToken({ sub: admin.id, role: 'ADMIN' });

    const res = await request(app)
      .delete('/api/users/me')
      .set('Cookie', [`${TOKEN_COOKIE}=${token}`]);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await prisma.user.findUnique({ where: { id: admin.id } })).not.toBeNull();
  });
});
