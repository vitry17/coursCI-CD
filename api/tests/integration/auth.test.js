import { URL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

// Domaine dédié aux tests pour un nettoyage ciblé (ne touche pas au seed admin).
const DOMAIN = '@lot2.test';

function validUser(overrides = {}) {
  return {
    firstName: 'Léa',
    lastName: 'Martin',
    email: `lea-${Date.now()}-${Math.random().toString(36).slice(2)}${DOMAIN}`,
    phone: '0612345678',
    password: 'motdepasse1',
    ...overrides,
  };
}

beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL || 'postgres://x/none').pathname;
  if (!database.endsWith('_test')) {
    throw new Error(
      'Les tests nécessitent une DATABASE_URL dédiée dont le nom finit par _test.'
    );
  }
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
});

afterAll(() => prisma.$disconnect());

describe('POST /api/auth/register', () => {
  it('crée un compte, pose un cookie et ne renvoie pas le hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser());
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: 'PATIENT', firstName: 'Léa' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.join(';')).toContain('token=');
  });

  it('refuse un email déjà pris (409 EMAIL_TAKEN)', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app).post('/api/auth/register').send(user);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('refuse un mot de passe faible (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser({ password: 'abc' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
  });
});

describe('POST /api/auth/login', () => {
  it('connecte avec les bons identifiants', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email.toLowerCase());
    expect(res.headers['set-cookie']?.join(';')).toContain('token=');
  });

  it('refuse un mauvais mot de passe (401)', async () => {
    const user = validUser();
    await request(app).post('/api/auth/register').send(user);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'mauvais1mot' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('GET /api/auth/me et logout', () => {
  it('refuse sans cookie (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('renvoie l’utilisateur courant avec le cookie, puis 401 après logout', async () => {
    const agent = request.agent(app);
    const user = validUser();
    await agent.post('/api/auth/register').send(user);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(user.email.toLowerCase());

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });
});
