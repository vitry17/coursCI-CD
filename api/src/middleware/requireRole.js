import { Errors } from '../lib/errors.js';

// À utiliser après requireAuth. Refuse (403) si le rôle ne correspond pas.
export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) return next(Errors.forbidden());
    next();
  };
}
