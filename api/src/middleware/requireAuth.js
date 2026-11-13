import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/jwt.js';
import { TOKEN_COOKIE } from '../lib/cookies.js';
import { Errors } from '../lib/errors.js';

// Exige un utilisateur connecté. Lit le cookie JWT, le vérifie, recharge
// l'utilisateur en base (pour avoir un rôle à jour et confirmer son existence).
export async function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[TOKEN_COOKIE];
    if (!token) throw Errors.unauthenticated();

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw Errors.unauthenticated('Session invalide.');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw Errors.unauthenticated('Session invalide.');

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
