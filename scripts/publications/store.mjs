import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { normalizeDoi, resolvePublication } from './model.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}
export async function writeJson(path, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  try { if (await readFile(path, 'utf8') === text) return false; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, path);
  return true;
}
export async function readFolder(path) {
  let names;
  try { names = await readdir(path); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  const result = {};
  for (const name of names.sort().filter((name) => name.endsWith('.json'))) {
    const entry = await readJson(resolve(path, name));
    const id = name.slice(0, -5);
    if (entry.id && entry.id !== id) throw new Error(`Entry id does not match filename: ${name}`);
    result[id] = entry;
  }
  return result;
}
export async function readLegacy(root = ROOT) {
  const folder = resolve(root, 'src/content/publications');
  let files;
  try { files = await readdir(folder); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  const entries = {};
  for (const name of files.sort().filter((name) => /\.mdx?$/.test(name))) {
    const text = await readFile(resolve(folder, name), 'utf8');
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) throw new Error(`Missing frontmatter: ${name}`);
    const data = parse(frontmatter[1]);
    entries[name.replace(/\.mdx?$/, '')] = { ...data, doi: normalizeDoi(data.links?.doi) };
  }
  return entries;
}
export async function loadStore(root = ROOT) {
  const [legacy, automatic, overrides, imports] = await Promise.all([
    readLegacy(root), readJson(resolve(root, 'src/data/publications-auto.json'), { version: 1, papers: {}, imports: {} }),
    readFolder(resolve(root, 'src/data/publication-overrides')), readFolder(resolve(root, 'src/data/publication-imports')),
  ]);
  return { legacy, automatic, overrides, imports };
}
export async function loadPublicationEntries(root = ROOT, includeHidden = false) {
  const { legacy, automatic, overrides } = await loadStore(root);
  const identity = await readJson(resolve(root, 'src/data/publication-identity.json'), {});
  const ids = [...new Set([...Object.keys(legacy), ...Object.keys(automatic.papers), ...Object.keys(overrides)])].sort();
  const entries = ids.map((id) => {
    const entry = resolvePublication(id, legacy[id], automatic.papers[id], overrides[id]);
    const excluded = identity.excludedDois?.[normalizeDoi(entry.links.doi)] || identity.excludedDois?.[normalizeDoi(automatic.papers[id]?.metadata.doi)];
    if (excluded) { entry.visible = false; entry.review.reasons = [...entry.review.reasons, excluded]; }
    return entry;
  });
  const visible = entries.filter((entry) => entry.visible);
  const seen = new Map();
  for (const entry of visible) {
    const doi = normalizeDoi(entry.links.doi);
    if (doi && seen.has(doi)) throw new Error(`Duplicate DOI: ${entry.id} / ${seen.get(doi)}`);
    if (doi) seen.set(doi, entry.id);
  }
  return includeHidden ? entries : visible;
}
