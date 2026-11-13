// JWT HS256 minimal, basé sur le module natif `crypto` (aucune dépendance).
// Suffisant pour le périmètre du cours : signature HMAC-SHA256 + exp.
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { config } from '../config.js';

const SECRET = config.jwtSecret || 'dev-insecure-secret-change-me';

function base64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

// '24h' -> 86400, '30m' -> 1800, '45s' -> 45, '7d' -> 604800, '3600' -> 3600
export function durationToSeconds(value) {
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*([smhd])?$/.exec(String(value).trim());
  if (!match) return 86400;
  const amount = Number(match[1]);
  const unit = match[2] || 's';
  const factor = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return amount * factor;
}

export function signToken(payload, expiresIn = config.jwtExpiresIn) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + durationToSeconds(expiresIn) };
  const header = base64urlJson({ alg: 'HS256', typ: 'JWT' });
  const data = `${header}.${base64urlJson(body)}`;
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token) {
  const parts = String(token).split('.');
  if (parts.length !== 3) throw new Error('Token malformé');
  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  const given = Buffer.from(signature);
  const good = Buffer.from(expected);
  if (given.length !== good.length || !crypto.timingSafeEqual(given, good)) {
    throw new Error('Signature invalide');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded.exp && Math.floor(Date.now() / 1000) > decoded.exp) {
    throw new Error('Token expiré');
  }
  return decoded;
}
