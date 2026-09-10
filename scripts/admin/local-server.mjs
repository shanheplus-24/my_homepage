import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { handleAdmin } from './handler.mjs';
import { LocalRepository } from './local-repository.mjs';
import { snapshot } from './prepare.mjs';
import { ROOT } from '../publications/store.mjs';
export async function startAdmin(root=ROOT,port=8082, suppliedEnv){
  const server=createServer(async(req,res)=>{
    try{
      const env=suppliedEnv??JSON.parse(await readFile(resolve(root,'.env.admin.local'),'utf8').catch(e=>{if(e.code==='ENOENT')return '{}';throw e;}));
      const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:req,duplex:'half'})});
      const response=await handleAdmin(request,env,{repository:()=>new LocalRepository(root),snapshot:()=>snapshot(root)});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end('{"error":"本地后台配置无法读取。"}');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return server;
}
