import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
router.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', db: 'error' });
  }
});
export default router;
