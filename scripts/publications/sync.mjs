import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadStore, readJson, writeJson, ROOT } from './store.mjs';
import { normalizeDoi, normalizeTitle, paperId, classify, createOverride, validAuthors, exclusionReason } from './model.mjs';
import { IDENTITY_POLICY_VERSION, sameWork } from './identity.mjs';
import { request, orcidWorks, crossrefMetadata, verifyIdentity, enrichPublisher, findPublishedDoi, bibliographicWork, restoreCuratedFullNames, hasInitials } from './sources.mjs';

export async function sync({ root = ROOT, write = false, refresh = false, limit = Infinity, publisher = true, suppliedDoi = '' } = {}) {
  const identity = await readJson(resolve(root, 'src/data/publication-identity.json'));
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(identity.orcid)) throw new Error('Configure a valid researcher ORCID');
  const store = await loadStore(root);
  const reviewed = await readJson(resolve(root, 'src/data/publication-verified.json'), {});
  const automatic = structuredClone(store.automatic);
  automatic.excluded ??= {};
  const report = { startedAt: new Date().toISOString(), write, discovered: 0, added: [], updated: [], candidates: [], enrichedExisting: [], excluded: [], pending: [], skipped: [], failures: [], sources: [] };
  const candidates = new Map();
  const add = (item) => {
    const doi = normalizeDoi(item.doi); if (!doi) return;
    candidates.set(doi, [...(candidates.get(doi) ?? []), { ...item, doi }]);
  };
  // Author profiles in aggregators can merge namesakes, even with a linked ORCID.
  const sources = [['orcid', () => orcidWorks(identity.orcid)]];
  const results = await Promise.allSettled(sources.map(([, run]) => run()));
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      result.value.forEach(add); report.sources.push({ name: sources[i][0], ok: true, count: result.value.length });
    } else { report.sources.push({ name: sources[i][0], ok: false }); report.failures.push({ source: sources[i][0], error: result.reason.message }); }
  });
  const doiToId = new Map(); const titles = new Map();
  for (const [id, entry] of Object.entries(store.legacy)) {
    const doi = normalizeDoi(entry.doi); if (doi) { doiToId.set(doi, id); add({ doi, source: 'legacy' }); }
    if (!doi && !automatic.papers[id]?.metadata?.doi && !suppliedDoi) {
      try { const found = await findPublishedDoi(entry, identity); if (found) add(found); }
      catch (error) { report.failures.push({ id, source: 'title-search', error: error.message }); }
    }
    const key = normalizeTitle(entry.title); titles.set(key, [...(titles.get(key) ?? []), { id, doi }]);
  }
  for (const [id, entry] of Object.entries(automatic.papers)) {
    const doi = normalizeDoi(entry.metadata.doi); if (doi) { doiToId.set(doi, id); add({ doi, source: 'cached' }); }
    const key = normalizeTitle(entry.metadata.title);
    if (!titles.get(key)?.some((p) => p.id === id)) titles.set(key, [...(titles.get(key) ?? []), { id, doi }]);
  }
  for (const [id, entry] of Object.entries(store.overrides)) {
    const doi = normalizeDoi(entry.doi);
    if (doi && !doiToId.has(doi)) doiToId.set(doi, id);
  }
  for (const [id, entry] of Object.entries(store.imports)) {
    const doi = normalizeDoi(entry.doi);
    if (doi) add({ doi, source: 'manual-import', importId: id, confirmed: entry.confirmAuthorship === true });
    else automatic.imports[id] = { status: 'error', message: 'Invalid DOI' };
  }
  if (suppliedDoi) {
    if (!normalizeDoi(suppliedDoi)) throw new Error('Invalid --doi');
    add({ doi: suppliedDoi, source: 'manual-import' });
  }
  report.discovered = candidates.size;
  const newOverrides = {};
  const selected = [...candidates].filter(([doi]) => !suppliedDoi || doi === normalizeDoi(suppliedDoi));
  let cursor = 0; let processed = 0;
  const processPaper = async ([doi, discoveries]) => {
    let id = doiToId.get(doi) || paperId(doi);
    const prior = automatic.papers[id];
    const exclude = (reason, title = discoveries.find((d) => d.title)?.title ?? '') => {
      const item = { doi, title, reason };
      automatic.excluded[doi] = item;
      if (automatic.papers[id]) automatic.papers[id] = { ...automatic.papers[id], eligible: false, reviewReasons: [reason] };
      report.excluded.push(item);
      for (const d of discoveries.filter((d) => d.importId)) automatic.imports[d.importId] = { status: 'excluded', message: reason, doi };
    };
    const preliminaryExclusion = identity.excludedDois?.[doi] || exclusionReason({ doi, title: discoveries.find((d) => d.title)?.title });
    if (preliminaryExclusion) { exclude(preliminaryExclusion); return; }
    if (store.overrides[id]?.visibility === 'excluded') { report.skipped.push({ id, reason: 'excluded' }); return; }
    if (!refresh && prior?.identity?.policyVersion === IDENTITY_POLICY_VERSION && Date.now() - Date.parse(prior.checkedAt) < 7 * 86400000 && !discoveries.some((d) => d.source === 'manual-import' && automatic.imports[d.importId]?.status !== 'complete')) {
      report.skipped.push({ id, reason: 'fresh-cache' }); return;
    }
    try {
      console.log(`Checking ${doi}`);
      const work = await bibliographicWork(doi);
      const excluded = exclusionReason({ doi, type: work.type, title: work.title?.[0], venue: work['container-title']?.[0] });
      if (excluded) { exclude(excluded, work.title?.[0] ?? ''); return; }
      const metadata = crossrefMetadata(work, identity);
      if (metadata.doi !== doi) throw new Error('Bibliographic DOI mismatch');
      const reviewReasons = [];
      const matches = titles.get(normalizeTitle(metadata.title)) ?? [];
      if (!doiToId.has(doi) && matches.length) {
        const withoutDoi = matches.filter((p) => !p.doi);
        if (matches.length === 1 && withoutDoi.length === 1) {
          id = withoutDoi[0].id; // accepted record gaining its first DOI keeps its original slug
        } else if (matches.some((p) => p.doi && p.doi !== doi)) {
          reviewReasons.push('Similar title with another DOI: verify version relationship');
        }
      }
      restoreCuratedFullNames(metadata, store.legacy[id]?.authors, identity);
      let identityResult = verifyIdentity(metadata, discoveries, identity, reviewed);
      if (!identityResult.verified && !identityResult.conflict && discoveries.some((c) => c.source === 'manual-import' && c.confirmed))
        identityResult = { verified: true, policyVersion: IDENTITY_POLICY_VERSION, reason: 'Authorship explicitly confirmed in DOI import form' };
      if (!identityResult.verified) reviewReasons.push(identityResult.reason);
      if (!identity.autoPublishTypes.includes(work.type)) reviewReasons.push(`Review document type: ${work.type}`);
      if (!store.legacy[id] && /^(?:S\d|suppl)/i.test(work.issue ?? '')) reviewReasons.push('Journal supplement: confirm this is not a conference publication before publishing');
      if (/^(?:correction|corrigendum|erratum|retraction|withdrawal)\b/i.test(metadata.title)) reviewReasons.push('Correction or retraction notice');
      if (Object.keys(work.relation ?? {}).some((key) => /preprint|version/.test(key))) reviewReasons.push('Version relationship requires review');
      if (!metadata.title || !metadata.venue || !validAuthors(metadata.authorDetails) || metadata.year < 1900 || metadata.year > new Date().getFullYear() + 1) reviewReasons.push('Incomplete or implausible bibliographic metadata');
      if (metadata.authorDetails.some((author) => hasInitials(author.name))) reviewReasons.push('Abbreviated author names require publisher or manual confirmation');
      let topics = [];
      try {
        const oa = await request(`https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`, { retries: 0, headers: process.env.OPENALEX_API_KEY ? { Authorization: `Bearer ${process.env.OPENALEX_API_KEY}` } : {} });
        if (sameWork(metadata, oa)) {
          topics = (oa.topics ?? []).map((t) => ({ id: t.id, name: t.display_name, score: t.score }));
          if (!metadata.abstract && oa.abstract_inverted_index) {
            const words = []; for (const [word, positions] of Object.entries(oa.abstract_inverted_index)) for (const pos of positions) if (Number.isInteger(pos) && pos < 20000) words[pos] = word;
            metadata.abstract = words.join(' ');
          }
        }
      } catch (e) { report.failures.push({ doi, source: 'openalex-enrichment', error: e.message }); }
      const authorship = publisher ? await enrichPublisher(work, metadata) : { status: 'unknown', evidence: [], authors: metadata.authorDetails, failures: [] };
      metadata.authorDetails = authorship.authors;
      const { authors, ...authorshipData } = authorship;
      // An inaccessible source never erases previously established contribution evidence.
      const previous = automatic.papers[id];
      if (authorship.status === 'unknown' && previous?.authorship?.status === 'confirmed') {
        const oldNames = previous.metadata.authorDetails.map((a) => a.name);
        if (JSON.stringify(oldNames) === JSON.stringify(metadata.authorDetails.map((a) => a.name))) {
          metadata.authorDetails = previous.metadata.authorDetails;
          Object.assign(authorshipData, previous.authorship);
        } else reviewReasons.push('Author list changed; existing contribution evidence needs review');
      }
      const origin = store.legacy[id] ? 'legacy' : previous?.origin ?? (discoveries.some((d) => d.source === 'manual-import') ? 'manual' : 'automatic');
      const entry = { origin, metadata, identity: identityResult, classification: classify(metadata.title, metadata.abstract, topics),
        authorship: authorshipData, eligible: reviewReasons.length === 0, reviewReasons,
        sources: discoveries.filter((d) => d.evidence).map(({ source, evidence }) => ({ source, url: evidence })) };
      // Refresh timestamps only when content changes, so scheduled checks are idempotent.
      const { checkedAt: ignored, ...previousContent } = previous ?? {};
      if (JSON.stringify(previousContent) !== JSON.stringify(entry)) {
        automatic.papers[id] = { ...entry, checkedAt: new Date().toISOString() };
        const item = { id, doi, title: metadata.title, year: metadata.year, venue: metadata.venue, fields: ['bibliographic metadata', 'full author names', ...(metadata.abstract ? ['abstract'] : []), 'classification suggestions', ...(authorshipData.status === 'confirmed' ? ['co-first evidence'] : [])] };
        (store.legacy[id] ? report.enrichedExisting : !entry.eligible ? report.candidates : previous?.eligible ? report.updated : report.added).push(item);
      }
      doiToId.set(doi, id);
      if (!store.overrides[id]) newOverrides[id] = createOverride(id, metadata);
      if (reviewReasons.length) report.pending.push({ id, reasons: reviewReasons });
      for (const discovery of discoveries.filter((d) => d.importId)) automatic.imports[discovery.importId] = { status: 'complete', publicationId: id, doi };
    } catch (error) {
      report.failures.push({ doi, source: 'paper', error: error.message });
      for (const d of discoveries.filter((d) => d.importId)) automatic.imports[d.importId] = { status: 'error', message: error.message };
    }
  };
  // Two papers in flight keeps public API load modest; each provider also retries transient failures.
  await Promise.all(Array.from({ length: 2 }, async () => {
    while (cursor < selected.length && processed < limit) { const item = selected[cursor++]; processed++; await processPaper(item); }
  }));
  if (write) {
    await writeJson(resolve(root, 'src/data/publications-auto.json'), automatic);
    for (const [id, entry] of Object.entries(newOverrides)) await writeJson(resolve(root, 'src/data/publication-overrides', `${id}.json`), entry);
  }
  await writeJson(resolve(root, 'Output/publication-sync-report.json'), report);
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const option = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  sync({ write: args.includes('--write'), refresh: args.includes('--refresh'), publisher: !args.includes('--no-publisher'), limit: Number(option('--limit') ?? Infinity), suppliedDoi: option('--doi') ?? '' })
    .then((r) => { console.log(JSON.stringify({ added: r.added.length, updated: r.updated.length, enrichedExisting: r.enrichedExisting.length, excluded: r.excluded.length, pending: r.pending.length, failures: r.failures.length, report: 'Output/publication-sync-report.json' })); if (r.failures.some((f) => f.source === 'paper') || r.sources.every((s) => !s.ok)) process.exitCode = 1; })
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
