import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { load } from 'cheerio';
import { loadStore, writeJson, ROOT } from '../scripts/publications/store.mjs';
import { request, crossrefMetadata, restoreCuratedFullNames } from '../scripts/publications/sources.mjs';
import { normalizeName, normalizeTitle } from '../scripts/publications/model.mjs';

const folder = resolve(ROOT, 'Validation/results/identity-reaudit');
const identity = JSON.parse(await readFile(resolve(ROOT, 'src/data/publication-identity.json'), 'utf8'));
const discovery = JSON.parse(await readFile(resolve(folder, 'discovery.json'), 'utf8'));
const store = await loadStore();
const ownSite = 'https://sites.google.com/view/shanheplus/publications';
const response = await fetch(ownSite, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error('Cannot read researcher publication page');
const $ = load(await response.text()); $('script,style').remove();
const websiteText = normalizeTitle($('body').text());
const papers = Object.entries(store.legacy); const results = []; let cursor = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (cursor < papers.length) {
    const [id, legacy] = papers[cursor++]; const doi = store.automatic.papers[id]?.metadata.doi;
    try {
      const work = (await request(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)).message;
      await writeJson(resolve(folder, 'crossref', `${id}.json`), work);
      const metadata = crossrefMetadata(work, identity);
      const rawSelf = work.author.filter((a) => normalizeName(`${a.given ?? ''} ${a.family ?? ''}`) === 'heshan' || (a.given === 'H.' && a.family === 'Shan'));
      restoreCuratedFullNames(metadata, legacy.authors, identity);
      const row = { id, doi, title: legacy.title, journal: metadata.venue, year: metadata.year,
        type: work.type, exactTitleMatch: normalizeTitle(legacy.title) === normalizeTitle(metadata.title),
        authorSequenceMatch: legacy.authors.map(normalizeName).join('|') === metadata.authorDetails.map((a) => normalizeName(a.name)).join('|'),
        fullAuthors: metadata.authorDetails.map((a) => a.name),
        selfFound: rawSelf.length === 1, authorPosition: work.author.indexOf(rawSelf[0]) + 1,
        selfOrcid: rawSelf[0]?.ORCID ?? '', selfAffiliations: (rawSelf[0]?.affiliation ?? []).map((a) => a.name),
        inResearcherOrcid: discovery.orcid.some((p) => p.doi === doi),
        onResearcherPreviousWebsite: websiteText.includes(normalizeTitle(legacy.title)),
        crossrefSource: metadata.sourceUrl, researcherWebsite: ownSite,
        publisherUrl: work.resource?.primary?.URL ?? '', checkedAt: new Date().toISOString() };
      results.push(row); console.log(JSON.stringify({ id, title: row.exactTitleMatch, authors: row.authorSequenceMatch, orcid: row.inResearcherOrcid, website: row.onResearcherPreviousWebsite, selfOrcid: row.selfOrcid, affiliations: row.selfAffiliations }));
    } catch (error) { results.push({ id, doi, error: error.message }); }
  }
}));
await writeJson(resolve(folder, 'audit.json'), results.sort((a, b) => a.id.localeCompare(b.id)));
console.log(JSON.stringify({ total: results.length, errors: results.filter((r) => r.error).length, orcid: results.filter((r) => r.inResearcherOrcid).length, website: results.filter((r) => r.onResearcherPreviousWebsite).length,
  furtherPublisherChecks: results.filter((r) => !r.error && !r.inResearcherOrcid && !r.onResearcherPreviousWebsite).map((r) => ({ id: r.id, doi: r.doi, title: r.title, publisher: r.publisherUrl })) }));
