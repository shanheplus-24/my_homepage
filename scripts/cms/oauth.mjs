// Portable Decap OAuth handler. Inactive until server-side credentials are configured.
// This module never reads a token from a URL and never stores tokens in the repository.
const encoder = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unb64 = (text) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
async function sign(payload, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}
const headers = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const fail = (status, message) => new Response(message, { status, headers });
export async function handleOAuth(request, env, fetcher = fetch) {
  const { CMS_GITHUB_CLIENT_ID: clientId, CMS_GITHUB_CLIENT_SECRET: clientSecret, CMS_OAUTH_STATE_SECRET: stateSecret, CMS_OAUTH_ORIGIN: origin } = env;
  if (request.method === 'GET' && new URL(request.url).pathname === '/api/cms/status') {
    const ready = Boolean(clientId && clientSecret && stateSecret?.length >= 32 && /^https:\/\/[^/]+$/.test(origin ?? ''));
    return Response.json({ ready }, { headers: { ...headers, 'Access-Control-Allow-Origin': '*' } });
  }
  if (!clientId || !clientSecret || !stateSecret || stateSecret.length < 32 || !origin) return fail(503, 'CMS online sign-in is not configured. Use the local editor.');
  const url = new URL(request.url);
  if (request.method !== 'GET' || !/^https:\/\/[^/]+$/.test(origin) || url.origin !== origin) return fail(400, 'Invalid authentication request.');
  const allowed = (env.CMS_ALLOWED_ORIGINS ?? 'https://www.shanheplus.com,https://shanheplus-24.github.io').split(',').map((s) => s.trim());
  const callback = `${origin}/api/cms/callback`;
  const cookie = (value, maxAge = 600) => `__Host-cms-oauth=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
  if (url.pathname === '/api/cms/auth') {
    const site = url.searchParams.get('site_id');
    const caller = allowed.find((value) => new URL(value).hostname === site);
    if (!caller || url.searchParams.get('provider') !== 'github') return fail(400, 'Unknown CMS origin or provider.');
    const state = random(); const verifier = random();
    const payload = b64(encoder.encode(JSON.stringify({ state, verifier, caller, time: Date.now() })));
    const token = `${payload}.${await sign(payload, stateSecret)}`;
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, scope: 'public_repo', state,
      code_challenge: b64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)))), code_challenge_method: 'S256', allow_signup: 'false' }).toString();
    return new Response(null, { status: 302, headers: { ...headers, Location: authorize.href, 'Set-Cookie': cookie(token) } });
  }
  if (url.pathname !== '/api/cms/callback') return fail(404, 'Not found');
  try {
    const token = request.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith('__Host-cms-oauth='))?.slice('__Host-cms-oauth='.length);
    if (!token || !url.searchParams.get('code')) return fail(400, 'Authentication expired or was cancelled.');
    const [payload, signature] = token.split('.');
    const key = await crypto.subtle.importKey('raw', encoder.encode(stateSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    if (!signature || !await crypto.subtle.verify('HMAC', key, unb64(signature), encoder.encode(payload))) return fail(400, 'Invalid authentication state.');
    const session = JSON.parse(new TextDecoder().decode(unb64(payload)));
    if (session.state !== url.searchParams.get('state') || Date.now() - session.time > 600000 || session.time > Date.now() || !allowed.includes(session.caller)) return fail(400, 'Authentication expired or state mismatch.');
    const result = await fetcher('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code: url.searchParams.get('code'), redirect_uri: callback, code_verifier: session.verifier }) });
    const data = await result.json();
    if (!result.ok || !data.access_token) return fail(401, 'GitHub authentication failed.');
    const repoResponse = await fetcher('https://api.github.com/repos/shanheplus-24/my_homepage', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${data.access_token}`, 'User-Agent': 'ShanHePlus-CMS' } });
    const repo = await repoResponse.json();
    if (!repoResponse.ok || repo.permissions?.push !== true) return fail(403, 'This GitHub account cannot edit this website.');
    const nonce = random();
    const jsString = (value) => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
    const message = `authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}`;
    const html = `<!doctype html><meta charset="utf-8"><title>CMS sign-in</title><p>Signed in. Returning to the editor…</p><script nonce="${nonce}">const origin=${jsString(session.caller)};const openerWindow=window.opener;window.addEventListener('message',function receive(event){if(event.origin!==origin||event.source!==openerWindow)return;window.removeEventListener('message',receive);openerWindow.postMessage(${jsString(message)},origin);window.close();});if(openerWindow)openerWindow.postMessage('authorizing:github',origin);</script>`;
    return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookie('', 0), 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'` } });
  } catch { return fail(400, 'Unable to complete authentication. Please restart sign-in.'); }
}
