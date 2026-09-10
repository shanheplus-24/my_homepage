const encoder = new TextEncoder();
const encode = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const decode = (text) => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const ttl = 3600;
const failures = new Map();
export function configured(env) {
  return /^[a-zA-Z0-9_.-]{1,64}$/.test(env.ADMIN_USERNAME ?? '') && /^pbkdf2-sha256\$600000\$[\w-]{22,}\$[\w-]{43}$/.test(env.ADMIN_PASSWORD_HASH ?? '') && (env.ADMIN_SESSION_SECRET?.length ?? 0) >= 43;
}
export async function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 14 || password.length > 256) throw new Error('密码请使用 14–256 个字符。');
  const salt = crypto.getRandomValues(new Uint8Array(18));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 }, key, 256);
  return `pbkdf2-sha256$600000$${encode(salt)}$${encode(new Uint8Array(bits))}`;
}
export const randomSecret = () => encode(crypto.getRandomValues(new Uint8Array(32)));
const equal = (a, b) => { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; };
async function mac(value, env) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(env.ADMIN_SESSION_SECRET), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return encode(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
function cookieName(request) { return new URL(request.url).protocol === 'https:' ? '__Host-site-admin' : 'site-admin-local'; }
export function sessionCookie(request, value, clear = false) {
  return `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : ttl}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function getSession(request, env) {
  if (!configured(env)) return null;
  try {
    const raw = request.headers.get('cookie')?.split(';').map((p) => p.trim()).find((p) => p.startsWith(`${cookieName(request)}=`))?.split('=').slice(1).join('=');
    if (!raw || raw.length > 2048) return null;
    const [payload, signature, extra] = raw.split('.');
    if (extra || !signature || !equal(signature, await mac(payload, env))) return null;
    const session = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (session.user !== env.ADMIN_USERNAME || session.exp <= Date.now() || session.exp > Date.now() + ttl * 1000 || session.version !== env.ADMIN_PASSWORD_HASH.slice(-43)) return null;
    return { user: session.user, expiresAt: session.exp };
  } catch { return null; }
}
export async function login(request, env, username, password) {
  if (!configured(env)) return { status: 503, error: '管理员账号尚未配置，请先完成安全配置。' };
  const ip = request.headers.get('eo-connecting-ip') || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  for (const [key, record] of failures) if (record.until <= now) failures.delete(key);
  const attempt = failures.get(ip) ?? { count: 0, until: now + 15 * 60000 };
  if (attempt.count >= 8 || failures.size > 2048) return {status:429,error:'尝试次数过多，请稍后再试。'};
  attempt.count++; failures.set(ip, attempt);
  if (typeof username !== 'string' || typeof password !== 'string' || password.length > 256) return {status:401,error:'账号或密码不正确。'};
  const [, iterations, salt, expected] = env.ADMIN_PASSWORD_HASH.split('$');
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const actual = encode(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:decode(salt),iterations:Number(iterations)},key,256)));
  if (!equal(actual, expected) || !equal(username, env.ADMIN_USERNAME)) return {status:401,error:'账号或密码不正确。'};
  failures.delete(ip);
  const payload = encode(encoder.encode(JSON.stringify({user:username,exp:Date.now()+ttl*1000,version:expected,nonce:randomSecret()})));
  return { status:200, cookie:sessionCookie(request, `${payload}.${await mac(payload,env)}`), user:username };
}
export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin && /^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '');
}
