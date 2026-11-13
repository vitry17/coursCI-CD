import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateBooking } from '../lib/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { AppError, Errors } from '../lib/errors.js';
import { config } from '../config.js';
import { toPublicAppointment } from '../lib/appointmentView.js';
import {
  isValidSlotStart,
  bookingWindowError,
  slotEnd,
  localDayRange,
} from '../lib/schedule.js';

const router = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const utcMidnight = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);

// POST /api/appointments (patient)
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { startAt: startStr, reason } = validateBooking(req.body);
    const startAt = new Date(startStr);

    if (!isValidSlotStart(startAt)) {
      throw new AppError(422, 'NOT_A_SLOT', "Ce créneau n'existe pas.");
    }
    if (bookingWindowError(startAt)) {
      throw new AppError(422, 'TOO_LATE', 'Réservation hors délai (de 24 h à 8 semaines).');
    }

    const { dayStart, dayEnd, dateStr } = localDayRange(startAt);

    const closed = await prisma.closedDay.findFirst({ where: { date: utcMidnight(dateStr) } });
    if (closed) throw new AppError(422, 'DAY_CLOSED', 'Ce mercredi est fermé.');

    const endAt = slotEnd(startAt);

    try {
      const appointment = await prisma.$transaction(async (tx) => {
        // R4 : un seul rendez-vous par mercredi et par patient.
        const existing = await tx.appointment.findFirst({
          where: {
            userId: req.user.id,
            status: 'BOOKED',
            startAt: { gte: dayStart, lt: dayEnd },
          },
        });
        if (existing) {
          throw new AppError(
            409,
            'ONE_PER_WEDNESDAY',
            'Vous avez déjà un rendez-vous ce mercredi.'
          );
        }
        return tx.appointment.create({
          data: { userId: req.user.id, startAt, endAt, reason: reason || null },
        });
      });
      res.status(201).json({ appointment: toPublicAppointment(appointment) });
    } catch (error) {
      // R1 : créneau déjà pris (index unique partiel).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(409, 'SLOT_ALREADY_BOOKED', "Ce créneau n'est plus disponible.");
      }
      throw error;
    }
  })
);

// GET /api/appointments/me?scope=upcoming|past (patient)
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const past = req.query.scope === 'past';
    const now = new Date();
    const where = past
      ? { userId: req.user.id, startAt: { lt: now } }
      : { userId: req.user.id, status: 'BOOKED', startAt: { gte: now } };

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startAt: past ? 'desc' : 'asc' },
    });
    res.json({ appointments: appointments.map(toPublicAppointment) });
  })
);

// PATCH /api/appointments/:id/cancel (patient)
router.patch(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) throw Errors.notFound('Rendez-vous introuvable.');

    const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!appointment) throw Errors.notFound('Rendez-vous introuvable.');
    if (appointment.userId !== req.user.id) throw Errors.forbidden();
    if (appointment.status === 'CANCELLED') {
      res.json({ appointment: toPublicAppointment(appointment) });
      return;
    }

    // R6 : annulation possible jusqu'à 24 h avant le début.
    const noticeMs = config.bookingMinNoticeH * 3600000;
    if (appointment.startAt.getTime() - Date.now() < noticeMs) {
      throw new AppError(422, 'TOO_LATE', 'Annulation impossible à moins de 24 h du rendez-vous.');
    }

    const updated = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'PATIENT' },
    });
    res.json({ appointment: toPublicAppointment(updated) });
  })
);

export default router;
