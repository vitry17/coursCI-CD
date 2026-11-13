// Enveloppe un handler async : toute erreur rejetée est transmise à next(),
// donc au middleware d'erreurs (Express 4 ne capte pas les rejets async seul).
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
