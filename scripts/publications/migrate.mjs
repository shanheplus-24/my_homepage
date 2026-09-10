// One-time, additive migration. Original MDX files and existing overrides are never overwritten.
import { resolve } from 'node:path';
import { readLegacy, readFolder, ROOT, writeJson } from './store.mjs';
import { createOverride } from './model.mjs';
const overrides = {
  'macroporous-zwitterionic-hydrogel-sponge': 'Models', 'fewer-temperature-ties': 'Models',
  'pinn-latent-heat-storage': 'Devices', 'water-electricity-cogeneration': 'Devices',
  'solar-membrane-distillation-waste-heat': 'Devices', 'multistage-solar-membrane-distillation': 'Devices',
  'pv-passive-cooling-backplate': 'Devices', 'sorption-thermal-battery-gel': 'Devices',
  'airflow-restructuring-3d-vapor-generator': 'Devices', 'urban-microenvironment-sustainability': 'Models',
  'solid-sorbent-dehumidification': 'Materials', 'grand-challenges-continuous-awh': 'Models',
  'vapor-compression-adsorption-ev-thermal': 'Devices',
};
const domainRules = [['Food', /food|agriculture|rooftop|urban/i], ['Water', /water|atmospheric|hygroscopic|sorbent|humidity|freshwater|dehumidification|evaporation|distillation/i], ['Energy', /energy|thermal|heat|cooling|refrigeration|radiative|temperature|photovoltaic|power|electricity/i]];
const methodRules = [['AI', /\bAI\b|machine learning/i], ['Models', /model|thermodynamic|boundary|framework|physics-informed|prediction|estimation|pinch|evaluation|regulation/i], ['Materials', /material|hydrogel|sponge|sorbent|salt|composite|fiber|membrane|poly|phase change|pcm/i], ['Devices', /device|harvester|generator|panel|system|backplate|battery|distillation|evaporator|refrigeration|air conditioning/i]];
const existing = await readFolder(resolve(ROOT, 'src/data/publication-overrides'));
let count = 0;
for (const [id, publication] of Object.entries(await readLegacy())) {
  if (existing[id]) continue;
  const text = `${publication.title} ${publication.venue}`;
  const domains = [domainRules.find(([, regex]) => regex.test(text))?.[0] ?? 'Energy'];
  const methods = [overrides[id] ?? methodRules.find(([, regex]) => regex.test(text))?.[0] ?? 'Devices'];
  await writeJson(resolve(ROOT, 'src/data/publication-overrides', `${id}.json`), createOverride(id, publication, true, { domains, methods }));
  count++;
}
console.log(`Preserved ${count} legacy publications; existing overrides untouched.`);
