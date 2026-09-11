import { handleAdmin } from '../../../scripts/admin/handler.mjs';
import snapshot from '../../../scripts/admin/snapshot.generated.mjs';

// Password derivation and repository writes require the complete Node runtime.
// EdgeOne Cloud Functions preserve the existing /api/admin/* URLs and variables.
export const onRequest = async ({ request, env }) => {
  // Cloud Functions may expose an internal HTTP URL after TLS termination.
  // Use the site's fixed public origin, never a client-supplied forwarded host.
  const internalUrl = new URL(request.url);
  const publicUrl = new URL('https://www.shanheplus.com');
  publicUrl.pathname = internalUrl.pathname;
  publicUrl.search = internalUrl.search;
  const publicRequest = new Request(publicUrl, {
    method: request.method, headers: request.headers,
    ...(['GET', 'HEAD'].includes(request.method) ? {} : { body: request.body, duplex: 'half' }),
  });
  const response = await handleAdmin(publicRequest, { ...process.env, ...(env ?? {}) }, { snapshot: () => snapshot });
  response.headers.set('X-Admin-Runtime', 'node');
  return response;
};
export default onRequest;
