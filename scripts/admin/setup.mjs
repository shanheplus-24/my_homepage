import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from '../publications/store.mjs';
import { passwordHash, randomSecret } from './auth.mjs';
const key=randomSecret();
const port=4322;
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>管理员安全配置</title><style>body{font:16px Arial,sans-serif;background:#f3f6fb;color:#20334d;max-width:720px;margin:35px auto;padding:24px}main{padding:28px;background:white;border-radius:16px}p{line-height:1.7}label{display:block;margin:20px 0}input,textarea{box-sizing:border-box;width:100%;padding:12px;margin-top:8px;border:1px solid #bbc8db;border-radius:6px;font:inherit}button{padding:12px 20px;background:#245f9c;color:white;border:0;border-radius:7px;cursor:pointer}textarea{height:240px;font-size:13px}#message{color:#815014}</style><main><h1>管理员安全配置</h1><p>此窗口仅在本机运行。设置密码后生成密码验证值和会话密钥，原始密码不会保存。生成的配置仅供服务端使用，请勿粘贴到聊天或提交到仓库。</p><form><label>账号<input name="username" value="admin" readonly></label><label>密码（至少 14 个字符）<input name="password" type="password" autocomplete="new-password" minlength="14" maxlength="256" required></label><label>再次输入密码<input name="confirm" type="password" autocomplete="new-password" required></label><label>GitHub Fine-grained token（线上保存必需；仅授权 my_homepage 仓库，Contents: Read and write）<input name="token" type="password" autocomplete="off" placeholder="可先留空配置本地登录"></label><p><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">创建仓库专用令牌</a>。无需授予 Actions、Workflows 或账号管理权限。</p><button>生成并保存安全配置</button></form><p id="message" role="status"></p><section id="result" hidden><h2>EdgeOne 服务端环境变量</h2><p>打开绑定 www.shanheplus.com 的 EdgeOne 项目 → 设置 → 环境变量，将以下内容粘贴到生产环境，保存后重新部署。不能使用 PUBLIC_ 前缀。</p><textarea id="values" readonly spellcheck="false"></textarea><button id="copy">复制配置</button><p>本地配置已保存至被 Git 忽略的 .env.admin.local。运行 npm run cms:local，即可用同一账号密码登录本地维护站。若令牌留空，线上可以登录，但不能保存内容。</p></section></main><script>document.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const b=f.querySelector('button');b.disabled=true;try{if(f.password.value!==f.confirm.value)throw Error('两次密码不一致。');const r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:f.password.value,token:f.token.value})});const d=await r.json();if(!r.ok)throw Error(d.error);document.getElementById('values').value=d.values;document.getElementById('result').hidden=false;document.getElementById('message').textContent='配置已生成；请将环境变量设置到 EdgeOne 并重新部署。';f.password.value='';f.confirm.value='';f.token.value='';}catch(err){document.getElementById('message').textContent=err.message;}finally{b.disabled=false;}};document.getElementById('copy').onclick=()=>navigator.clipboard.writeText(document.getElementById('values').value);</script></html>`;
const server=createServer(async(req,res)=>{
  const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'; default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"};
  if(req.headers.host!==`127.0.0.1:${port}`||req.url!==`/${key}`){res.writeHead(404,headers);res.end('Not found');return;}
  if(req.method==='GET'){res.writeHead(200,headers);res.end(html);return;}
  if(req.method!=='POST'||req.headers.origin!==`http://127.0.0.1:${port}`||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403,headers);res.end('Forbidden');return;}
  try{
    let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('提交内容过大。');}
    const input=JSON.parse(body);
    if(input.token && !/^github_pat_[A-Za-z0-9_]{20,}$/.test(input.token))throw Error('请使用仅授权此仓库的 GitHub Fine-grained token。');
    const env={ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:await passwordHash(input.password),ADMIN_SESSION_SECRET:randomSecret(),...(input.token?{ADMIN_GITHUB_TOKEN:input.token}:{})};
    await writeFile(resolve(ROOT,'.env.admin.local'),JSON.stringify(env,null,2)+'\n',{mode:0o600});
    res.writeHead(200,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({values:Object.entries(env).map(([k,v])=>k+'='+v).join('\n')}));
    console.log('Admin configuration saved. No secrets are printed.');
  }catch(error){res.writeHead(400,{...headers,'Content-Type':'application/json'});res.end(JSON.stringify({error:error.message}));}
});
server.listen(port,'127.0.0.1',()=>console.log(`Open local setup: http://127.0.0.1:${port}/${key}`));
