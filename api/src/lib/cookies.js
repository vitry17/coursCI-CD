import { durationToSeconds } from './jwt.js';
import { config } from '../config.js';

export const TOKEN_COOKIE = 'token';

const isProd = process.env.NODE_ENV === 'production';

// Cookie de session : httpOnly (inaccessible au JS), SameSite Lax, Secure en prod.
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  path: '/',
  maxAge: durationToSeconds(config.jwtExpiresIn) * 1000,
};

// Petit parseur de cookies (remplace cookie-parser, pas de dépendance).
export function parseCookies(req) {
  const header = req.headers?.cookie;
  const jar = {};
  if (!header) return jar;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) jar[key] = decodeURIComponent(value);
  }
  return jar;
}

export function cookieParser(req, _res, next) {
  req.cookies = parseCookies(req);
  next();
}
