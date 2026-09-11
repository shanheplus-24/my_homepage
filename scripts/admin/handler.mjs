import { TextEncoder, TextDecoder } from 'node:util';
import config from './config.mjs';
import { configured, getSession, login, sameOrigin, sessionCookie } from './auth.mjs';
import { fail, GithubRepository, proxyAction } from './repository.mjs';

const headers = {'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'SAMEORIGIN'};
const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json; charset=utf-8',...extra}});
async function body(request, limit) {
  if (Number(request.headers.get('content-length')) > limit) throw fail(413,'提交内容过大。');
  const chunks = []; let size = 0;
  const append = value => {
    const chunk = typeof value === 'string' ? new TextEncoder().encode(value)
      : ArrayBuffer.isView(value) ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      : value?.type === 'Buffer' && Array.isArray(value.data) ? Uint8Array.from(value.data)
      : new Uint8Array(value);
    size += chunk.byteLength;
    if (size > limit) throw fail(413,'提交内容过大。');
    chunks.push(chunk);
  };
  const source = request.body;
  if (typeof source?.getReader === 'function') {
    const reader = source.getReader();
    try { for (;;) { const {done,value} = await reader.read(); if (done) break; append(value); } }
    catch (error) { await reader.cancel(); throw error; }
  } else if (source?.[Symbol.asyncIterator]) {
    for await (const chunk of source) append(chunk);
  } else if (typeof source === 'string' || ArrayBuffer.isView(source) || source instanceof ArrayBuffer || source?.type === 'Buffer') {
    append(source);
  } else if (typeof request.text === 'function') {
    append(await request.text());
  } else if (typeof request.json === 'function') {
    append(JSON.stringify(await request.json()));
  } else if (source && Object.prototype.toString.call(source) === '[object Object]') {
    append(JSON.stringify(source));
  } else throw fail(400,'无法读取提交内容。');
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes.buffer)); } catch { throw fail(400,'提交格式无效。'); }
}
const editor = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>内容编辑</title><style>body{margin:0;font-family:Arial,sans-serif}img{object-fit:contain!important}#error{padding:30px;color:#8d271b}</style></head><body><div id="error" role="alert"></div><script>window.CMS_MANUAL_INIT=true;</script><script src="https://unpkg.com/decap-cms@3.10.0/dist/decap-cms.js"></script><script src="/admin/backend.js"></script><script src="/admin/publications.js"></script><script src="/admin/editor.js"></script></body></html>`;
export async function handleAdmin(request, env = {}, dependencies = {}) {
  try {
    const action = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    if (!['GET','POST'].includes(request.method)) return json({error:'不支持此方法。'},405);
    if (request.method === 'POST' && !sameOrigin(request)) return json({error:'请求来源不正确，请从本站后台操作。'},403);
    if (action === 'status' && request.method === 'GET') return json({configured:configured(env),storageReady:!!env.ADMIN_GITHUB_TOKEN || !!dependencies.repository});
    if (action === 'login' && request.method === 'POST') {
      const input = await body(request,4096);
      const result = await login(request,env,input.username,input.password);
      return json(result.error ? {error:result.error} : {user:result.user},result.status,result.cookie ? {'Set-Cookie':result.cookie} : {});
    }
    const session = await getSession(request,env);
    if (!session) return json({error:'请先登录，或会话已过期。'},401);
    if (action === 'session' && request.method === 'GET') return json(session);
    if (action === 'logout' && request.method === 'POST') return json({ok:true},200,{'Set-Cookie':sessionCookie(request,'',true)});
    if (action === 'config' && request.method === 'GET') return json(config);
    if (action === 'data' && request.method === 'GET') return json(await dependencies.snapshot?.() ?? {entries:[]});
    if (action === 'editor' && request.method === 'GET') return new Response(editor,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'"}});
    if (action === 'proxy' && request.method === 'POST') {
      const input = await body(request,8000000);
      const repo = dependencies.repository?.() ?? new GithubRepository(env.ADMIN_GITHUB_TOKEN);
      return json(await proxyAction(repo,input.action,input.params));
    }
    return json({error:'找不到此功能。'},404);
  } catch (error) { return json({error:error.status ? error.message : '后台服务暂时不可用，请稍后重试。', ...(error.code?.startsWith('password-') ? {code:error.code} : {})},error.status ?? 500); }
}
