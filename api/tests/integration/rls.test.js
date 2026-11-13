import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

it('empêche un rôle public de lire les patients même avec un droit SELECT', async () => {
  if (!new URL(process.env.DATABASE_URL || '').pathname.endsWith('_test')) {
    throw new Error('Une base dédiée _test est obligatoire.');
  }
  const role = 'rls_test_' + randomUUID().replaceAll('-', '');
  let user;
  let created = false;
  try {
    user = await prisma.user.create({
      data: {
        email: randomUUID() + '@example.test',
        passwordHash: 'private-hash',
        firstName: 'Private',
        lastName: 'Patient',
        phone: '0600000000',
      },
    });
    // Identifier generated locally from a UUID, never from user input.
    await prisma.$executeRawUnsafe('CREATE ROLE "' + role + '" NOLOGIN');
    created = true;
    await prisma.$executeRawUnsafe(
      'GRANT USAGE ON SCHEMA public TO "' + role + '"'
    );
    await prisma.$executeRawUnsafe(
      'GRANT SELECT ON users, appointments, closed_days TO "' + role + '"'
    );
    const visible = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE "' + role + '"');
      return tx.user.findMany({ where: { id: user.id } });
    });
    expect(visible).toEqual([]);
    expect(
      await prisma.user.findUnique({ where: { id: user.id } })
    ).not.toBeNull();
  } finally {
    if (created) {
      await prisma.$executeRawUnsafe('DROP OWNED BY "' + role + '"');
      await prisma.$executeRawUnsafe('DROP ROLE "' + role + '"');
    }
    if (user) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  }
});
