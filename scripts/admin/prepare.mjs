import { writeFile } from 'node:fs/promises';
import { loadStore, loadPublicationEntries, ROOT } from '../publications/store.mjs';
export async function snapshot(root = ROOT) {
  const { automatic, legacy } = await loadStore(root);
  return { entries:await loadPublicationEntries(root,true),automatic:automatic.papers,legacy,imports:automatic.imports };
}
// Imported by Astro configuration; this module is server-only, outside public/dist.
await writeFile(new URL('./snapshot.generated.mjs',import.meta.url),'export default ' + JSON.stringify(await snapshot()) + ';\n');
