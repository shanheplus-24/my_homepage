import test from 'node:test';
import assert from 'node:assert/strict';
import { handleOAuth } from '../scripts/cms/oauth.mjs';
import { onRequest as readiness } from '../edge-functions/api/cms/status.js';
const env = { CMS_GITHUB_CLIENT_ID: 'test-client', CMS_GITHUB_CLIENT_SECRET: 'test-secret', CMS_OAUTH_STATE_SECRET: 'test-state-secret-longer-than-32-characters', CMS_OAUTH_ORIGIN: 'https://www.shanheplus.com' };
const request = (path, cookie) => new Request(`${env.CMS_OAUTH_ORIGIN}${path}`, { headers: cookie ? { cookie } : {} });
async function begin() {
  const response = await handleOAuth(request('/api/cms/auth?provider=github&site_id=www.shanheplus.com'), env);
  return { response, location: new URL(response.headers.get('location')), cookie: response.headers.get('set-cookie').split(';')[0] };
}
test('OAuth remains inactive without credentials and rejects arbitrary origins', async () => {
  assert.equal((await handleOAuth(request('/api/cms/auth'), {})).status, 503);
  assert.equal((await handleOAuth(request('/api/cms/auth?provider=github&site_id=evil.example'), env)).status, 400);
});
test('status remains readable when the edge runtime omits environment or Response.json', async () => {
  const original = Response.json;
  Response.json = undefined;
  try {
    for (const missing of [undefined, null, {}]) {
      const response = await handleOAuth(request('/api/cms/status'), missing);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ready: false });
      assert.deepEqual(await readiness({ env: missing }).json(), { ready: false });
      assert.equal((await handleOAuth(request('/api/cms/auth'), missing)).status, 503);
    }
    assert.deepEqual(await (await handleOAuth(request('/api/cms/status'), env)).json(), { ready: true });
    assert.deepEqual(await readiness({ env }).json(), { ready: true });
  } finally { Response.json = original; }
});
test('authorization uses state, PKCE and secure signed cookie', async () => {
  const { response, location } = await begin();
  assert.equal(response.status, 302); assert.equal(location.hostname, 'github.com');
  assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(location.searchParams.get('state').length >= 40);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Lax/);
});
test('callback rejects missing, mismatched or tampered state before token exchange', async () => {
  const { location, cookie } = await begin(); const state = location.searchParams.get('state');
  const never = async () => { throw new Error('must not call token endpoint'); };
  assert.equal((await handleOAuth(request(`/api/cms/callback?code=test&state=${state}`), env, never)).status, 400);
  assert.equal((await handleOAuth(request('/api/cms/callback?code=test&state=wrong', cookie), env, never)).status, 400);
  assert.equal((await handleOAuth(request(`/api/cms/callback?code=test&state=${state}`, `${cookie}tampered`), env, never)).status, 400);
});
test('callback verifies target repository permission and sends token only to approved opener', async () => {
  const { location, cookie } = await begin(); const state = location.searchParams.get('state');
  let calls = 0;
  const fetcher = async (url, options) => {
    calls++;
    if (url.includes('access_token')) { assert.ok(JSON.parse(options.body).code_verifier); return Response.json({ access_token: 'test-token' }); }
    assert.equal(url, 'https://api.github.com/repos/shanheplus-24/my_homepage');
    return Response.json({ permissions: { push: true } });
  };
  const response = await handleOAuth(request(`/api/cms/callback?code=test&state=${state}`, cookie), env, fetcher);
  assert.equal(response.status, 200); assert.equal(calls, 2);
  const html = await response.text(); assert.match(html, /event.origin!==origin\|\|event.source!==openerWindow/);
  assert.ok(!html.includes("postMessage('authorizing:github','*')"));
  assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  const denied = await handleOAuth(request(`/api/cms/callback?code=test&state=${state}`, cookie), env, async (url) => url.includes('access_token') ? Response.json({ access_token: 'test-token' }) : Response.json({ permissions: { push: false } }));
  assert.equal(denied.status, 403);
});
