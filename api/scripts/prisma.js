import '../src/config.js';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const result = spawnSync(
  process.execPath,
  [require.resolve('prisma/build/index.js'), ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL },
  }
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
