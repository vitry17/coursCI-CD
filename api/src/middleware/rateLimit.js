import { rateLimit } from 'express-rate-limit';

// Compteurs par instance : prévoir un store partagé avant une mise en production
// sur plusieurs instances. Le limiteur reste actif pendant les tests.
export function createRateLimit({ windowMs, max }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Trop de tentatives, réessayez plus tard.',
      },
    },
  });
}
