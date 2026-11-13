import { URL } from 'node:url';
import { randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import bcrypt from 'bcrypt';
import { prisma } from '../../src/lib/prisma.js';
import { seedAdmin } from '../../prisma/admin.js';

beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL || '').pathname;
  if (!database.endsWith('_test')) {
    throw new Error(
      'Les tests nécessitent une DATABASE_URL dédiée dont le nom finit par _test.'
    );
  }
});
let user;
const users = [];
const days = [];
beforeEach(async () => {
  user = await prisma.user.create({
    data: {
      email: randomUUID() + '@example.test',
      passwordHash: 'test-only',
      firstName: 'Test',
      lastName: 'Patient',
      phone: '0600000000',
    },
  });
  users.push(user.id);
});
afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  await prisma.closedDay.deleteMany({ where: { id: { in: days.splice(0) } } });
});
afterAll(() => prisma.$disconnect());

function book(overrides = {}) {
  return prisma.appointment.create({
    data: {
      userId: user.id,
      startAt: new Date('2026-11-18T08:00:00Z'),
      endAt: new Date('2026-11-18T09:00:00Z'),
      ...overrides,
    },
  });
}
describe('Contraintes PostgreSQL', () => {
  it('refuse deux réservations concurrentes sur le même créneau', async () => {
    const results = await Promise.allSettled([book(), book()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected').reason.code).toBe(
      'P2002'
    );
  });
  it('libère un créneau après annulation', async () => {
    const first = await book();
    await prisma.appointment.update({
      where: { id: first.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'PATIENT',
      },
    });
    await expect(book()).resolves.toMatchObject({ status: 'BOOKED' });
  });
  it('refuse un jour autre que mercredi', async () => {
    await expect(
      book({
        startAt: new Date('2026-11-19T08:00:00Z'),
        endAt: new Date('2026-11-19T09:00:00Z'),
      })
    ).rejects.toThrow(/appointments_wednesday_ck/);
  });
  it.each([
    ['2026-11-17T23:30:00Z', '2026-11-18T00:30:00Z'],
    ['2026-07-07T22:30:00Z', '2026-07-07T23:30:00Z'],
  ])(
    'utilise le mercredi de Paris en hiver et en été (%s)',
    async (start, end) => {
      await expect(
        book({ startAt: new Date(start), endAt: new Date(end) })
      ).resolves.toBeDefined();
    }
  );
  it('refuse le mercredi UTC déjà jeudi à Paris', async () => {
    await expect(
      book({
        startAt: new Date('2026-07-08T22:30:00Z'),
        endAt: new Date('2026-07-08T23:30:00Z'),
      })
    ).rejects.toThrow(/appointments_wednesday_ck/);
  });
  it.each(['2026-11-18T08:00:00Z', '2026-11-18T07:00:00Z'])(
    'refuse une fin non postérieure (%s)',
    async (end) => {
      await expect(book({ endAt: new Date(end) })).rejects.toThrow(
        /appointments_end_ck/
      );
    }
  );
  it.each([
    { status: 'CANCELLED' },
    { status: 'CANCELLED', cancelledAt: new Date() },
    { status: 'CANCELLED', cancelledBy: 'ADMIN' },
    { cancelledAt: new Date() },
    { cancelledBy: 'PATIENT' },
  ])('refuse une annulation incohérente (%j)', async (data) => {
    await expect(book(data)).rejects.toThrow(/appointments_cancel_ck/);
  });
  it('supprime les rendez-vous en cascade', async () => {
    const appointment = await book();
    await prisma.user.delete({ where: { id: user.id } });
    expect(
      await prisma.appointment.findUnique({ where: { id: appointment.id } })
    ).toBeNull();
  });
  it('refuse un patient inexistant', async () => {
    await expect(book({ userId: randomUUID() })).rejects.toMatchObject({
      code: 'P2003',
    });
  });
  it('refuse un email dupliqué', async () => {
    const { id, ...data } = user;
    expect(id).toBeDefined();
    await expect(prisma.user.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
  it('refuse une fermeture hors mercredi', async () => {
    await expect(
      prisma.closedDay.create({ data: { date: new Date('2026-11-19') } })
    ).rejects.toThrow(/closed_days_wednesday_ck/);
  });
  it('refuse une fermeture dupliquée', async () => {
    const data = { date: new Date('2026-11-18') };
    days.push((await prisma.closedDay.create({ data })).id);
    await expect(prisma.closedDay.create({ data })).rejects.toMatchObject({
      code: 'P2002',
    });
  });
});
describe('Seed administrateur', () => {
  it('normalise l’email, hache le mot de passe et reste idempotent', async () => {
    const env = {
      ADMIN_EMAIL: '  ' + randomUUID() + '@EXAMPLE.TEST ',
      ADMIN_PASSWORD: 'test-password-123',
    };
    const admin = await seedAdmin(prisma, env);
    users.push(admin.id);
    expect(admin.email).toBe(env.ADMIN_EMAIL.trim().toLowerCase());
    expect(admin.role).toBe('ADMIN');
    expect(await bcrypt.compare(env.ADMIN_PASSWORD, admin.passwordHash)).toBe(
      true
    );
    const second = await seedAdmin(prisma, {
      ...env,
      ADMIN_PASSWORD: 'another-password-123',
    });
    expect(second.id).toBe(admin.id);
    expect(second.passwordHash).toBe(admin.passwordHash);
  });
  it('refuse de promouvoir un patient existant', async () => {
    await expect(
      seedAdmin(prisma, {
        ADMIN_EMAIL: user.email,
        ADMIN_PASSWORD: 'test-password-123',
      })
    ).rejects.toThrow(/patient/);
    expect(
      (await prisma.user.findUnique({ where: { id: user.id } })).role
    ).toBe('PATIENT');
  });
  it.each([
    {},
    { ADMIN_EMAIL: 'invalid', ADMIN_PASSWORD: 'long-password' },
    { ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'short' },
    { ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'é'.repeat(37) },
  ])('refuse une configuration invalide (%j)', async (env) => {
    await expect(seedAdmin(prisma, env)).rejects.toThrow(/ADMIN_/);
  });
});
