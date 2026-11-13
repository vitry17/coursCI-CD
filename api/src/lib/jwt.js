import jwt from 'jsonwebtoken';
import { Buffer } from 'node:buffer';
import { config } from '../config.js';

function secret() {
  if (!config.jwtSecret || Buffer.byteLength(config.jwtSecret, 'utf8') < 32 ||
      config.jwtSecret === 'change_me_32_chars_minimum_secret') {
    throw new Error('JWT_SECRET doit contenir au moins 32 octets aléatoires.');
  }
  return config.jwtSecret;
}

export function durationToSeconds(value) {
  const match = /^(\d+)\s*([smhd])?$/.exec(String(value).trim());
  if (!match) throw new Error('JWT_EXPIRES_IN invalide.');
  const seconds = Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] || 's']);
  if (!Number.isSafeInteger(seconds) || seconds <= 0) throw new Error('JWT_EXPIRES_IN invalide.');
  return seconds;
}

export function signToken(payload, expiresIn = config.jwtExpiresIn) {
  return jwt.sign(payload, secret(), {
    algorithm: 'HS256',
    expiresIn: durationToSeconds(expiresIn),
  });
}

export function verifyToken(token) {
  const payload = jwt.verify(token, secret(), { algorithms: ['HS256'] });
  if (!payload || typeof payload !== 'object' ||
      !Number.isSafeInteger(payload.exp) ||
      typeof payload.sub !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.sub)) {
    throw new Error('Session invalide.');
  }
  return payload;
}

export function assertJwtConfiguration() {
  secret();
  durationToSeconds(config.jwtExpiresIn);
}
