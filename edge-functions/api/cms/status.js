// Keep the readiness endpoint independent of authentication initialization.
export function onRequest(context) {
  const env = context.env ?? {};
  const ready = Boolean(env.CMS_GITHUB_CLIENT_ID && env.CMS_GITHUB_CLIENT_SECRET &&
    env.CMS_OAUTH_STATE_SECRET?.length >= 32 && /^https:\/\/[^/]+$/.test(env.CMS_OAUTH_ORIGIN ?? ''));
  return new Response(JSON.stringify({ ready }), { headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*',
  } });
}
export default onRequest;
