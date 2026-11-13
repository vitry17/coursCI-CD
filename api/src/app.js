import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { assertJwtConfiguration } from './lib/jwt.js';
import { cookieParser } from './lib/cookies.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import slotsRouter from './routes/slots.js';
import appointmentsRouter from './routes/appointments.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

assertJwtConfiguration();
const app = express();
// Vercel remplace X-Forwarded-For par l'IP du client. Aucun proxy local implicite.
if (process.env.VERCEL === '1') app.set('trust proxy', 1);

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser);

app.use('/api', healthRouter);
app.use('/api/auth', noStore, authRouter);
app.use('/api/users', noStore, usersRouter);
app.use('/api/slots', slotsRouter);
app.use('/api/appointments', noStore, appointmentsRouter);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
