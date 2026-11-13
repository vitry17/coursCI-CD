import { describe, it, expect } from 'vitest';
import {
  slotStartTimes,
  slotsForDate,
  isValidSlotStart,
  bookingWindowError,
  consultationDatesBetween,
} from '../../src/lib/schedule.js';

describe('Génération des créneaux', () => {
  it('produit 7 créneaux d’une heure (9,10,11,14,15,16,17)', () => {
    expect(slotStartTimes()).toHaveLength(7);
    expect(slotsForDate(2026, 10, 7)).toHaveLength(7);
  });

  it('gère l’heure d’été : mercredi 7 oct. 2026, 9h Paris = 07:00 UTC', () => {
    const slots = slotsForDate(2026, 10, 7);
    expect(slots[0].startAt.toISOString()).toBe('2026-10-07T07:00:00.000Z');
    expect(slots[0].endAt.toISOString()).toBe('2026-10-07T08:00:00.000Z');
    expect(slots[6].startAt.toISOString()).toBe('2026-10-07T15:00:00.000Z'); // 17h Paris
  });

  it('gère l’heure d’hiver : mercredi 7 janv. 2026, 9h Paris = 08:00 UTC', () => {
    const slots = slotsForDate(2026, 1, 7);
    expect(slots[0].startAt.toISOString()).toBe('2026-01-07T08:00:00.000Z');
  });
});

describe('Validation d’un créneau', () => {
  it('accepte un vrai début de créneau un mercredi', () => {
    expect(isValidSlotStart(new Date('2026-10-07T07:00:00.000Z'))).toBe(true);
  });

  it('refuse un horaire hors grille', () => {
    expect(isValidSlotStart(new Date('2026-10-07T07:30:00.000Z'))).toBe(false);
  });

  it('refuse un autre jour que le mercredi', () => {
    expect(isValidSlotStart(new Date('2026-10-08T07:00:00.000Z'))).toBe(false);
  });
});

describe('Fenêtre de réservation', () => {
  const now = new Date('2026-10-01T00:00:00.000Z');

  it('accepte un créneau entre 24 h et 8 semaines', () => {
    expect(bookingWindowError(new Date('2026-10-07T07:00:00.000Z'), now)).toBeNull();
  });

  it('refuse à moins de 24 h (TOO_LATE)', () => {
    expect(bookingWindowError(new Date('2026-10-01T06:00:00.000Z'), now)).toBe('TOO_LATE');
  });

  it('refuse au-delà de 8 semaines (TOO_LATE)', () => {
    expect(bookingWindowError(new Date('2026-12-15T07:00:00.000Z'), now)).toBe('TOO_LATE');
  });
});

describe('consultationDatesBetween', () => {
  it('ne renvoie que des mercredis', () => {
    const dates = consultationDatesBetween('2026-10-01', '2026-10-31');
    expect(dates.map((d) => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`)).toEqual([
      '2026-10-07',
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ]);
  });
});
