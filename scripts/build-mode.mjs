import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const mode = args[0] || 'site';
const shouldDeploy = args.includes('--deploy');
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

const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, {
    env,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run(process.execPath, ['./node_modules/astro/bin/astro.mjs', 'build']);

if (shouldDeploy) {
  run(process.execPath, [
    './node_modules/wrangler/bin/wrangler.js',
    'pages',
    'deploy',
    'dist',
    '--project-name',
    'shanheplus-personal-page',
    '--branch',
    'main',
  ]);
}
