import '../src/config.js';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

// Feature previews build without mutating the shared staging database.
const isStaging =
  process.env.VERCEL === '1' &&
  process.env.VERCEL_ENV === 'preview' &&
  process.env.VERCEL_GIT_COMMIT_REF === 'dev';

if (isStaging) {
  if (!process.env.DIRECT_URL) {
    console.error('DIRECT_URL est obligatoire pour migrer la base de staging.');
    process.exitCode = 1;
  } else {
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(new URL('./prisma.js', import.meta.url)),
        'migrate',
        'deploy',
      ],
      {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        env: process.env,
        stdio: 'inherit',
      }
    );
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status ?? 1;
  }
} else {
  console.log(
    'Migrations staging ignorées : ce build ne correspond pas à dev/preview.'
  );
}
