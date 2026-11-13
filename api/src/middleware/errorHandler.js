import { AppError, Errors } from '../lib/errors.js';

export function notFound(_req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err?.code === 'P2002' && err.meta?.target?.includes('email')) {
    err = Errors.emailTaken();
  }
  if (err?.type === 'entity.parse.failed') {
    err = Errors.validation([{ field: 'body', message: 'JSON invalide.' }]);
  }
  if (err?.type === 'entity.too.large') {
    err = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Requête trop volumineuse.');
  }
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
