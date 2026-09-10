import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { ROOT, loadPublicationEntries } from '../scripts/publications/store.mjs';
const { chromium } = await import(pathToFileURL(resolve(ROOT, '../../[Validation]/browser-tools/node_modules/playwright-core/index.mjs')).href);
const output = resolve(ROOT, 'Validation/results/release-live');
await mkdir(output, { recursive: true });
const expected = await loadPublicationEntries();
const pending = expected.filter((p) => p.confirmation.pending).length;
const sample = expected.find((p) => p.confirmation.pending);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
try {
  for (const base of ['https://www.shanheplus.com', 'https://shanheplus-24.github.io/my_homepage']) {
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, permissions: ['clipboard-read', 'clipboard-write'], reducedMotion: 'reduce', extraHTTPHeaders: { 'Cache-Control': 'no-cache' } });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      const suffix = `?release=${encodeURIComponent(process.env.RELEASE_SHA || 'publication-review')}`;
      const homeResponse = await page.goto(`${base}/${suffix}`, { waitUntil: 'domcontentloaded' });
      assert.equal(homeResponse.status(), 200);
      await page.locator('[data-home-review-notice]').waitFor();
      assert.ok((await page.locator('[data-home-review-notice]').innerText()).includes(String(pending)));
      const site = base.includes('github.io') ? 'github-pages' : 'custom-domain';
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => document.documentElement.dataset.theme = theme, theme);
        await page.locator('[data-home-review-notice]').scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: resolve(output, `${site}-home-${theme}-${viewport.width}.png`) });
      }
      await page.locator('[data-home-review-notice] a').click();
      await page.waitForURL('**/publications/?review=pending');
      assert.equal(await page.locator('[data-publication-review="pending"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-pub-card]:visible').count(), pending);
      await page.locator('[data-publication-review="all"]').click();
      assert.equal(await page.locator('[data-pub-card]:visible').count(), expected.length);
      await page.locator('[data-publication-search]').fill(sample.title);
      assert.equal(await page.locator('[data-pub-card]:visible').count(), 1);
      await page.locator('[data-pub-card]:visible [data-review-badge]').click();
      await page.waitForURL('**/admin/publications/?q=*');
      assert.equal(await page.locator('[data-entry]:visible').count(), 1);
      assert.equal(await page.locator('#search').inputValue(), sample.title);
      await page.locator('[data-entry]:visible .review-action summary').click();
      await page.locator('[data-entry]:visible [data-copy-review]').click();
      await page.locator('[data-entry]:visible [data-copy-status]').filter({ hasText: /已复制|请手动复制/ }).waitFor();
      assert.match(await page.locator('[data-entry]:visible [data-copy-status]').innerText(), /已复制|请手动复制/);
      assert.equal(await page.locator('[data-entry]:visible .review-action a').getAttribute('href'), 'https://github.com/shanheplus-24/my_homepage/actions/workflows/review-publication.yml');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: resolve(output, `${site}-review-${viewport.width}.png`), fullPage: true });
      const dataResponse = await context.request.get(`${base}/admin/publication-data.json${suffix}`);
      assert.equal(dataResponse.status(), 200);
      const data = await dataResponse.json();
      assert.equal(data.entries.filter((p) => p.visible).length, expected.length);
      assert.equal(data.entries.filter((p) => p.visible && p.confirmation.pending).length, pending);
      assert.equal(data.entries.length, 38);
      assert.deepEqual(errors, []);
      results.push({ base, viewport, public: expected.length, pending, homeLink: true, badges: true, reviewFilter: true, confirmationEntry: true, errors });
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results, null, 2));
