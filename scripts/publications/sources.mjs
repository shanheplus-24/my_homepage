import { load } from 'cheerio';
import { cleanText, normalizeDoi, normalizeName, normalizeTitle } from './model.mjs';
import { normalizeOrcid } from './identity.mjs';
export { verifyIdentity } from './identity.mjs';

const allowedHosts = ['api.crossref.org', 'api.openalex.org', 'api.semanticscholar.org', 'pub.orcid.org',
  'www.ebi.ac.uk', 'www.nature.com', 'nature.com', 'onlinelibrary.wiley.com', 'advanced.onlinelibrary.wiley.com',
  'pubs.rsc.org', 'pubs.acs.org', 'www.cell.com', 'www.sciencedirect.com', 'api.elsevier.com', 'pmc.ncbi.nlm.nih.gov', 'hgxb.cip.com.cn'];
export function allowedUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.port && allowedHosts.includes(u.hostname); }
  catch { return false; }
}
export async function request(url, { json = true, headers = {}, retries = 1, timeout = 15000 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let target = url;
      for (let redirects = 0; redirects < 5; redirects++) {
        if (!allowedUrl(target)) throw new Error('Unsupported source host');
        const response = await fetch(target, { headers: { Accept: json ? 'application/json' : 'text/html,application/xml', 'User-Agent': 'ShanHePlus-Publications/1.0', ...headers }, redirect: 'manual', signal: AbortSignal.timeout(timeout) });
        if ([301, 302, 303, 307, 308].includes(response.status)) { target = new URL(response.headers.get('location'), target).href; continue; }
        if (!response.ok) {
          const error = new Error(`Source HTTP ${response.status}: ${new URL(target).hostname}`);
          error.retryable = response.status === 429 || response.status >= 500;
          throw error;
        }
        const reader = response.body.getReader();
        const chunks = []; let size = 0;
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength;
          if (size > 6_000_000) { await reader.cancel(); throw new Error('Source exceeds size limit'); }
          chunks.push(value);
        }
        const text = Buffer.concat(chunks).toString('utf8');
        return json ? JSON.parse(text) : text;
      }
      throw new Error('Too many redirects');
    } catch (e) {
      if (attempt === retries || e.retryable === false || /HTTP (?:400|401|403|404)|Unsupported/.test(e.message)) throw e;
      await new Promise((done) => setTimeout(done, 1000 * (attempt + 1)));
    }
  }
}
export const textContent = (html = '') => load(String(html)).text().replace(/\s+/g, ' ').trim();
export async function findPublishedDoi(legacy, identity) {
  const url = `https://api.crossref.org/works?query.title=${encodeURIComponent(legacy.title)}&filter=type:journal-article&rows=5`;
  const data = await request(url);
  const matches = (data.message?.items ?? []).filter((work) =>
    normalizeTitle(work.title?.[0]) === normalizeTitle(legacy.title) &&
    work.author?.some((a) => identity.aliases.some((name) => normalizeName(name) === normalizeName(`${a.given ?? ''} ${a.family ?? ''}`))));
  return matches.length === 1 ? { doi: matches[0].DOI, title: legacy.title, source: 'title-match', evidence: url } : null;
}
// CIESC DOIs are not registered with Crossref. Require publisher citation metadata
// and an explicit journal citation, and retain supplement information for review.
export function ciescWork(html, doi) {
  const $ = load(html);
  const meta = (name) => $(`meta[name="${name}"]`).attr('content') ?? '';
  if (normalizeDoi(meta('citation_doi')) !== doi || meta('citation_journal_title') !== 'CIESC Journal' || !/\[J\]/.test($('body').text())) throw new Error('Publisher journal metadata could not be verified');
  const names = (meta('citation_authors')).split(/[,;]/).map((value) => value.trim()).filter(Boolean);
  const author = names.map((name) => {
    const parts = name.split(/\s+/);
    const familyIndex = parts.findIndex((part) => /^[A-Z]{2,}$/.test(part));
    if (familyIndex < 0) throw new Error('Publisher author name order is ambiguous');
    const family = parts.splice(familyIndex, 1)[0].toLowerCase().replace(/^./, (c) => c.toUpperCase());
    return { given: parts.join(' '), family };
  });
  return { DOI: doi, title: [meta('citation_title')], 'container-title': [meta('citation_journal_title')],
    type: 'journal-article', issue: meta('citation_issue'), author,
    published: { 'date-parts': [meta('citation_publication_date').split('-').map(Number)] },
    metadataSource: `https://hgxb.cip.com.cn/EN/${doi}`, resource: { primary: { URL: `https://hgxb.cip.com.cn/EN/${doi}` } } };
}
export async function bibliographicWork(doi) {
  try { return (await request(`https://api.crossref.org/works/${encodeURIComponent(doi)}`)).message; }
  catch (error) {
    if (!/HTTP 404/.test(error.message) || !doi.startsWith('10.11949/0438-1157.')) throw error;
    return ciescWork(await request(`https://hgxb.cip.com.cn/EN/${doi}`, { json: false }), doi);
  }
}
export async function orcidWorks(orcid) {
  const url = `https://pub.orcid.org/v3.0/${orcid}/works`;
  const data = await request(url, { headers: { Accept: 'application/vnd.orcid+json' } });
  if (!Array.isArray(data.group)) throw new Error('Invalid ORCID works response');
  const works = [];
  for (const group of data.group) for (const summary of group['work-summary'] ?? []) {
    for (const identifier of summary['external-ids']?.['external-id'] ?? []) {
      if (identifier['external-id-type'] !== 'doi' || identifier['external-id-relationship'] !== 'self') continue;
      const doi = normalizeDoi(identifier['external-id-value']);
      if (doi) works.push({ doi, title: summary.title?.title?.value ?? '', source: 'orcid', evidence: url });
    }
  }
  return works;
}
export async function openalexWorks(identity) {
  const filters = [`authorships.author.orcid:https://orcid.org/${identity.orcid}`, ...identity.openalexAuthorIds.map((id) => `authorships.author.id:${id}`)];
  const results = [];
  const headers = process.env.OPENALEX_API_KEY ? { Authorization: `Bearer ${process.env.OPENALEX_API_KEY}` } : {};
  for (const filter of filters) {
    let cursor = '*';
    for (let page = 0; cursor && page < 100; page++) {
      const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filter)}&per_page=100&cursor=${encodeURIComponent(cursor)}`;
      const data = await request(url, { headers });
      if (!Array.isArray(data.results)) throw new Error('Invalid OpenAlex works response');
      for (const work of data.results) {
        const doi = normalizeDoi(work.doi);
        if (doi) results.push({ doi, title: work.title, source: 'openalex', evidence: work.id, authorships: work.authorships });
      }
      cursor = data.results.length ? data.meta?.next_cursor : null;
    }
  }
  return results;
}
export async function semanticScholarWorks(identity) {
  const works = [];
  const headers = process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY } : {};
  for (const id of identity.semanticScholarAuthorIds) {
    for (let offset = 0; offset !== undefined;) {
      const url = `https://api.semanticscholar.org/graph/v1/author/${id}/papers?fields=title,externalIds,authors&limit=100&offset=${offset}`;
      const data = await request(url, { headers });
      if (!Array.isArray(data.data)) throw new Error('Invalid Semantic Scholar response');
      for (const work of data.data) {
        const doi = normalizeDoi(work.externalIds?.DOI);
        if (doi) works.push({ doi, title: work.title, source: 'semantic-scholar', evidence: `https://www.semanticscholar.org/paper/${work.paperId}` });
      }
      offset = data.next;
    }
  }
  return works;
}
export function crossrefMetadata(work, identity) {
  if (!work?.DOI || !Array.isArray(work.author)) throw new Error('Incomplete Crossref record');
  const authorDetails = work.author.map((a) => ({ name: cleanText(a.name || [a.given, a.family].filter(Boolean).join(' ')),
    given: a.given ?? '', family: a.family ?? '', orcid: a.ORCID ?? '', coFirst: false, corresponding: false,
    isSelf: normalizeOrcid(a.ORCID) === identity.orcid || identity.aliases.some((name) => normalizeName(name) === normalizeName([a.given, a.family].filter(Boolean).join(' '))) }));
  const date = work['published-online']?.['date-parts']?.[0] ?? work.published?.['date-parts']?.[0] ?? work['published-print']?.['date-parts']?.[0];
  const doi = normalizeDoi(work.DOI);
  const relation = work.relation ?? {};
  return { doi, title: textContent(work.title?.[0] ?? ''), venue: textContent(work['container-title']?.[0] ?? ''),
    year: date?.[0] ?? 0, publicationDate: date?.join('-') ?? '',
    status: 'published', type: work.type === 'posted-content' ? 'preprint' : work.type === 'proceedings-article' ? 'conference' : 'journal',
    crossrefType: work.type, authorDetails, abstract: textContent(work.abstract ?? ''),
    links: { doi: `https://doi.org/${doi}` }, relations: relation,
    issue: work.issue ?? '', sourceUrl: work.metadataSource ?? `https://api.crossref.org/works/${encodeURIComponent(doi)}` };
}
// A full first name with a publisher-supplied middle initial is not a first-name abbreviation.
export const hasInitials = (name) => /^(?:[A-Z]\.)+(?:\s|$)|^[A-Z](?:\s|$)|\s(?:[A-Z]\.)+$|\s[A-Z]$/.test(name);
export function restoreCuratedFullNames(metadata, curated, identity) {
  if (!curated || curated.length !== metadata.authorDetails.length) return;
  metadata.authorDetails = metadata.authorDetails.map((author, index) => {
    if (!hasInitials(author.name)) return author;
    const name = curated[index].replace(/[†*]/g, '').trim();
    const parts = name.split(/\s+/); const family = parts.pop(); const given = parts.join(' ');
    const initials = (author.given ?? '').replace(/[^A-Za-z]/g, '').toLowerCase();
    if (hasInitials(name) || !initials || normalizeName(family) !== normalizeName(author.family) ||
      !new RegExp(`^${initials.split('').join('.*')}`, 'i').test(normalizeName(given))) return author;
    return { ...author, name, given, family, sourceName: author.name, nameSource: 'Existing curated record: matching DOI, author position, family and initials',
      isSelf: identity.aliases.some((alias) => normalizeName(alias) === normalizeName(name)) };
  });
}
export function extractAuthorship(html, authors, url, xml = false) {
  const $ = load(html, xml ? { xmlMode: true } : undefined);
  $('script,style,nav,header,footer').remove();
  const evidence = []; const coFirst = new Set(); const corresponding = new Set();
  const normalize = (s) => normalizeName(s);
  const findNamed = (text) => authors.map((a, i) => ({ a, i })).filter(({ a }) => normalize(text).includes(normalize(a.name))).map(({ i }) => i);
  // Inspect short footnotes/paragraphs, not page-wide text containing every author.
  $('fn, p, li, .author-contribution, .c-article-author-list__item').each((_, node) => {
    const text = $(node).text().replace(/\s+/g, ' ').trim();
    if (!/contribut(?:ed|ion).*equal|equal.*contribut|joint.first|co.first|shared.first/i.test(text) || text.length > 1000) return;
    if (/senior|last author|supervis|corresponding/i.test(text)) return;
    let indices = findNamed(text);
    const footnoteId = $(node).attr('id');
    if (xml && footnoteId) {
      $('contrib').each((_, contributor) => {
        const references = $(contributor).find('xref').toArray().some((xref) => ($(xref).attr('rid') ?? '').split(/\s+/).includes(footnoteId));
        if (references) {
          const full = `${$(contributor).find('given-names').first().text()} ${$(contributor).find('surname').first().text()}`;
          const index = authors.findIndex((a) => normalize(a.name) === normalize(full));
          if (index >= 0) indices.push(index);
        }
      });
    }
    indices = [...new Set(indices)].sort((a, b) => a - b);
    // Equal contribution alone is not co-first. Require an identified leading author group.
    if (indices.length >= 2 && indices.every((index, position) => index === position)) {
      indices.forEach((i) => coFirst.add(i));
      if (!evidence.some((e) => e.quote === text.slice(0, 700))) evidence.push({ role: 'co-first', quote: text.slice(0, 700), source: url, authors: indices.map((i) => authors[i].name) });
    }
  });
  if (xml) $('contrib[corresp="yes"]').each((_, node) => {
    const full = `${$(node).find('given-names').first().text()} ${$(node).find('surname').first().text()}`;
    const index = authors.findIndex((a) => normalize(a.name) === normalize(full));
    if (index >= 0) corresponding.add(index);
  });
  return { status: evidence.length ? 'confirmed' : 'unknown', evidence,
    authors: authors.map((a, i) => ({ ...a, coFirst: coFirst.has(i), corresponding: corresponding.has(i) })) };
}
export async function enrichPublisher(work, metadata) {
  const urls = [...new Set([...(work.link ?? []).filter((link) => /xml/.test(link['content-type'] ?? '')).map((link) => link.URL), work.resource?.primary?.URL].filter(allowedUrl))];
  const failures = [];
  for (const url of urls.slice(0, 2)) {
    try {
      const html = await request(url, { json: false, retries: 0, timeout: 10000 });
      const xml = /<(?:article|article-set)[\s>]/.test(html) && !/<html/i.test(html);
      const result = extractAuthorship(html, metadata.authorDetails, url, xml);
      if (result.status === 'confirmed') return { ...result, failures };
      failures.push({ source: url, reason: 'No unambiguous leading-author contribution statement' });
    } catch (e) { failures.push({ source: url, reason: e.message }); }
  }
  // Open full text offers stable author-to-footnote links when publisher HTML is unavailable.
  try {
    const query = `DOI:${metadata.doi}`;
    const data = await request(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json`, { retries: 0, timeout: 10000 });
    const hit = data.resultList?.result?.find((r) => normalizeDoi(r.doi) === metadata.doi && r.pmcid && r.isOpenAccess === 'Y');
    if (hit) {
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${hit.pmcid}/fullTextXML`;
      const xml = await request(url, { json: false, retries: 0, timeout: 10000 });
      return { ...extractAuthorship(xml, metadata.authorDetails, url, true), failures };
    }
  } catch (e) { failures.push({ source: 'Europe PMC', reason: e.message }); }
  return { status: 'unknown', evidence: [], authors: metadata.authorDetails, failures };
}
