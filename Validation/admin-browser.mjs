import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, cp, mkdtemp } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { handleAdmin } from '../scripts/admin/handler.mjs';
import { LocalRepository } from '../scripts/admin/local-repository.mjs';
import { snapshot } from '../scripts/admin/prepare.mjs';
import { passwordHash, randomSecret } from '../scripts/admin/auth.mjs';
import { ROOT } from '../scripts/publications/store.mjs';
const {chromium}=await import(pathToFileURL(resolve(ROOT,'../../[Validation]/browser-tools/node_modules/playwright-core/index.mjs')));
const output=resolve(ROOT,'Validation/results/admin');await mkdir(output,{recursive:true});
const fixture=await mkdtemp(resolve(output,'fixture-'));
await cp(resolve(ROOT,'src'),resolve(fixture,'src'),{recursive:true});
await mkdir(resolve(fixture,'public/assets/cms'),{recursive:true});
const password=randomSecret();const env={ADMIN_USERNAME:'admin',ADMIN_PASSWORD_HASH:await passwordHash(password),ADMIN_SESSION_SECRET:randomSecret()};
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host}`);
    if(url.pathname.startsWith('/api/admin/')){
      const request=new Request(url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:req,duplex:'half'})});
      const response=await handleAdmin(request,env,{repository:()=>new LocalRepository(fixture),snapshot:()=>snapshot(fixture)});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    let path=decodeURIComponent(url.pathname);if(path.endsWith('/'))path+='index.html';
    const target=resolve(ROOT,'dist','.'+path);if(!target.startsWith(resolve(ROOT,'dist')+sep))throw Error();
    const body=await readFile(target);const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'}[extname(target)]??'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(4330,'127.0.0.1',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
try{
  await page.goto('http://127.0.0.1:4330/publications/');assert.equal(await page.locator('[data-pub-card]').count(),37);assert.equal(await page.locator('[data-review-badge]').count(),0);
  await page.goto('http://127.0.0.1:4330/');assert.equal(await page.locator('[data-review-badge]').count(),0);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:4330/admin/');await page.locator('#login-panel').waitFor({state:'visible'});assert.equal(await page.locator('#workspace').isVisible(),false);assert.equal(await page.locator('.paper').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,`login-${width}.png`),fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});await page.locator('[name=password]').fill(password);await page.locator('#login-form button').click();await page.locator('#workspace').waitFor({state:'visible'});
  assert.equal(await page.locator('.paper').count(),38);assert.equal(await page.locator('.stat').nth(1).innerText(),'0\n自动新增待核对');
  await page.screenshot({path:resolve(output,'overview-desktop.png'),fullPage:true});
  await page.locator('[data-collection=publications]').click();
  const frame=page.frameLocator('#editor');
  await frame.getByText('论文',{exact:true}).first().waitFor({timeout:60000});
  await page.screenshot({path:resolve(output,'editor-loaded.png'),fullPage:true});
  assert.equal(await frame.getByText('Error loading the CMS configuration',{exact:false}).count(),0);
  const entryTitle='Hydrogel-based moisture electricity generators';
  await frame.getByText(entryTitle,{exact:false}).first().click();
  await frame.getByText('原有论文及手动添加的论文不需要信息核对。',{exact:true}).waitFor({timeout:30000});
  await page.screenshot({path:resolve(output,'publication-edit.png'),fullPage:true});
  results.push({check:'publication editor loaded with complete config and legacy exemption',passed:true});
  // Emit field labels to help maintain actual form interactions if Decap changes.
  await writeFile(resolve(output,'form.txt'),await frame.locator('body').innerText());
  const domains=frame.locator('input[id^="domains-field-"]');await domains.fill('Food');await domains.press('Enter');await domains.press('Tab');
  await frame.getByRole('button',{name:'选择其他图片',exact:true}).click();
  await frame.locator('input[type=file]').setInputFiles({name:'后台 中文摘要图.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZQAAAABJRU5ErkJggg==','base64')});
  await frame.getByRole('button',{name:'选用已选中项目',exact:true}).click();
  await frame.locator('input[id^="alt-field-"]').fill('后台完整显示验证');
  await frame.getByRole('button',{name:'发布',exact:true}).click();await frame.getByText('立即发布',{exact:true}).click();
  await frame.getByText('修改已保存',{exact:true}).waitFor();
  const record=(await snapshot(fixture)).entries.find(e=>e.title.includes(entryTitle));
  assert.ok(record.domains.includes('Food'));assert.equal(record.image.alt,'后台完整显示验证');assert.ok((await readFile(resolve(fixture,'public'+record.image.src))).length>0);
  assert.equal(record.confirmation.pending,false);
  results.push({check:'publication category and Chinese-named image saved through authenticated backend',passed:true});
  await page.locator('#save-status').evaluate(el=>{el.textContent='';});
  await page.locator('[data-collection=settings]').click();await frame.getByText('可见站点设置',{exact:true}).first().click();
  await frame.getByLabel('网站名称',{exact:false}).fill('Isolated admin browser verification');
  await frame.getByRole('button',{name:'发布',exact:true}).click();
  await frame.getByText('立即发布',{exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('save-status').textContent.includes('已保存'),{timeout:30000});
  const saved=JSON.parse(await readFile(resolve(fixture,'src/data/site.json'),'utf8'));assert.equal(saved.site.name,'Isolated admin browser verification');
  results.push({check:'site settings saved to isolated filesystem through authenticated backend',passed:true});
  await page.setViewportSize({width:390,height:844});await page.locator('#navigation button').first().click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,'overview-mobile.png'),fullPage:true});
  await page.locator('#logout').click();await page.locator('#login-panel').waitFor({state:'visible'});assert.equal(await page.locator('.paper').count(),0);assert.equal((await context.request.get('http://127.0.0.1:4330/api/admin/data')).status(),401);
  assert.deepEqual(errors,[]);
  results.push({check:'logout removes editor and data and rejects subsequent reads',passed:true});
}catch(error){await page.screenshot({path:resolve(output,'failure.png'),fullPage:true});await writeFile(resolve(output,'failure-body.txt'),await page.locator('body').innerText());for(const f of page.frames())if(f!==page.mainFrame())await writeFile(resolve(output,'failure-frame.txt'),await f.locator('body').innerText());throw error;}
finally{await writeFile(resolve(output,'results.json'),JSON.stringify({results,errors},null,2));await browser.close();server.close();}
console.log(JSON.stringify(results,null,2));
