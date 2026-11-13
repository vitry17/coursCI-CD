import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { validateRegister, validateLogin } from '../lib/validate.js';
import { signToken } from '../lib/jwt.js';
import { TOKEN_COOKIE, cookieOptions } from '../lib/cookies.js';
import { toPublicUser } from '../lib/userView.js';
import { Errors } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createRateLimit } from '../middleware/rateLimit.js';

const router = Router();
const SALT_ROUNDS = 10;

const loginLimiter = createRateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

function setSession(res, user) {
  res.cookie(TOKEN_COOKIE, signToken({ sub: user.id, role: user.role }), cookieOptions);
}

// POST /api/auth/register (public)
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = validateRegister(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw Errors.emailTaken();

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash,
      },
    });

    setSession(res, user);
    res.status(201).json({ user: toPublicUser(user) });
  })
);

// POST /api/auth/login (public)
router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const data = validateLogin(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    // Message identique que l'email existe ou non (anti-énumération).
    const ok = user && (await bcrypt.compare(data.password, user.passwordHash));
    if (!ok) throw Errors.invalidCredentials();

    setSession(res, user);
    res.json({ user: toPublicUser(user) });
  })
);

// POST /api/auth/logout : idempotent, même après expiration.
router.post('/logout', (_req, res) => {
  res.clearCookie(TOKEN_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

// GET /api/auth/me (connecté)
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

export default router;
