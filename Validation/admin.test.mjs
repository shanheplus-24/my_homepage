import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { passwordHash, randomSecret, getSession } from '../scripts/admin/auth.mjs';
import { handleAdmin } from '../scripts/admin/handler.mjs';
import { validateChange, proxyAction, GithubRepository } from '../scripts/admin/repository.mjs';
import { LocalRepository } from '../scripts/admin/local-repository.mjs';

const password=randomSecret();
const env={ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:await passwordHash(password),ADMIN_SESSION_SECRET:randomSecret()};
const request=(path,body,cookie,origin='https://www.shanheplus.com')=>new Request('https://www.shanheplus.com/api/admin/'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(body===undefined?{}:{origin,'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
const authenticate=async()=>{const r=await handleAdmin(request('login',{username:'admin',password}),env);assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];};

test('all editor, config, data and repository operations require a server session',async()=>{
  for(const path of ['config','data','editor','session','proxy'])assert.equal((await handleAdmin(request(path,path==='proxy'?{action:'getEntry'}:undefined),env)).status,401);
  assert.equal((await handleAdmin(request('login',{username:'admin',password}),{})).status,503);
  assert.equal((await handleAdmin(request('login',{username:'admin',password:'wrong'}),env)).status,401);
  const cookie=await authenticate();
  for(const path of ['config','data','editor','session']){const r=await handleAdmin(request(path,undefined,cookie),env,{snapshot:()=>({entries:[]})});assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);assert.ok(!(await r.text()).includes(env.ADMIN_SESSION_SECRET));}
  const config=await (await handleAdmin(request('config',undefined,cookie),env)).json();
  assert.equal(config.backend.name,'password');assert.ok(config.collections.length>=7);assert.ok(config.media_folder);assert.equal(config.load_config_file,false);
});
test('cookies are signed, expiring, HttpOnly and bound to the password verifier',async()=>{
  const r=await handleAdmin(request('login',{username:'admin',password}),env);
  assert.match(r.headers.get('set-cookie'),/__Host-site-admin=.*HttpOnly; SameSite=Strict; Max-Age=3600; Secure/);
  const cookie=r.headers.get('set-cookie').split(';')[0];
  assert.ok(await getSession(request('session',undefined,cookie),env));
  assert.equal(await getSession(request('session',undefined,cookie+'tamper'),env),null);
  assert.equal(await getSession(request('session',undefined,cookie),{...env,ADMIN_PASSWORD_HASH:await passwordHash(password)}),null);
  const original=Date.now;try{Date.now=()=>original()+3600001;assert.equal(await getSession(request('session',undefined,cookie),env),null);}finally{Date.now=original;}
  const logout=await handleAdmin(request('logout',{},cookie),env);assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});
test('cross-origin, non-JSON and oversized requests are rejected',async()=>{
  const cookie=await authenticate();
  for(const path of ['login','logout','proxy'])assert.equal((await handleAdmin(request(path,{},cookie,'https://attacker.example'),env)).status,403);
  const plain=new Request('https://www.shanheplus.com/api/admin/login',{method:'POST',headers:{origin:'https://www.shanheplus.com','content-type':'text/plain'},body:'{}'});
  assert.equal((await handleAdmin(plain,env)).status,403);
  assert.equal((await handleAdmin(request('login',{password:'x'.repeat(5000)}),env)).status,413);
});
test('edge runtime ArrayBuffer request chunks parse without dropping the body',async()=>{
  const standard=request('login',{username:'admin',password});
  const bytes=new TextEncoder().encode(JSON.stringify({username:'admin',password,note:'中文兼容验证'}));
  const chunks=[bytes.slice(0,17).buffer,bytes.slice(17).buffer];
  const edge={url:standard.url,method:'POST',headers:standard.headers,body:{getReader:()=>({read:async()=>chunks.length?{done:false,value:chunks.shift()}:{done:true},cancel:async()=>{}})}};
  assert.equal((await handleAdmin(edge,env)).status,200);
});
test('Cloud Functions adapter accepts owner credentials and protects maintenance data',async()=>{
  await import('../scripts/admin/prepare.mjs');
  const {default:onRequest}=await import('../cloud-functions/api/admin/[action].js');
  assert.equal((await onRequest({request:request('data'),env})).status,401);
  const response=await onRequest({request:request('login',{username:'admin',password}),env});
  assert.equal(response.status,200);
  const cookie=response.headers.get('set-cookie').split(';')[0];
  assert.equal((await onRequest({request:request('data',undefined,cookie),env})).status,200);
  const internal=new Request('http://internal-runtime:9000/api/admin/login',{method:'POST',headers:{origin:'https://www.shanheplus.com','content-type':'application/json'},body:JSON.stringify({username:'admin',password})});
  const proxied=await onRequest({request:internal,env});assert.equal(proxied.status,200);assert.match(proxied.headers.get('set-cookie'),/__Host-site-admin/);
  const raw=JSON.stringify({username:'admin',password});
  for(const body of [raw,Buffer.from(raw),Readable.from([Buffer.from(raw)]),JSON.parse(raw)]){
    const platform={url:internal.url,method:'POST',headers:internal.headers,body};
    assert.equal((await onRequest({request:platform,env})).status,200);
  }
  assert.equal((await onRequest({request:request('login',{username:'admin',password},undefined,'https://attacker.example'),env})).status,403);
});
test('write allowlist blocks credentials, workflow code, traversal, malformed metadata and disguised uploads',()=>{
  for(const path of ['.env.admin.local','.github/workflows/deploy.yml','scripts/admin/auth.mjs','src/data/../site.json','src/data\\site.json','public/assets/cms/test.html','public/assets/cms/test.svg'])assert.throws(()=>validateChange({path,raw:'{}'}));
  assert.throws(()=>validateChange({path:'src/data/site.json',raw:'not json'}));
  assert.throws(()=>validateChange({path:'src/data/site.json'},true));
  assert.throws(()=>validateChange({path:'src/data/publication-overrides/test.json'},true));
  assert.throws(()=>validateChange({path:'public/assets/cms/test.png',encoding:'base64',content:btoa('<script>alert(1)</script>')}));
  validateChange({path:'public/assets/cms/中文摘要图.png',encoding:'base64',content:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg=='});
});
test('local repository saves real content, preserves versions and rejects stale edits atomically',async()=>{
  const root=await mkdtemp(join(tmpdir(),'admin-fixture-'));await mkdir(join(root,'src/data'),{recursive:true});await writeFile(join(root,'src/data/site.json'),'{}');
  const repo=new LocalRepository(root);const entry=await proxyAction(repo,'getEntry',{path:'src/data/site.json'});
  const saved=await proxyAction(repo,'persistEntry',{dataFiles:[{path:entry.file.path,raw:'{"title":"新标题"}'}],expected:{[entry.file.path]:entry.file.id}});assert.equal(saved.saved,true);
  await assert.rejects(proxyAction(repo,'persistEntry',{dataFiles:[{path:entry.file.path,raw:'{}'}],expected:{[entry.file.path]:entry.file.id}}),e=>e.status===409);
  assert.equal(JSON.parse(await readFile(join(root,entry.file.path),'utf8')).title,'新标题');
  await assert.rejects(proxyAction(repo,'getEntry',{path:'.env.admin.local'}),e=>e.status===403);
});
test('GitHub save uses a non-forced commit update and does not overwrite a concurrent head',async()=>{
  const calls=[];
  const repo=new GithubRepository('test-server-only-token',async(url,init)=>{
    calls.push({url,...init});
    const route=url.split('/my_homepage/')[1];
    const data=route==='git/ref/heads/main'?{object:{sha:'head'}}:route==='git/commits/head'?{tree:{sha:'tree'}}:route==='git/trees/tree?recursive=1'?{tree:[{path:'src/data/site.json',type:'blob',sha:'old'}]}:{sha:'new'};
    return new Response(JSON.stringify(data),{status:route==='git/refs/heads/main'?422:200});
  });
  await assert.rejects(repo.write([{path:'src/data/site.json',raw:'{}'}],{'src/data/site.json':'old'}),e=>e.status===409);
  assert.deepEqual(JSON.parse(calls.at(-1).body),{sha:'new',force:false});
  assert.ok(calls.every(c=>c.headers.Authorization==='Bearer test-server-only-token'));
});
test('login throttles repeated failures without exposing password details',async()=>{
  for(let i=0;i<8;i++){const req=request('login',{username:'admin',password:'wrong'});req.headers.set('eo-connecting-ip','192.0.2.77');await handleAdmin(req,env);}
  const req=request('login',{username:'admin',password});req.headers.set('eo-connecting-ip','192.0.2.77');assert.equal((await handleAdmin(req,env)).status,429);
});
