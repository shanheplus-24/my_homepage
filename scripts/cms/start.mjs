import { startAdmin } from '../admin/local-server.mjs';
import { dev } from 'astro';
import { ROOT } from '../publications/store.mjs';

const cms = await startAdmin();
let server;
let stopping = false;
async function stop() { if (stopping) return; stopping = true; cms.close(); await server?.stop(); }
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, stop);
try {
  // Calling the API keeps both services under this process, even in environments
  // where the Astro CLI automatically starts a detached background server.
  server = await dev({ root: ROOT, server: { host: '127.0.0.1', port: 4321 } });
  if (stopping) await server.stop();
  else console.log(`Authenticated site editor: http://127.0.0.1:${server.address.port}/admin/publications/`);
} catch (error) {
  console.error(error.message); process.exitCode = 1; await stop();
}
