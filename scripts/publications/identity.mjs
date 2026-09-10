import { normalizeDoi, normalizeName, normalizeTitle } from './model.mjs';

export const IDENTITY_POLICY_VERSION = 2;
export function normalizeOrcid(value = '') {
  const match = String(value).trim().match(/^(?:https?:\/\/orcid\.org\/)?(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/i);
  return match?.[1].toUpperCase() ?? '';
}
export function verifyIdentity(metadata, candidates, identity, reviewed = {}) {
  const result = (verified, reason, extra = {}) => ({ verified, reason, policyVersion: IDENTITY_POLICY_VERSION, ...extra });
  const matches = metadata.authorDetails.filter((a) => identity.aliases.some((name) => normalizeName(name) === normalizeName(a.name)));
  if (matches.length !== 1) return result(false, 'Exactly one matching full researcher name is required');
  const self = matches[0];
  if (self.orcid && normalizeOrcid(self.orcid) !== identity.orcid)
    return result(false, 'Author ORCID conflicts with configured researcher', { conflict: true });
  if (normalizeOrcid(self.orcid) === identity.orcid)
    return result(true, 'Author ORCID matches', { source: metadata.sourceUrl });
  const orcid = candidates.find((c) => c.source === 'orcid' && normalizeDoi(c.doi) === metadata.doi && normalizeTitle(c.title) === normalizeTitle(metadata.title));
  if (orcid) return result(true, 'DOI, title and full author name match public ORCID works', { source: orcid.evidence });
  const review = reviewed[metadata.doi];
  if (review?.verified && normalizeTitle(review.title) === normalizeTitle(metadata.title) &&
    JSON.stringify(review.authors.map(normalizeName)) === JSON.stringify(metadata.authorDetails.map((a) => normalizeName(a.name))))
    return result(true, review.reason, { source: review.sources[0], sources: review.sources, checkedAt: review.checkedAt });
  // Aggregator profiles, coauthors and an existing website entry are not identity credentials.
  return result(false, 'Independent authorship evidence required; namesake aggregator profiles are not accepted');
}
export function sameWork(metadata, other) {
  return normalizeDoi(other?.doi) === metadata.doi && normalizeTitle(other?.title) === normalizeTitle(metadata.title);
}
