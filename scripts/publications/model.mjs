// Shared by the synchronizer, Astro loader and validation. No network at build time.
import { createHash } from 'node:crypto';

export const DOMAINS = ['Water', 'Energy', 'Food'];
export const METHODS = ['Models', 'Materials', 'Devices', 'AI'];
export const normalizeDoi = (value = '') => {
  let doi = String(value).trim().replace(/^doi:\s*/i, '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
  try { doi = decodeURIComponent(doi); } catch { return ''; }
  return /^10\.\d{4,9}\/\S+$/i.test(doi) && !/[<>"\s]/.test(doi) ? doi.toLowerCase() : '';
};
export const normalizeName = (name = '') => name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const normalizeTitle = (title = '') => normalizeName(title);
export const paperId = (doi) => `doi-${createHash('sha256').update(normalizeDoi(doi)).digest('hex').slice(0, 16)}`;
export const cleanText = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
export function legacyAuthor(value) {
  return { name: value.replace(/[†*]/g, '').trim(), coFirst: value.includes('†'), corresponding: value.includes('*'), isSelf: value.replace(/[†*]/g, '').trim() === 'He Shan' };
}
export function validAuthors(authors) {
  return Array.isArray(authors) && authors.length > 0 && authors.every((a) => a && typeof a.name === 'string' && a.name.trim());
}
// Confirmation covers substantive automatic content, not fetch times, source order or API scores.
export function automaticRevision(auto) {
  if (!auto?.metadata) return '';
  const m = auto.metadata;
  const content = { doi: normalizeDoi(m.doi), title: m.title, venue: m.venue, year: m.year,
    status: m.status, type: m.type, abstract: m.abstract ?? '',
    authors: (m.authorDetails ?? []).map((a) => ({ name: a.name, coFirst: Boolean(a.coFirst), corresponding: Boolean(a.corresponding), isSelf: Boolean(a.isSelf) })),
    domains: [...(auto.classification?.domains ?? [])].sort(), methods: [...(auto.classification?.methods ?? [])].sort(),
    image: m.image ?? null };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}
// User policy: journal articles only; never admit conference or self-deposited data records.
export function exclusionReason({ doi = '', type = '', title = '', venue = '' }) {
  if (/^10\.(5281|17632|6084|5061|7910|21227)\//i.test(normalizeDoi(doi))) return 'Dataset / repository deposit';
  if (/^10\.(2139|1101|21203)\//i.test(normalizeDoi(doi))) return 'Preprint';
  if (type && type !== 'journal-article') return `Excluded document type: ${type}`;
  if (/\b(?:conference|proceedings|symposium|meeting abstracts)\b/i.test(venue)) return 'Conference publication';
  if (/\b(?:dataset|data set|database|supplementary data|supporting information)\b/i.test(title)) return 'Dataset / database record';
  if (/^(?:(?:author|publisher)\s+)?(?:correction|corrigendum|erratum|retraction|withdrawal)\b/i.test(title)) return 'Correction / retraction notice';
  return '';
}
export function classify(title, abstract = '', topics = []) {
  const text = `${title} ${abstract}`;
  const domains = [];
  const methods = [];
  const reasons = [];
  const rules = [
    ['Water', /water|atmospheric|hygroscopic|humidity|dehumidification|distillation/i, domains],
    ['Energy', /energy|thermal|heat|cooling|refrigeration|radiative|photovoltaic|power|electricity/i, domains],
    ['Food', /\bfood\b|agricultur|crop|irrigation/i, domains],
    ['Models', /model|thermodynamic|boundar|framework|prediction|estimation|evaluation|techno.?economic|simulation/i, methods],
    ['Materials', /material|hydrogel|sponge|sorbent|salt|composite|fiber|membrane|polymer|phase.change/i, methods],
    ['Devices', /device|harvester|generator|panel|system|backplate|battery|distillation|evaporator|refrigeration/i, methods],
    ['AI', /\bAI\b|machine learning|neural network|physics.informed|\bPINN\b|deep learning/i, methods],
  ];
  for (const [tag, pattern, group] of rules) {
    const match = text.match(pattern);
    if (match) { group.push(tag); reasons.push(`${tag}: ${match[0]}`); }
  }
  // Database topics are evidence for review, never an unconditional category override.
  return { domains, methods, reasons, topics, needsReview: !domains.length || !methods.length, basis: abstract ? 'title-and-abstract' : 'title-only', ruleVersion: 1 };
}
export function resolvePublication(id, legacy, auto, manual = {}) {
  const original = legacy ? { ...legacy, authorDetails: legacy.authors.map(legacyAuthor) } : {};
  const base = { ...original, ...(auto?.metadata ?? {}) };
  const pick = (mode, field, fallback) => manual[mode] === 'manual' ? (manual[field] ?? fallback) : (base[field] ?? fallback);
  const authorDetails = pick('authorsMode', 'authorDetails', []);
  const taxonomy = manual.taxonomyMode === 'manual'
    ? { domains: manual.domains ?? [], methods: manual.methods ?? [] }
    : (auto?.classification ?? { domains: [], methods: [] });
  const image = manual.imageMode === 'manual' ? (manual.image?.src ? manual.image : null) : (base.image ?? null);
  const visibility = manual.visibility ?? 'auto';
  const policyBlocked = auto && exclusionReason({ ...auto.metadata, type: auto.metadata.crossrefType });
  const identityVerified = auto?.identity?.verified === true && auto?.identity?.policyVersion === 2;
  const published = !policyBlocked && identityVerified && (visibility === 'published' || (visibility === 'auto' && auto?.eligible === true));
  const title = pick('metadataMode', 'title', '');
  const venue = pick('metadataMode', 'venue', '');
  const year = Number(pick('metadataMode', 'year', 0));
  const status = pick('statusMode', 'status', 'published');
  const doi = normalizeDoi(manual.doiMode === 'manual' ? manual.doi : (base.doi || base.links?.doi));
  const links = { ...(original.links ?? {}), ...(base.links ?? {}) };
  if (doi) links.doi = `https://doi.org/${doi}`;
  else delete links.doi;
  const complete = title && venue && year >= 1900 && year <= 2100 && validAuthors(authorDetails);
  const revision = automaticRevision(auto);
  return {
    id, title, venue, year, status, type: base.type ?? 'journal',
    authorDetails, authors: authorDetails.map((a) => `${a.name}${a.coFirst ? '†' : ''}${a.corresponding ? '*' : ''}`),
    domains: taxonomy.domains, methods: taxonomy.methods, image: image ? { ...image, alt: image.alt || title } : null,
    sortOrder: manual.sortOrder ?? original.sortOrder,
    links,
    confirmation: { pending: Boolean(revision && manual.reviewedAutomaticRevision !== revision), revision },
    visible: Boolean(published && complete && doi === normalizeDoi(auto?.metadata?.doi) && !['hidden', 'excluded'].includes(visibility)),
    review: {
      missingImage: !image,
      classification: !taxonomy.domains.length || !taxonomy.methods.length,
      authorship: manual.authorsMode !== 'manual' && auto?.authorship?.status !== 'confirmed',
      identity: auto?.identity?.verified !== true || auto?.identity?.policyVersion !== 2,
      reasons: auto?.reviewReasons ?? [],
    },
  };
}
export function createOverride(id, metadata, legacy = false, taxonomy = {}) {
  return { id, title: metadata.title, venue: metadata.venue, year: metadata.year,
    doi: normalizeDoi(metadata.doi || metadata.links?.doi), status: metadata.status ?? 'published',
    visibility: 'auto', metadataMode: legacy ? 'manual' : 'auto', statusMode: 'auto', doiMode: 'auto', authorsMode: legacy ? 'manual' : 'auto',
    taxonomyMode: legacy ? 'manual' : 'auto', imageMode: legacy ? 'manual' : 'auto',
    authorDetails: metadata.authorDetails ?? (metadata.authors ?? []).map(legacyAuthor),
    domains: taxonomy.domains ?? [], methods: taxonomy.methods ?? [],
    image: metadata.image ?? { src: '', alt: '' }, ...(metadata.sortOrder !== undefined ? { sortOrder: metadata.sortOrder } : {}) };
}
