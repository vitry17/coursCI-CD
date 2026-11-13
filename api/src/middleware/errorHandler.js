import { AppError } from '../lib/errors.js';

// Route inconnue sous /api -> 404 au format commun.
export function notFound(_req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
  });
}

// Middleware d'erreurs final (4 arguments obligatoires pour Express).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details) body.error.details = err.details;
    return res.status(err.status).json(body);
  }
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erreur serveur.' },
  });
}
