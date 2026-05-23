import { spawnSync } from 'node:child_process';

const mode = process.argv[2] || 'site';
const allowedModes = new Set(['site', 'maintenance']);

if (!allowedModes.has(mode)) {
  console.error(`Unknown build mode: ${mode}`);
  console.error('Use "site" or "maintenance".');
  process.exit(1);
}

const env = {
  ...process.env,
  SITE_URL: process.env.SITE_URL || 'https://www.shanheplus.com',
};

if (mode === 'maintenance') {
  env.PUBLIC_MAINTENANCE_MODE = 'true';
} else {
  delete env.PUBLIC_MAINTENANCE_MODE;
}

const result = spawnSync(process.execPath, ['./node_modules/astro/bin/astro.mjs', 'build'], {
  env,
  shell: false,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);

