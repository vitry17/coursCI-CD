import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import express from 'express';
import request from 'supertest';
import { config } from '../../src/config.js';
import { signToken, verifyToken, durationToSeconds } from '../../src/lib/jwt.js';
import { validateRegister, validateLogin } from '../../src/lib/validate.js';
import { createRateLimit } from '../../src/middleware/rateLimit.js';
import { requireRole } from '../../src/middleware/requireRole.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';

const originalSecret = config.jwtSecret;
afterEach(() => {
  config.jwtSecret = originalSecret;
  vi.useRealTimers();
});

describe('JWT', () => {
  it('refuse une clé absente, trop courte ou celle du fichier exemple', () => {
    for (const value of [undefined, 'short', 'change_me_32_chars_minimum_secret']) {
      config.jwtSecret = value;
      expect(() => signToken({ sub: randomUUID() })).toThrow('JWT_SECRET');
    }
  });

  it('expire exactement à exp et refuse une signature altérée', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = signToken({ sub: randomUUID() }, '1s');
    expect(verifyToken(token).sub).toBeTruthy();
    expect(() => verifyToken(token.slice(0, -3) + 'xxx')).toThrow();
    vi.advanceTimersByTime(1000);
    expect(() => verifyToken(token)).toThrow();
  });

  it('refuse les claims incomplets, futurs ou un autre algorithme', () => {
    const sub = randomUUID();
    const exp = Math.floor(Date.now() / 1000) + 3600;
    for (const claims of [{ sub }, { exp }, { sub: 'invalid', exp }, { sub, exp, nbf: exp }]) {
      expect(() => verifyToken(jwt.sign(claims, config.jwtSecret))).toThrow();
    }
    expect(() => verifyToken(jwt.sign({ sub, exp }, config.jwtSecret, { algorithm: 'HS384' }))).toThrow();
  });

  it('refuse les durées invalides au lieu de choisir une valeur par défaut', () => {
    for (const value of ['wrong', '0s', '-1', Infinity]) {
      expect(() => durationToSeconds(value)).toThrow();
    }
    expect(durationToSeconds('30m')).toBe(1800);
  });
});

describe('Validation', () => {
  it('refuse les mots de passe tronqués par bcrypt en comptant les octets UTF-8', () => {
    for (const password of ['a1' + 'a'.repeat(71), 'a1' + 'é'.repeat(36)]) {
      expect(() => validateLogin({ email: 'test@example.com', password })).toThrow();
    }
  });

  it('normalise les champs et ignore tout rôle fourni par le client', () => {
    const value = validateRegister({
      firstName: ' Léa ', lastName: ' Martin ', email: ' LEA@EXAMPLE.COM ',
      phone: '0612345678', password: 'motdepasse1', role: 'ADMIN',
    });
    expect(value).toMatchObject({ firstName: 'Léa', email: 'lea@example.com' });
    expect(value.role).toBeUndefined();
  });
});

describe('Protection HTTP', () => {
  it('limite réellement les requêtes, y compris en environnement test', async () => {
    const app = express();
    app.use(createRateLimit({ windowMs: 60_000, max: 2 }));
    app.get('/', (_req, res) => res.sendStatus(200));
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    const blocked = await request(app).get('/');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('réserve les routes administrateur au rôle ADMIN', async () => {
    const app = express();
    app.get('/:role', (req, _res, next) => {
      req.user = { role: req.params.role };
      next();
    }, requireRole('ADMIN'), (_req, res) => res.sendStatus(200));
    app.use(errorHandler);
    expect((await request(app).get('/PATIENT')).status).toBe(403);
    expect((await request(app).get('/ADMIN')).status).toBe(200);
  });
});
