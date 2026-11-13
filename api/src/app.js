import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { cookieParser } from './lib/cookies.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser);

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
