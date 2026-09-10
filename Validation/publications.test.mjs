import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { normalizeDoi, paperId, classify, resolvePublication, createOverride, exclusionReason, automaticRevision } from '../scripts/publications/model.mjs';
import { confirmPublication } from '../scripts/publications/confirm.mjs';
import { extractAuthorship, crossrefMetadata, verifyIdentity, allowedUrl, ciescWork, findPublishedDoi, restoreCuratedFullNames, hasInitials } from '../scripts/publications/sources.mjs';
import { loadStore, loadPublicationEntries, writeJson } from '../scripts/publications/store.mjs';
import { sameWork } from '../scripts/publications/identity.mjs';
import { sync } from '../scripts/publications/sync.mjs';

const identity = { orcid: '0000-0002-9105-3006', aliases: ['He Shan'], openalexAuthorIds: [], semanticScholarAuthorIds: [], autoPublishTypes: ['journal-article'] };
const doi = '10.1000/test';
const work = { DOI: doi, title: ['Water electricity generator'], 'container-title': ['Test Journal'], type: 'journal-article', published: { 'date-parts': [[2026, 8, 1]] }, author: [{ given: 'He', family: 'Shan' }, { given: 'Jane', family: 'Doe' }] };
const metadata = crossrefMetadata(work, identity);
const auto = { metadata, eligible: true, classification: classify(metadata.title), authorship: { status: 'unknown' }, identity: { verified: true, policyVersion: 2 } };
test('confirmation is explicit and expires only for substantive automatic changes', () => {
  const revision = automaticRevision(auto);
  assert.equal(resolvePublication('id', null, auto).confirmation.pending, true);
  const manual = { reviewedAutomaticRevision: revision, taxonomyMode: 'manual', domains: ['Food'], methods: [] };
  assert.equal(resolvePublication('id', null, auto, manual).confirmation.pending, false);
  assert.equal(automaticRevision({ ...auto, checkedAt: '2099-01-01', sources: [{ url: 'different-source' }], classification: { ...auto.classification, topics: [{ score: 0.99 }] } }), revision);
  for (const changed of [
    { ...auto, metadata: { ...metadata, title: 'Revised title' } },
    { ...auto, metadata: { ...metadata, authorDetails: metadata.authorDetails.map((a, i) => ({ ...a, coFirst: i === 0 })) } },
    { ...auto, classification: { ...auto.classification, domains: ['Food'] } },
  ]) assert.equal(resolvePublication('id', null, changed, manual).confirmation.pending, true);
  assert.equal(resolvePublication('id', null, { ...auto, identity: { verified: false, policyVersion: 2 } }, manual).visible, false);
});
test('authenticated confirmation preserves manual fields and rejects stale or ineligible requests', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-review-'));
  const id = paperId(doi);
  const manual = { ...createOverride(id, metadata), imageMode: 'manual', image: { src: '/assets/keep.png', alt: 'Keep' }, taxonomyMode: 'manual', domains: ['Food'], methods: [] };
  await writeJson(resolve(root, 'src/data/publications-auto.json'), { papers: { [id]: auto }, imports: {} });
  await writeJson(resolve(root, 'src/data/publication-overrides', `${id}.json`), manual);
  await assert.rejects(confirmPublication({ root, review: `${doi}#${'0'.repeat(64)}` }), /changed/);
  await assert.rejects(confirmPublication({ root, review: `${doi}#${automaticRevision(auto)}#extra` }), /complete/);
  assert.equal((await confirmPublication({ root, review: `${doi}#${automaticRevision(auto)}`, actor: 'owner' })).changed, true);
  const after = (await loadStore(root)).overrides[id];
  assert.deepEqual(after.image, manual.image); assert.deepEqual(after.domains, manual.domains);
  assert.equal(after.reviewedBy, 'owner'); assert.equal((await loadPublicationEntries(root))[0].confirmation.pending, false);
  assert.equal((await confirmPublication({ root, review: `${doi}#${automaticRevision(auto)}` })).changed, false);
  await writeJson(resolve(root, 'src/data/publication-identity.json'), { excludedDois: { [doi]: 'User excluded' } });
  await assert.rejects(confirmPublication({ root, review: `${doi}#${automaticRevision(auto)}` }), /not eligible/);
});
test('conference publications and dataset / database deposits are excluded, even if manually published', () => {
  for (const paper of [{ type: 'proceedings-article' }, { type: 'dataset' }, { doi: '10.5281/zenodo.123' }, { title: 'Global atmospheric water harvesting database' }, { venue: 'Journal of Physics: Conference Series' }]) assert.ok(exclusionReason(paper));
  assert.equal(exclusionReason({ type: 'journal-article', title: 'Atmospheric water harvesting', venue: 'Nature Water' }), '');
  assert.equal(resolvePublication('id', null, { ...auto, metadata: { ...metadata, crossrefType: 'proceedings-article' } }, { visibility: 'published' }).visible, false);
});
test('DOI normalization and stable identity across URL / case / escaped input', () => {
  assert.equal(normalizeDoi(' https://doi.org/10.1000%2FTEST '), doi);
  assert.equal(paperId(doi), paperId('https://doi.org/10.1000/TEST'));
  assert.equal(normalizeDoi('javascript:alert(1)'), '');
  assert.equal(normalizeDoi('10.1000/with space'), '');
});
test('classification is multi-label and does not accept irrelevant database topics as labels', () => {
  assert.deepEqual(classify('Water electricity generator').domains, ['Water', 'Energy']);
  assert.deepEqual(classify('Unspecified work', '', [{ name: 'Fiscal Policies' }]).domains, []);
  assert.ok(classify('Physics-informed neural network for thermal storage').methods.includes('AI'));
});
test('all existing 38 records preserve author sequence, roles, images and slugs', async () => {
  const store = await loadStore();
  assert.equal(Object.keys(store.legacy).length, 38);
  for (const [id, legacy] of Object.entries(store.legacy)) {
    const result = resolvePublication(id, legacy, store.automatic.papers[id], createOverride(id, legacy, true));
    assert.equal(result.id, id); assert.deepEqual(result.authors, legacy.authors);
    assert.deepEqual(result.image, legacy.image); assert.equal(result.title, legacy.title);
    assert.equal(result.sortOrder, legacy.sortOrder); if (result.visible) assert.equal(store.automatic.papers[id].identity.verified, true);
  }
});
test('manual taxonomy, full names, roles and image survive newer automatic data', () => {
  const manual = { ...createOverride('id', metadata), taxonomyMode: 'manual', domains: ['Food'], methods: [], authorsMode: 'manual', authorDetails: [{ name: 'He Shan', coFirst: true, corresponding: false, isSelf: true }], imageMode: 'manual', image: { src: '/assets/manual.png', alt: 'Manual image' } };
  const result = resolvePublication('id', null, auto, manual);
  assert.deepEqual(result.domains, ['Food']); assert.deepEqual(result.methods, []);
  assert.equal(result.authors[0], 'He Shan†'); assert.equal(result.image.src, '/assets/manual.png');
  assert.equal(resolvePublication('id', null, auto, { ...manual, image: { src: '', alt: '' } }).image, null);
  assert.deepEqual(resolvePublication('id', null, auto, { ...manual, taxonomyMode: 'auto' }).domains, ['Water', 'Energy']);
});
test('accepted paper gains DOI and publication status without losing manual title', () => {
  const legacy = { title: 'Accepted title', venue: 'Test Journal', year: 2026, status: 'accepted', authors: ['He Shan'], image: { src: '/a.png', alt: 'a' } };
  const manual = createOverride('accepted-slug', legacy, true);
  const result = resolvePublication('accepted-slug', legacy, auto, manual);
  assert.equal(result.id, 'accepted-slug'); assert.equal(result.status, 'published'); assert.equal(result.title, 'Accepted title'); assert.equal(result.links.doi, `https://doi.org/${doi}`);
});
test('unknown identity is held for review; explicit hide and exclusion always win', () => {
  assert.equal(resolvePublication('id', null, { ...auto, eligible: false }).visible, false);
  assert.equal(resolvePublication('id', null, { ...auto, eligible: false }, { visibility: 'published' }).visible, true);
  for (const visibility of ['hidden', 'excluded']) assert.equal(resolvePublication('id', null, auto, { visibility }).visible, false);
  assert.equal(verifyIdentity(metadata, [], identity).verified, false);
  assert.equal(verifyIdentity(metadata, [{ source: 'orcid', doi, title: metadata.title, evidence: 'https://orcid.org' }], identity).verified, true);
});
test('leading author statement identifies co-first; generic and senior contribution do not', () => {
  const authors = [{ name: 'Weixin Guan' }, { name: 'Yaxuan Zhao' }, { name: 'He Shan' }, { name: 'Guihua Yu' }];
  const result = extractAuthorship('<p>Weixin Guan, Yaxuan Zhao and He Shan contributed equally to this work.</p>', authors, 'https://www.nature.com/article');
  assert.deepEqual(result.authors.map((a) => a.coFirst), [true, true, true, false]);
  for (const text of ['All authors contributed equally.', 'He Shan and Guihua Yu contributed equally as senior authors.', 'He Shan contributed to writing and Weixin Guan performed experiments.']) {
    assert.equal(extractAuthorship(`<p>${text}</p>`, authors, 'https://www.nature.com/article').status, 'unknown');
  }
});
test('JATS footnote references resolve roles; equal-contrib alone remains unknown', () => {
  const authors = [{ name: 'He Shan' }, { name: 'Jane Doe' }, { name: 'John Smith' }];
  const xml = '<article><contrib-group><contrib><name><given-names>He</given-names><surname>Shan</surname></name><xref rid="equal"/></contrib><contrib><name><given-names>Jane</given-names><surname>Doe</surname></name><xref rid="equal"/></contrib></contrib-group><fn id="equal">These authors contributed equally.</fn></article>';
  assert.deepEqual(extractAuthorship(xml, authors, 'https://www.ebi.ac.uk/article', true).authors.map((a) => a.coFirst), [true, true, false]);
  assert.equal(extractAuthorship('<contrib equal-contrib="yes"/>', authors, 'https://www.ebi.ac.uk/article', true).status, 'unknown');
});
test('publisher fetch allows only explicitly supported HTTPS hosts', () => {
  for (const url of ['http://127.0.0.1/', 'https://www.nature.com.evil.test/', 'https://user:pass@www.nature.com/', 'https://www.nature.com:1234/']) assert.equal(allowedUrl(url), false);
  assert.equal(allowedUrl('https://pubs.rsc.org/article'), true);
});
test('an OpenAlex ORCID match without established coauthors does not admit a namesake', () => {
  const candidates = [{ source: 'openalex', authorships: [{ author: { display_name: 'He Shan', orcid: `https://orcid.org/${identity.orcid}` } }] }];
  assert.equal(verifyIdentity(metadata, candidates, { ...identity, knownCoauthors: ['Ruzhu Wang', 'Zhenyuan Xu'], earliestYear: 2020 }).verified, false);
});
test('mixed aggregator profiles never prove identity, including established coauthors', () => {
  const enriched = { ...metadata, authorDetails: [...metadata.authorDetails, { name: 'Ruzhu Wang' }, { name: 'Zhenyuan Xu' }] };
  for (const source of ['openalex', 'semantic-scholar', 'legacy']) {
    const candidates = [{ doi, title: metadata.title, source, authorships: [{ author: { display_name: 'He Shan', orcid: `https://orcid.org/${identity.orcid}` } }] }];
    assert.equal(verifyIdentity(enriched, candidates, { ...identity, knownCoauthors: ['Ruzhu Wang', 'Zhenyuan Xu'] }).verified, false);
  }
});
test('identity requires exact ORCID authority, DOI, title and reviewed author sequence', () => {
  const candidates = [{ doi, title: metadata.title, source: 'orcid' }];
  assert.equal(verifyIdentity(metadata, [{ ...candidates[0], title: 'Unrelated title' }], identity).verified, false);
  assert.equal(verifyIdentity(metadata, [{ ...candidates[0], doi: '10.1000/other' }], identity).verified, false);
  for (const orcid of ['https://evil.test/' + identity.orcid, '0000-0000-0000-0001']) {
    const conflicting = { ...metadata, authorDetails: metadata.authorDetails.map((a) => a.isSelf ? { ...a, orcid } : a) };
    assert.equal(verifyIdentity(conflicting, candidates, identity).conflict, true);
  }
  const reviewed = { [doi]: { verified: true, title: metadata.title, authors: metadata.authorDetails.map((a) => a.name), reason: 'Publisher affiliation reviewed', sources: ['https://example.org'] } };
  assert.equal(verifyIdentity(metadata, [], identity, reviewed).verified, true);
  assert.equal(verifyIdentity({ ...metadata, authorDetails: [...metadata.authorDetails].reverse() }, [], identity, reviewed).verified, false);
  assert.equal(sameWork(metadata, { doi, title: 'Different title' }), false);
  assert.equal(verifyIdentity({ ...metadata, authorDetails: [{ name: 'Shan He', orcid: '' }] }, candidates, identity).verified, false);
});
test('legacy presence, stale identity cache and publication toggle cannot bypass identity review', () => {
  const legacy = { title: metadata.title, venue: metadata.venue, year: 2026, authors: ['He Shan'] };
  for (const record of [{ ...auto, identity: { verified: true } }, { ...auto, identity: { verified: false, policyVersion: 2 } }]) {
    assert.equal(resolvePublication('id', legacy, record, { visibility: 'published' }).visible, false);
  }
  assert.equal(resolvePublication('id', legacy, auto, { doiMode: 'manual', doi: '10.1000/unverified' }).visible, false);
});
test('production library does not retain contaminated candidates; visible papers have identity evidence', async () => {
  const store = await loadStore();
  const contaminated = ['doi-50ec0973b856ca56','doi-ba40cfe170fa319e','doi-37bad782533bd145','doi-4b90c1b6e6627b3f','doi-ee7fb718e8a8ef86','doi-e994f31867db048f','doi-d5e1b9ac97e952b7','doi-b736ba4b05c81704','doi-207ca0781324dd18','doi-2e8d3258016de772','doi-427e3c6798e4f4f0','doi-a5bfe6e40c89e7f8'];
  for (const id of contaminated) { assert.equal(store.automatic.papers[id], undefined); assert.equal(store.overrides[id], undefined); }
  for (const entry of await loadPublicationEntries()) {
    assert.equal(store.automatic.papers[entry.id].identity.policyVersion, 2);
    assert.ok(store.automatic.papers[entry.id].identity.source || store.automatic.papers[entry.id].identity.reason === 'Authorship explicitly confirmed in DOI import form');
  }
});
test('publisher fallback normalizes both capitalized family name positions and rejects DOI mismatch', () => {
  const html = '<meta name="citation_doi" content="10.11949/0438-1157.123"><meta name="citation_journal_title" content="CIESC Journal"><meta name="citation_authors" content="SHAN He, Zhanyu YE"><meta name="citation_publication_date" content="2023-06-05"><meta name="citation_issue" content="S1"><body>Title[J]</body>';
  const work = ciescWork(html, '10.11949/0438-1157.123');
  assert.deepEqual(work.author, [{ given: 'He', family: 'Shan' }, { given: 'Zhanyu', family: 'Ye' }]);
  assert.equal(work.issue, 'S1');
  assert.throws(() => ciescWork(html, '10.11949/0438-1157.999'));
});
test('title discovery requires an exact title and researcher match, and rejects ambiguity', async () => {
  const original = globalThis.fetch;
  let items = [work];
  globalThis.fetch = async () => Response.json({ message: { items } });
  try {
    assert.equal((await findPublishedDoi({ title: 'Water electricity generator' }, identity)).doi, doi);
    items = [work, { ...work, DOI: '10.1000/other' }];
    assert.equal(await findPublishedDoi({ title: 'Water electricity generator' }, identity), null);
    items = [{ ...work, title: ['Unrelated title'] }];
    assert.equal(await findPublishedDoi({ title: 'Water electricity generator' }, identity), null);
  } finally { globalThis.fetch = original; }
});
test('initials expand only against the same curated author position and matching family', () => {
  assert.equal(hasInitials('Keith P. Johnston'), false);
  assert.equal(hasInitials('Ruzhu W.'), true);
  const metadata = { authorDetails: [{ name: 'Q.W. Pan', given: 'Q.W.', family: 'Pan' }, { name: 'H. Shan', given: 'H.', family: 'Shan' }] };
  restoreCuratedFullNames(metadata, ['Quanwen Pan', 'He Shan'], identity);
  assert.deepEqual(metadata.authorDetails.map((a) => a.name), ['Quanwen Pan', 'He Shan']);
  assert.equal(metadata.authorDetails[1].isSelf, true);
  const conflict = { authorDetails: [{ name: 'H. Shan', given: 'H.', family: 'Shan' }] };
  restoreCuratedFullNames(conflict, ['He Wang'], identity);
  assert.equal(conflict.authorDetails[0].name, 'H. Shan');
});
test('synchronization is idempotent, DOI imports deduplicate, and source failure preserves data', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-sync-test-'));
  await writeJson(resolve(root, 'src/data/publication-identity.json'), identity);
  await writeJson(resolve(root, 'src/data/publication-imports/import.json'), { doi: 'https://doi.org/10.1000/TEST' });
  const realFetch = globalThis.fetch;
  let fail = false;
  globalThis.fetch = async (url) => {
    if (fail) return new Response('{}', { status: 403 });
    if (url.includes('pub.orcid.org')) return Response.json({ group: [{ 'work-summary': [{ title: {title: {value: work.title[0]}}, 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': doi, 'external-id-relationship': 'self' }] } }] }] });
    if (url.includes('crossref.org')) return Response.json({ message: work });
    if (url.includes('/works?')) return Response.json({ results: [], meta: {} });
    return Response.json({ doi, topics: [] });
  };
  try {
    const first = await sync({ root, write: true, publisher: false }); assert.equal(first.added.length, 1);
    const path = resolve(root, 'src/data/publications-auto.json');
    const original = await readFile(path, 'utf8');
    const second = await sync({ root, write: true, publisher: false }); assert.equal(second.added.length, 0);
    assert.equal(await readFile(path, 'utf8'), original);
    assert.equal((await loadPublicationEntries(root)).length, 1);
    fail = true;
    await sync({ root, write: true, refresh: true, publisher: false });
    const after = await loadStore(root); assert.equal(Object.keys(after.automatic.papers).length, 1);
    assert.deepEqual(after.automatic.papers, JSON.parse(original).papers);
    await writeJson(resolve(root, 'src/data/publication-identity.json'), { ...identity, excludedDois: { [doi]: 'User exclusion' } });
    await writeJson(resolve(root, 'src/data/publication-overrides', `${paperId(doi)}.json`), { ...createOverride(paperId(doi), metadata), visibility: 'published' });
    assert.equal((await loadPublicationEntries(root)).length, 0);
    const excluded = await sync({ root, write: true, publisher: false });
    assert.equal(excluded.excluded[0].reason, 'User exclusion');
  } finally { globalThis.fetch = realFetch; }
});
