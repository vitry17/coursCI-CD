// Erreur applicative : portée par un statut HTTP, un code métier et un message.
// Le middleware errorHandler la transforme au format { error: { code, message } }.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details) this.details = details;
  }
}

export const Errors = {
  unauthenticated: (message = 'Authentification requise.') =>
    new AppError(401, 'UNAUTHENTICATED', message),
  forbidden: (message = 'Accès refusé.') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Ressource introuvable.') =>
    new AppError(404, 'NOT_FOUND', message),
  emailTaken: () =>
    new AppError(409, 'EMAIL_TAKEN', 'Cet email est déjà utilisé.'),
  invalidCredentials: () =>
    new AppError(401, 'UNAUTHENTICATED', 'Email ou mot de passe incorrect.'),
  validation: (details) =>
    new AppError(400, 'VALIDATION_ERROR', 'Données invalides.', details),
};
