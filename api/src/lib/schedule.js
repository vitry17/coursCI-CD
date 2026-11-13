// Service de créneaux. Toutes les heures d'ouverture sont en heure locale
// (Europe/Paris) ; les instants renvoyés / stockés sont en UTC. La conversion
// gère le passage heure d'été / hiver via l'API Intl (aucune dépendance).
import { config } from '../config.js';

const TZ = config.timezone;
const WEDNESDAY = config.consultationDow;
const DAY_MS = 86400000;

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour12: false,
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function partsOf(instant) {
  const map = {};
  for (const part of partsFormatter.formatToParts(new Date(instant))) {
    map[part.type] = part.value;
  }
  return map;
}

// Décalage (ms) entre l'heure locale TZ et UTC à un instant donné.
function tzOffsetMs(instant) {
  const map = partsOf(instant);
  const asUtc = Date.UTC(
    +map.year,
    +map.month - 1,
    +map.day,
    +map.hour,
    +map.minute,
    +map.second
  );
  return asUtc - instant;
}

// Heure locale TZ (année, mois 1-12, jour, h, min) -> instant UTC.
export function localToUtc(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(guess);
  let utc = guess - offset;
  const offset2 = tzOffsetMs(utc); // raffinage autour des bascules DST
  if (offset2 !== offset) utc = guess - offset2;
  return new Date(utc);
}

// Composantes locales TZ d'un instant.
export function localParts(instant) {
  const map = partsOf(instant);
  return {
    year: +map.year,
    month: +map.month,
    day: +map.day,
    hour: +map.hour,
    minute: +map.minute,
    weekday: WEEKDAY_INDEX[map.weekday],
  };
}

export function formatDate(year, month, day) {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// Heures de début de créneau (locales) déduites des plages d'ouverture.
export function slotStartTimes() {
  const starts = [];
  const duration = config.slotDurationMin;
  for (const range of config.openingHours) {
    let minutes = range.start.h * 60 + range.start.m;
    const endMinutes = range.end.h * 60 + range.end.m;
    while (minutes + duration <= endMinutes) {
      starts.push({ h: Math.floor(minutes / 60), m: minutes % 60 });
      minutes += duration;
    }
  }
  return starts;
}

export function slotEnd(startAt) {
  return new Date(startAt.getTime() + config.slotDurationMin * 60000);
}

// Vrai si (year, month, day) est le jour de consultation (mercredi).
export function isConsultationDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === WEDNESDAY;
}

// Créneaux (UTC) d'une date de consultation donnée.
export function slotsForDate(year, month, day) {
  return slotStartTimes().map(({ h, m }) => {
    const startAt = localToUtc(year, month, day, h, m);
    return { startAt, endAt: slotEnd(startAt) };
  });
}

// Liste des dates de consultation (mercredis) entre deux dates AAAA-MM-JJ incluses.
export function consultationDatesBetween(fromStr, toStr) {
  const [fy, fm, fd] = fromStr.split('-').map(Number);
  const [ty, tm, td] = toStr.split('-').map(Number);
  const end = Date.UTC(ty, tm - 1, td);
  const dates = [];
  for (let t = Date.UTC(fy, fm - 1, fd); t <= end; t += DAY_MS) {
    const d = new Date(t);
    if (d.getUTCDay() === WEDNESDAY) {
      dates.push({
        year: d.getUTCFullYear(),
        month: d.getUTCMonth() + 1,
        day: d.getUTCDate(),
      });
    }
  }
  return dates;
}

// Date locale (AAAA-MM-JJ) d'un instant.
export function localDateString(instant) {
  const p = localParts(instant);
  return formatDate(p.year, p.month, p.day);
}

// Plage UTC [début, fin[ du jour local contenant `instant`.
export function localDayRange(instant) {
  const p = localParts(instant);
  return {
    dateStr: formatDate(p.year, p.month, p.day),
    dayStart: localToUtc(p.year, p.month, p.day, 0, 0),
    dayEnd: localToUtc(p.year, p.month, p.day + 1, 0, 0),
  };
}

// Un instant correspond-il exactement à un début de créneau un mercredi ?
export function isValidSlotStart(startAt) {
  const p = localParts(startAt);
  if (p.weekday !== WEDNESDAY) return false;
  const matches = slotStartTimes().some((s) => s.h === p.hour && s.m === p.minute);
  if (!matches) return false;
  // Garde-fou DST : l'instant canonique doit coïncider.
  return localToUtc(p.year, p.month, p.day, p.hour, p.minute).getTime() === startAt.getTime();
}

// 'TOO_LATE' si trop proche (< délai) / passé / au-delà de la fenêtre, sinon null.
export function bookingWindowError(startAt, now = new Date()) {
  const noticeMs = config.bookingMinNoticeH * 3600000;
  const maxMs = config.bookingMaxWeeks * 7 * DAY_MS;
  const t = startAt.getTime();
  if (t < now.getTime() + noticeMs) return 'TOO_LATE';
  if (t > now.getTime() + maxMs) return 'TOO_LATE';
  return null;
}
