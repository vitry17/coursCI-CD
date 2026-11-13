import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';

afterAll(() => prisma.$disconnect());

describe('Droits du rôle serveur Supabase', () => {
  it('autorise le CRUD applicatif sans donner accès aux migrations ou au DDL', async () => {
    if (!new URL(process.env.DATABASE_URL || '').pathname.endsWith('_test')) {
      throw new Error('Une base dédiée _test est obligatoire.');
    }
    const role =
      await prisma.$queryRaw`SELECT rolname FROM pg_roles WHERE rolname = 'naturo_app'`;
    expect(role).toHaveLength(1);
    const email = randomUUID() + '@example.test';
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL ROLE naturo_app');
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: 'test-only',
          firstName: 'Test',
          lastName: 'Role',
          phone: '',
        },
      });
      expect(
        await tx.user.findUnique({ where: { id: user.id } })
      ).not.toBeNull();
      expect(
        (
          await tx.user.update({
            where: { id: user.id },
            data: { firstName: 'Updated' },
          })
        ).firstName
      ).toBe('Updated');
      await tx.user.delete({ where: { id: user.id } });
      const [permissions] = await tx.$queryRaw`
        SELECT has_schema_privilege(current_user, 'public', 'CREATE') AS can_create,
          has_table_privilege(current_user, 'public._prisma_migrations', 'SELECT') AS can_read_migrations,
          pg_has_role(current_user, 'naturo_migrator', 'MEMBER') AS is_migrator
      `;
      expect(permissions).toEqual({
        can_create: false,
        can_read_migrations: false,
        is_migrator: false,
      });
    });
  });
});
