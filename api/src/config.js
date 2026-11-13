import dotenv from 'dotenv';
import { fileURLToPath, URL } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

// "09:00-12:00,14:00-18:00" -> [{ start:{h,m}, end:{h,m} }, ...]
function parseOpeningHours(value) {
  return value
    .split(',')
    .map((range) => range.trim())
    .filter(Boolean)
    .map((range) => {
      const [start, end] = range.split('-');
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return { start: { h: sh, m: sm }, end: { h: eh, m: em } };
    });
}

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Paramètres de planning (lot 4) — jamais de valeurs en dur dans le code.
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  consultationDow: Number(process.env.CONSULTATION_DOW ?? 3), // 0=dimanche, 3=mercredi
  openingHours: parseOpeningHours(
    process.env.OPENING_HOURS || '09:00-12:00,14:00-18:00'
  ),
  slotDurationMin: Number(process.env.SLOT_DURATION_MIN || 60),
  bookingMinNoticeH: Number(process.env.BOOKING_MIN_NOTICE_H || 24),
  bookingMaxWeeks: Number(process.env.BOOKING_MAX_WEEKS || 8),
};
