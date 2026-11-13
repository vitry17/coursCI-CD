import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateSlotsQuery } from '../lib/validate.js';
import { config } from '../config.js';
import {
  consultationDatesBetween,
  slotsForDate,
  formatDate,
  localDateString,
  localToUtc,
} from '../lib/schedule.js';

const router = Router();
const DAY_MS = 86400000;

const utcMidnight = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);
const isoDateUtc = (date) => date.toISOString().slice(0, 10);

// GET /api/slots?from=AAAA-MM-JJ&to=AAAA-MM-JJ (public)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { from, to } = validateSlotsQuery(req.query);
    const now = new Date();
    const fromStr = from || localDateString(now);
    const toStr =
      to || localDateString(new Date(now.getTime() + config.bookingMaxWeeks * 7 * DAY_MS));

    const dates = consultationDatesBetween(fromStr, toStr);
    if (dates.length === 0) {
      res.json({ days: [] });
      return;
    }

    const first = dates[0];
    const last = dates[dates.length - 1];
    const rangeStart = localToUtc(first.year, first.month, first.day, 0, 0);
    const rangeEnd = localToUtc(last.year, last.month, last.day + 1, 0, 0);

    const [booked, closed] = await Promise.all([
      prisma.appointment.findMany({
        where: { status: 'BOOKED', startAt: { gte: rangeStart, lt: rangeEnd } },
        select: { startAt: true },
      }),
      prisma.closedDay.findMany({
        where: { date: { gte: utcMidnight(fromStr), lte: utcMidnight(toStr) } },
        select: { date: true, reason: true },
      }),
    ]);

    const bookedSet = new Set(booked.map((appointment) => appointment.startAt.getTime()));
    const closedMap = new Map(closed.map((day) => [isoDateUtc(day.date), day.reason]));

    const days = dates.map(({ year, month, day }) => {
      const dateStr = formatDate(year, month, day);
      if (closedMap.has(dateStr)) {
        return { date: dateStr, closed: true, reason: closedMap.get(dateStr) ?? null, slots: [] };
      }
      const slots = slotsForDate(year, month, day).map(({ startAt, endAt }) => ({
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        available: !bookedSet.has(startAt.getTime()),
      }));
      return { date: dateStr, closed: false, slots };
    });

    res.json({ days });
  })
);

export default router;
