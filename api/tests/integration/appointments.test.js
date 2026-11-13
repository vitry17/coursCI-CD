import { URL } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  consultationDatesBetween,
  slotsForDate,
  localDateString,
  slotEnd,
} from '../../src/lib/schedule.js';

const DOMAIN = '@lot4.test';
const CLOSED_REASON = 'TEST-LOT4-CLOSED';
const DAY = 86400000;

function newUser(extra = {}) {
  return {
    firstName: 'Léa',
    lastName: 'Martin',
    email: `lea-${Date.now()}-${Math.random().toString(36).slice(2)}${DOMAIN}`,
    phone: '0612345678',
    password: 'motdepasse1',
    ...extra,
  };
}

async function agentFor() {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(newUser());
  return { agent, id: res.body.user.id };
}

// Mercredis situés entre +2 jours et +7 semaines (dans la fenêtre de réservation).
function futureDates() {
  const now = Date.now();
  return consultationDatesBetween(
    localDateString(new Date(now + 2 * DAY)),
    localDateString(new Date(now + 7 * 7 * DAY))
  );
}
function futureSlot(dateIndex = 1, slotIndex = 3) {
  const dates = futureDates();
  const d = dates[Math.min(dateIndex, dates.length - 1)];
  return slotsForDate(d.year, d.month, d.day)[slotIndex];
}

beforeAll(() => {
  const database = new URL(process.env.DATABASE_URL || 'postgres://x/none').pathname;
  if (!database.endsWith('_test')) {
    throw new Error('Les tests nécessitent une DATABASE_URL dédiée (_test).');
  }
});

afterEach(async () => {
  await prisma.closedDay.deleteMany({ where: { reason: CLOSED_REASON } });
  await prisma.user.deleteMany({ where: { email: { contains: DOMAIN } } });
});

afterAll(() => prisma.$disconnect());

describe('POST /api/appointments', () => {
  it('réserve un créneau valide', async () => {
    const { agent } = await agentFor();
    const slot = futureSlot();
    const res = await agent
      .post('/api/appointments')
      .send({ startAt: slot.startAt.toISOString(), reason: 'Fatigue' });
    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      status: 'BOOKED',
      startAt: slot.startAt.toISOString(),
      reason: 'Fatigue',
    });
  });

  it('refuse un horaire hors grille (422 NOT_A_SLOT)', async () => {
    const { agent } = await agentFor();
    const slot = futureSlot();
    const notASlot = new Date(slot.startAt.getTime() + 30 * 60000).toISOString();
    const res = await agent.post('/api/appointments').send({ startAt: notASlot });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_A_SLOT');
  });

  it('refuse un créneau passé (422 TOO_LATE)', async () => {
    const { agent } = await agentFor();
    const past = consultationDatesBetween(
      localDateString(new Date(Date.now() - 14 * DAY)),
      localDateString(new Date(Date.now() - 7 * DAY))
    )[0];
    const slot = slotsForDate(past.year, past.month, past.day)[3];
    const res = await agent
      .post('/api/appointments')
      .send({ startAt: slot.startAt.toISOString() });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('TOO_LATE');
  });

  it('refuse un mercredi fermé (422 DAY_CLOSED)', async () => {
    const { agent } = await agentFor();
    const slot = futureSlot(2);
    const dateStr = localDateString(slot.startAt);
    await prisma.closedDay.create({
      data: { date: new Date(`${dateStr}T00:00:00.000Z`), reason: CLOSED_REASON },
    });
    const res = await agent
      .post('/api/appointments')
      .send({ startAt: slot.startAt.toISOString() });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('DAY_CLOSED');
  });

  it('refuse un 2e rendez-vous le même mercredi (409 ONE_PER_WEDNESDAY)', async () => {
    const { agent } = await agentFor();
    const dates = futureDates();
    const d = dates[1];
    const slots = slotsForDate(d.year, d.month, d.day);
    await agent.post('/api/appointments').send({ startAt: slots[2].startAt.toISOString() });
    const res = await agent
      .post('/api/appointments')
      .send({ startAt: slots[4].startAt.toISOString() });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ONE_PER_WEDNESDAY');
  });

  it('refuse deux réservations concurrentes du même créneau (409 SLOT_ALREADY_BOOKED)', async () => {
    const a = await agentFor();
    const b = await agentFor();
    const slot = futureSlot(3);
    const body = { startAt: slot.startAt.toISOString() };
    const [r1, r2] = await Promise.all([
      a.agent.post('/api/appointments').send(body),
      b.agent.post('/api/appointments').send(body),
    ]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([201, 409]);
    const conflict = [r1, r2].find((r) => r.status === 409);
    expect(conflict.body.error.code).toBe('SLOT_ALREADY_BOOKED');
  });
});

describe('GET /api/slots', () => {
  it('marque un créneau réservé comme indisponible', async () => {
    const { agent } = await agentFor();
    const slot = futureSlot(1, 1);
    await agent.post('/api/appointments').send({ startAt: slot.startAt.toISOString() });

    const res = await request(app).get('/api/slots');
    expect(res.status).toBe(200);
    const all = res.body.days.flatMap((day) => day.slots);
    const booked = all.find((s) => s.startAt === slot.startAt.toISOString());
    expect(booked?.available).toBe(false);
  });
});

describe('PATCH /api/appointments/:id/cancel', () => {
  it('annule son propre rendez-vous à venir (200)', async () => {
    const { agent } = await agentFor();
    const slot = futureSlot(1, 5);
    const created = await agent
      .post('/api/appointments')
      .send({ startAt: slot.startAt.toISOString() });
    const res = await agent.patch(`/api/appointments/${created.body.appointment.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('CANCELLED');
  });

  it('refuse d’annuler le rendez-vous d’un autre (403)', async () => {
    const owner = await agentFor();
    const other = await agentFor();
    const slot = futureSlot(2, 1);
    const created = await owner.agent
      .post('/api/appointments')
      .send({ startAt: slot.startAt.toISOString() });
    const res = await other.agent.patch(
      `/api/appointments/${created.body.appointment.id}/cancel`
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('refuse l’annulation à moins de 24 h (422 TOO_LATE)', async () => {
    const { agent, id } = await agentFor();
    const past = consultationDatesBetween(
      localDateString(new Date(Date.now() - 14 * DAY)),
      localDateString(new Date(Date.now() - 7 * DAY))
    )[0];
    const start = slotsForDate(past.year, past.month, past.day)[3].startAt;
    const appointment = await prisma.appointment.create({
      data: { userId: id, startAt: start, endAt: slotEnd(start) },
    });
    const res = await agent.patch(`/api/appointments/${appointment.id}/cancel`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('TOO_LATE');
  });
});
