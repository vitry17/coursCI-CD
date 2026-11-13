import { AppError } from '../lib/errors.js';

// Limiteur en mémoire minimal (sans dépendance) pour /auth/login.
// Désactivé en test pour ne pas gêner les suites d'intégration.
export function createRateLimit({ windowMs, max }) {
  const hits = new Map();
  return (req, _res, next) => {
    if (process.env.NODE_ENV === 'test') return next();
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = hits.get(key);
    if (!record || now > record.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    record.count += 1;
    if (record.count > max) {
      return next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Trop de tentatives, réessayez plus tard.'
        )
      );
    }
    next();
  };
}
