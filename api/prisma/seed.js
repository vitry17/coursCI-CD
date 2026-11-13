import { prisma } from '../src/lib/prisma.js';
import { seedAdmin } from './admin.js';
try {
  await seedAdmin(prisma);
  console.log('Compte administrateur initialisé.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
