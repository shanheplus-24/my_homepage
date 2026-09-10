import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadStore, loadPublicationEntries, ROOT, writeJson } from './store.mjs';
import { normalizeDoi, automaticRevision } from './model.mjs';

export async function confirmPublication({ root = ROOT, review, actor = 'local-owner' }) {
  const [doiValue, revision, extra] = String(review ?? '').trim().split('#');
  const doi = normalizeDoi(doiValue);
  if (!doi || !/^[a-f0-9]{64}$/.test(revision ?? '') || extra !== undefined) throw new Error('Copy the complete confirmation code from the publication dashboard.');
  const store = await loadStore(root);
  const entries = await loadPublicationEntries(root);
  const entry = entries.find((p) => normalizeDoi(p.links.doi) === doi);
  if (!entry) throw new Error('This paper is not eligible for publication. Resolve identity or exclusion issues first.');
  if (automaticRevision(store.automatic.papers[entry.id]) !== revision) throw new Error('Automatic content has changed. Review the latest version and copy its new confirmation code.');
  if (!/^[a-z0-9-]+$/.test(entry.id) || !store.overrides[entry.id]) throw new Error('Invalid publication override');
  const manual = store.overrides[entry.id];
  if (manual.reviewedAutomaticRevision === revision) return { id: entry.id, changed: false };
  await writeJson(resolve(root, 'src/data/publication-overrides', `${entry.id}.json`), {
    ...manual, reviewedAutomaticRevision: revision, reviewedAt: new Date().toISOString(), reviewedBy: actor,
  });
  return { id: entry.id, title: entry.title, changed: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  confirmPublication({ review: process.env.PUBLICATION_REVIEW, actor: process.env.GITHUB_ACTOR || 'local-owner' })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
