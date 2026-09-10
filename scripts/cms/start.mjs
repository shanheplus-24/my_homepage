import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { dev } from 'astro';
import { ROOT } from '../publications/store.mjs';

const cms = spawn(process.execPath, [resolve(ROOT, 'node_modules/decap-server/dist/index.js')], {
  cwd: ROOT, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, MODE: 'fs', PORT: '8082', BIND_HOST: '127.0.0.1', GIT_REPO_DIRECTORY: ROOT },
});
let server;
let stopping = false;
async function stop() { if (stopping) return; stopping = true; cms.kill(); await server?.stop(); }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
cms.on('exit', (code) => { if (!stopping) { process.exitCode = code ?? 0; stop(); } });
cms.on('error', (error) => { console.error(error.message); process.exitCode = 1; stop(); });
try {
  // Calling the API keeps both services under this process, even in environments
  // where the Astro CLI automatically starts a detached background server.
  server = await dev({ root: ROOT, server: { host: '127.0.0.1', port: 4321 } });
  if (stopping) await server.stop();
  else console.log(`Publication editor: http://127.0.0.1:${server.address.port}/admin/publications/`);
} catch (error) {
  console.error(error.message); process.exitCode = 1; await stop();
}
