import { loadStore, loadPublicationEntries } from '../../../scripts/publications/store.mjs';

export async function GET() {
  const { automatic, legacy } = await loadStore(process.cwd());
  const entries = await loadPublicationEntries(process.cwd(), true);
  return new Response(JSON.stringify({ entries, automatic: automatic.papers, legacy, imports: automatic.imports }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
