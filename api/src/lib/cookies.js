import createCookieParser from 'cookie-parser';
import { durationToSeconds } from './jwt.js';
import { config } from '../config.js';

export const TOKEN_COOKIE = 'token';

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: durationToSeconds(config.jwtExpiresIn) * 1000,
};

export const cookieParser = createCookieParser();
