import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateProfileUpdate } from '../lib/validate.js';
import { toPublicUser } from '../lib/userView.js';
import { TOKEN_COOKIE, cookieOptions } from '../lib/cookies.js';
import { Errors } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// PATCH /api/users/me (connecté) : modifie prénom / nom / téléphone.
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = validateProfileUpdate(req.body);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    res.json({ user: toPublicUser(user) });
  })
);

// DELETE /api/users/me (connecté) : supprime le compte et ses rendez-vous (R11).
// Interdit pour le compte administrateur.
router.delete(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role === 'ADMIN') {
      throw Errors.forbidden('Le compte administrateur ne peut pas être supprimé.');
    }
    // La suppression du rendez-vous est en cascade (FK ON DELETE CASCADE).
    await prisma.user.delete({ where: { id: req.user.id } });
    res.clearCookie(TOKEN_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.status(204).end();
  })
);

export default router;
