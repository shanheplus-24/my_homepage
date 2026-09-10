// One-time, evidence-backed migration. Not part of scheduled synchronization.
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { unlink } from 'node:fs/promises';
import { ROOT, readJson, writeJson, loadStore } from '../scripts/publications/store.mjs';
import { verifyIdentity } from '../scripts/publications/identity.mjs';

const auditRoot = resolve(ROOT, 'Validation/results/identity-reaudit');
const audit = await readJson(resolve(auditRoot, 'audit.json'));
const discovery = await readJson(resolve(auditRoot, 'discovery.json'));
const identity = await readJson(resolve(ROOT, 'src/data/publication-identity.json'));
const store = await loadStore();
const backup = resolve(auditRoot, 'before-cleanup.json');
if (!(await readJson(backup, null))) await writeJson(backup, store);
const publisherChecks = {
  'dynamic-multistage-redistributed-water-content': ['https://advanced.onlinelibrary.wiley.com/doi/10.1002/adfm.75255', 'He Shan：上海交通大学制冷研究所；与已核实的 Jie Yu、Zhenyuan Xu、Ruzhu Wang 合作。'],
  'field-portable-solar-powered-gel-fabric-awh': ['https://www.nature.com/articles/s44221-026-00645-6', 'He Shan：新加坡国立大学电气与计算机工程系及材料科学与工程系；与 Ghim Wei Ho 同单位。'],
  'macroporous-zwitterionic-hydrogel-sponge': ['https://advanced.onlinelibrary.wiley.com/doi/10.1002/adfm.202520072', 'He Shan：上海交通大学制冷研究所；其他作者 Xinge Yang、Zhihui Chen、Ruzhu Wang。'],
  'natural-fibers-textile-sorbent-awh': ['https://link.springer.com/article/10.1007/s42765-026-00715-0', 'He Shan：新加坡国立大学材料科学与工程系；与 Swee Ching Tan 同单位。'],
  'thermodynamic-stability-boundary-hygroscopic-composites': ['https://advanced.onlinelibrary.wiley.com/doi/10.1002/adma.74364', 'He Shan：新加坡国立大学电气与计算机工程系；作者还包括 Zhihua Yu、Wei Tang、Zhifeng Hu、Ruzhu Wang。'],
};
const manifest = {};
assert.equal(audit.length, 38);
for (const row of audit) {
  assert.ok(row.exactTitleMatch && row.authorSequenceMatch && row.selfFound, row.id);
  const publisher = publisherChecks[row.id];
  const reason = row.inResearcherOrcid ? 'ORCID 本人作品记录 + DOI、题名、完整作者顺序复核'
    : row.onResearcherPreviousWebsite ? '本人旧个人主页 + Crossref DOI、题名、完整作者顺序复核'
    : publisher ? `出版社作者单位人工复核：${publisher[1]}` : '待确认：题名及 9 位作者顺序匹配，尚缺独立作者身份凭据';
  const sources = [row.inResearcherOrcid ? `https://pub.orcid.org/v3.0/${identity.orcid}/works` : row.onResearcherPreviousWebsite ? row.researcherWebsite : publisher?.[0] ?? row.publisherUrl, row.crossrefSource];
  manifest[row.doi] = { verified: Boolean(row.inResearcherOrcid || row.onResearcherPreviousWebsite || publisher), title: row.title, authors: row.fullAuthors, reason, sources, checkedAt: row.checkedAt };
  const entry = store.automatic.papers[row.id];
  entry.identity = verifyIdentity(entry.metadata, discovery.orcid, identity, manifest);
  entry.reviewReasons = entry.identity.verified ? [] : [reason];
  entry.eligible = entry.identity.verified;
  entry.sources = entry.sources.filter((source) => !['openalex', 'semantic-scholar'].includes(source.source));
}
const removed = [];
for (const id of Object.keys(store.automatic.papers)) {
  if (store.legacy[id]) continue;
  removed.push({ id, doi: store.automatic.papers[id].metadata.doi });
  delete store.automatic.papers[id];
  if (store.overrides[id]) {
    const target = resolve(ROOT, 'src/data/publication-overrides', `${id}.json`);
    assert.equal(dirname(target), resolve(ROOT, 'src/data/publication-overrides'));
    assert.match(id, /^doi-[a-f0-9]{16}$/);
    await unlink(target); // Exact generated file only; full contents backed up above.
  }
}
const ownDois = new Set(discovery.orcid.map((p) => p.doi));
store.automatic.excluded = Object.fromEntries(Object.entries(store.automatic.excluded).filter(([doi]) => ownDois.has(doi)));
await writeJson(resolve(ROOT, 'src/data/publication-verified.json'), manifest);
await writeJson(resolve(ROOT, 'src/data/publications-auto.json'), store.automatic);
await writeJson(resolve(auditRoot, 'cleanup-summary.json'), { removed, retained: 38, verified: Object.values(manifest).filter((p) => p.verified).length, pending: Object.values(manifest).filter((p) => !p.verified).length });
console.log(JSON.stringify({ removed: removed.length, retained: 38, verified: Object.values(manifest).filter((p) => p.verified).length, excluded: Object.keys(store.automatic.excluded).length }));
