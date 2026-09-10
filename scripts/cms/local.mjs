import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT } from '../publications/store.mjs';

// Decap filesystem mode saves only edited entries/assets, without creating commits.
const child = spawn(process.execPath, [resolve(ROOT, 'node_modules/decap-server/dist/index.js')], {
  cwd: ROOT, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, MODE: 'fs', PORT: '8082', BIND_HOST: '127.0.0.1', GIT_REPO_DIRECTORY: process.env.CMS_LOCAL_ROOT || ROOT },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill());
child.on('exit', (code) => { process.exitCode = code ?? 0; });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
