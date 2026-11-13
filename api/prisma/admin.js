import { Buffer } from 'node:buffer';
import bcrypt from 'bcrypt';

export async function seedAdmin(prisma, env = process.env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL doit être une adresse email valide.');
  }
  if (
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new Error(
      'ADMIN_PASSWORD doit contenir au moins 12 caractères et au plus 72 octets.'
    );
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN') {
    throw new Error(
      'Cet email appartient déjà à un patient : promotion automatique refusée.'
    );
  }
  if (existing) return existing;
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      firstName: env.ADMIN_FIRST_NAME || 'Admin',
      lastName: env.ADMIN_LAST_NAME || 'Naturopathe',
      phone: env.ADMIN_PHONE || '',
      role: 'ADMIN',
    },
  });
}
