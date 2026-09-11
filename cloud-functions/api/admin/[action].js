import { handleAdmin } from '../../../scripts/admin/handler.mjs';
import snapshot from '../../../scripts/admin/snapshot.generated.mjs';

// Password derivation and repository writes require the complete Node runtime.
// EdgeOne Cloud Functions preserve the existing /api/admin/* URLs and variables.
export const onRequest = ({ request, env }) => handleAdmin(request, { ...process.env, ...(env ?? {}) }, { snapshot: () => snapshot });
export default onRequest;
