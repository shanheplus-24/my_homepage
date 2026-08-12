import { spawnSync } from 'node:child_process';

for (const command of ['check', 'build']) {
  const result = spawnSync(
    process.execPath,
    ['./node_modules/astro/bin/astro.mjs', command],
    {
    shell: false,
    stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
