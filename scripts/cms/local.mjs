import { startAdmin } from '../admin/local-server.mjs';
await startAdmin();
console.log('Authenticated local admin API: http://127.0.0.1:8082');
