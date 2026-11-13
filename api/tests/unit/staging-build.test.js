import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(
  new URL('../../scripts/migrate-staging.js', import.meta.url)
);
function run(env) {
  return spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL: '1',
      VERCEL_ENV: 'preview',
      VERCEL_GIT_COMMIT_REF: 'dev',
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid',
      DIRECT_URL: '',
      ...env,
    },
  });
}

describe('Migrations Vercel', () => {
  it('bloque le staging sans connexion dédiée aux migrations', () => {
    const result = run({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DIRECT_URL');
    expect(result.stderr).not.toContain('postgresql://');
  });
  it.each([
    { VERCEL_GIT_COMMIT_REF: 'feature/test' },
    { VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main' },
    { VERCEL: '' },
  ])('ne touche pas à la base hors staging (%j)', (env) => {
    const result = run(env);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('ignorées');
  });
});
