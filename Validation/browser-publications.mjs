import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, writeFile, cp, mkdir, stat, mkdtemp } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, loadPublicationEntries } from '../scripts/publications/store.mjs';
import { sync } from '../scripts/publications/sync.mjs';

// Use the workspace's existing browser dependency. PLAYWRIGHT_MODULE can select another installation.
const playwrightPath = process.env.PLAYWRIGHT_MODULE || resolve(ROOT, '../../[Validation]/browser-tools/node_modules/playwright-core/index.mjs');
const { chromium } = await import(pathToFileURL(playwrightPath).href);
const basePath = process.env.BASE_PATH || '';
const output = resolve(ROOT, `Validation/results/browser${basePath ? '-subpath' : ''}`);
await mkdir(output, { recursive: true });
const fixture = await mkdtemp(resolve(output, 'cms-fixture-'));
await mkdir(resolve(fixture, 'src'), { recursive: true });
await cp(resolve(ROOT, 'src/data'), resolve(fixture, 'src/data'), { recursive: true });
await cp(resolve(ROOT, 'src/content'), resolve(fixture, 'src/content'), { recursive: true });
await mkdir(resolve(fixture, 'public/assets/cms'), { recursive: true });
const dist = resolve(ROOT, 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.yml': 'text/yaml', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(`${basePath}/`)) { res.writeHead(404).end(); return; }
    const requested = decodeURIComponent(url.pathname.slice(basePath.length));
    const servingRoot = requested.startsWith('/assets/cms/') ? resolve(fixture, 'public') : dist;
    let path = resolve(servingRoot, `.${requested}`);
    if (path !== servingRoot && !path.startsWith(servingRoot + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}${basePath}`;
const portProbe = createServer();
await new Promise((done) => portProbe.listen(0, '127.0.0.1', done));
const cmsPort = portProbe.address().port;
await new Promise((done) => portProbe.close(done));
const cms = spawn(process.execPath, [resolve(ROOT, 'node_modules/decap-server/dist/index.js')], { cwd: fixture, windowsHide: true,
  env: { ...process.env, MODE: 'fs', PORT: String(cmsPort), BIND_HOST: '127.0.0.1', GIT_REPO_DIRECTORY: fixture }, stdio: ['ignore', 'pipe', 'pipe'] });
let cmsLog = ''; cms.stdout.on('data', (chunk) => { cmsLog += chunk; }); cms.stderr.on('data', (chunk) => { cmsLog += chunk; });
let browser; let page;
const results = [];
const publicEntries = await loadPublicationEntries();
const sample = publicEntries[0];
try {
  for (let retry = 0; retry < 40; retry++) {
    try { const r = await fetch(`http://127.0.0.1:${cmsPort}/api/v1`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'info' }) });
      if (r.ok) { assert.equal((await r.json()).repo, fixture.split(sep).pop()); break; }
    } catch {}
    if (retry === 39) throw new Error('CMS proxy did not start: ' + cmsLog);
    await new Promise((done) => setTimeout(done, 100));
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    const pendingCount = publicEntries.filter(p => p.confirmation.pending).length;
    assert.equal(await page.locator('[data-home-review-notice]').count(), pendingCount ? 1 : 0);
    if (pendingCount) {
      for (const theme of ['light', 'dark']) {
        await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
        await page.locator('[data-home-review-notice]').scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({path: resolve(output, `home-review-${theme}-${viewport.width}.png`)});
      }
      await page.locator('[data-home-review-notice] a').click();
      await page.waitForURL('**/publications/?review=pending');
      assert.equal(await page.locator('[data-publication-review="pending"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-pub-card]:visible').count(), pendingCount);
    }
    await page.goto(`${base}/publications/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-review-badge]').count(), pendingCount);
    await page.locator('[data-publication-review="pending"]').click();
    assert.equal(await page.locator('[data-pub-card]:visible').count(), pendingCount);
    await page.locator('[data-publication-review="all"]').click();
    assert.equal(await page.locator('[data-pub-card]').count(), publicEntries.length);
    await page.locator('[data-publication-search]').fill(sample.title);
    const card = page.locator('[data-pub-card]:visible');
    assert.equal(await card.count(), 1);
    assert.equal(await card.locator('.publication-title-link').getAttribute('href'), sample.links.doi);
    await card.screenshot({ path: resolve(output, `doi-${viewport.width}.png`) });
    await page.locator('[data-publication-search]').fill('');
    await page.locator('[data-publication-domain="Water"]').click();
    assert.ok(await page.locator('[data-pub-card]:visible').count() > 0);
    const invalid = await page.locator('[data-pub-card]:visible').evaluateAll((cards) => cards.some((c) => !c.dataset.domain.split('|').includes('Water')));
    assert.equal(invalid, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`${base}/admin/publications/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-entry]').count(), 38);
    assert.equal(await page.getByText('身份核验：待确认，暂停公开收录', {exact: true}).count(), 38-publicEntries.length);
    await page.locator('#search').fill('Vapor condensation');
    assert.equal(await page.locator('[data-entry]:visible').count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: resolve(output, `dashboard-${viewport.width}.png`), fullPage: true });
    assert.deepEqual(errors, []);
    results.push({ viewport, publications: publicEntries.length, doi: 'verified', filters: 'passed', overflow: false, errors });
    await page.close();
  }
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route(/http:\/\/(?:localhost|127\.0\.0\.1):808[12]\//, async (route) => {
    const response = await route.fetch({ url: route.request().url().replace(/(?:localhost|127\.0\.0\.1):808[12]/, `127.0.0.1:${cmsPort}`) });
    await route.fulfill({ response });
  });
  const errors = []; page.on('pageerror', (error) => { errors.push(error.message); console.log('EDITOR ERROR', error.message); });
  page.on('requestfailed', (request) => console.log('REQUEST FAILED', request.url(), request.failure()?.errorText));
  page.on('console', (message) => { if (message.type() === 'error') console.log('CONSOLE ERROR', message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) console.log('HTTP ERROR', response.status(), response.url()); });
  // Verify confirmation against a visible paper in the isolated CMS copy.
  await page.goto(`${base}/admin/#/collections/publications/entries/${sample.id}`, {waitUntil: 'networkidle'});
  await page.waitForTimeout(1500);
  const reviewLogin = page.getByRole('button', {name: /login|登录/i});
  if (await reviewLogin.count()) await reviewLogin.first().click();
  await page.getByRole('button', {name: '我已核对，确认本次更新', exact: true}).click();
  await page.getByRole('button', {name: '发布', exact: true}).click();
  await page.getByText('立即发布', {exact: true}).click();
  await page.getByText('修改已保存', {exact: true}).waitFor();
  assert.equal((await loadPublicationEntries(fixture)).find(p => p.id === sample.id).confirmation.pending, false);
  await page.reload({waitUntil: 'networkidle'});
  await page.getByRole('button', {name: '撤销本次确认', exact: true}).waitFor();
  await page.getByRole('button', {name: '撤销本次确认', exact: true}).click();
  await page.getByRole('button', {name: '发布', exact: true}).click();
  await page.getByText('立即发布', {exact: true}).click();
  await page.getByText('修改已保存', {exact: true}).waitFor();
  assert.equal((await loadPublicationEntries(fixture)).find(p => p.id === sample.id).confirmation.pending, true);
  await page.goto('about:blank');
  await page.goto(`${base}/admin/#/collections/publications/entries/vapor-condensation-passive-solar-water-harvesting`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const login = page.getByRole('button', { name: /login|登录/i });
  if (await login.count()) await login.first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(output, 'editor.png'), fullPage: true });
  await writeFile(resolve(output, 'editor-text.txt'), await page.locator('body').innerText());
  await writeFile(resolve(output, 'editor-dom.html'), await page.content());
  assert.equal(await page.getByText('分类维护方式', { exact: true }).count(), 1, 'CMS editor should load');
  const domains = page.locator('input[id^="domains-field-"]');
  await domains.fill('Food'); await domains.press('Enter'); await domains.press('Tab');
  const methods = page.locator('input[id^="methods-field-"]');
  await methods.fill('AI'); await methods.press('Enter'); await methods.press('Tab');
  await page.getByRole('button', { name: '选择其他图片', exact: true }).click();
  const sourceImage = (await loadPublicationEntries(ROOT, true)).find((entry) => entry.id === 'vapor-condensation-passive-solar-water-harvesting').image;
  await page.locator('input[type="file"]').setInputFiles({ name: '校验 摘要图.png', mimeType: 'image/png', buffer: await readFile(resolve(ROOT, `public${sourceImage.src}`)) });
  await page.getByRole('button', { name: '选用已选中项目', exact: true }).click();
  await page.locator('input[id^="alt-field-"]').fill('校验：保留完整摘要图');
  await page.getByRole('button', { name: '发布', exact: true }).click();
  await page.getByText('立即发布', { exact: true }).click();
  await page.getByText('修改已保存', { exact: true }).waitFor();
  const overridePath = resolve(fixture, 'src/data/publication-overrides/vapor-condensation-passive-solar-water-harvesting.json');
  const savedText = await readFile(overridePath, 'utf8');
  const saved = JSON.parse(savedText);
  assert.deepEqual(saved.domains, ['Water', 'Food']); assert.deepEqual(saved.methods, ['Devices', 'AI']);
  assert.equal(saved.image.alt, '校验：保留完整摘要图');
  assert.ok((await stat(resolve(fixture, `public${saved.image.src}`))).size > 0);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('input[id^="alt-field-"]').inputValue(), '校验：保留完整摘要图');
  const preview = page.frameLocator('iframe').getByRole('img', { name: '校验：保留完整摘要图' });
  await preview.waitFor();
  assert.equal(await preview.evaluate(async (img) => { await img.decode(); return getComputedStyle(img).objectFit; }), 'contain');
  const originalFetch = globalThis.fetch;
  const refreshedWork = { DOI: '10.1016/j.xcrp.2026.103351', title: ['Vapor condensation enhancement in passive solar water harvesting'], 'container-title': ['Cell Reports Physical Science'], type: 'journal-article', published: { 'date-parts': [[2026, 6, 17]] }, author: [{ given: 'He', family: 'Shan' }] };
  globalThis.fetch = async (url) => {
    if (url.includes('pub.orcid.org')) return Response.json({ group: [] });
    if (url.includes('crossref.org')) return Response.json({ message: refreshedWork });
    if (url.includes('/works?')) return Response.json({ results: [], meta: {} });
    return Response.json({ doi: refreshedWork.DOI, topics: [] });
  };
  try { await sync({ root: fixture, write: true, refresh: true, publisher: false, suppliedDoi: refreshedWork.DOI }); }
  finally { globalThis.fetch = originalFetch; }
  assert.equal(await readFile(overridePath, 'utf8'), savedText);
  const resolved = (await loadPublicationEntries(fixture, true)).find((entry) => entry.id === saved.id);
  assert.equal(resolved.visible, false, "Unverified refreshed author list must be held even with manual metadata");
  assert.deepEqual(resolved.domains, saved.domains); assert.deepEqual(resolved.image, saved.image);
  assert.equal(resolved.authors.length, 9);
  await page.screenshot({ path: resolve(output, 'media.png'), fullPage: true });
  assert.deepEqual(errors, []);
  results.push({ editor: 'saved-and-reloaded', ownerConfirmation: 'saved-reloaded-revoked', manualTaxonomy: saved.domains, imageUpload: saved.image.src, manualEditsSurviveSync: true, fixture, errors });
  await writeFile(resolve(output, 'browser-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
    await writeFile(resolve(output, 'failure.txt'), await page.locator('body').innerText());
  }
  throw error;
} finally {
  await browser?.close(); cms.kill(); server.closeAllConnections();
  await new Promise((done) => server.close(done));
  await writeFile(resolve(output, 'cms-server.log'), cmsLog);
}
