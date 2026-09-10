// Repository release operations; credentials stay in memory and are never logged.
import { spawnSync } from 'node:child_process';
const repo = 'shanheplus-24/my_homepage';
const git = process.env.RELEASE_GIT || 'git';
const auth = spawnSync(git, ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
if (auth.status !== 0) throw new Error('GitHub credential helper unavailable; no credentials were printed.');
const token = auth.stdout.split(/\r?\n/).find((line) => line.startsWith('password='))?.slice(9);
if (!token) throw new Error('No GitHub credential available.');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'publication-release-validation', 'X-GitHub-Api-Version': '2022-11-28' };
const operation = process.argv[2] || 'status';
let path = `/repos/${repo}/actions/runs?per_page=8`; let method = 'GET'; let body;
if (operation === 'dispatch') {
  const workflow = process.argv[3];
  if (!['deploy.yml', 'sync-publications.yml'].includes(workflow)) throw new Error('Unsupported workflow');
  path = `/repos/${repo}/actions/workflows/${workflow}/dispatches`; method = 'POST'; body = JSON.stringify({ ref: 'main' });
} else if (operation === 'jobs') {
  const id = process.argv[3]; if (!/^\d+$/.test(id)) throw new Error('Invalid run');
  path = `/repos/${repo}/actions/runs/${id}/jobs`;
} else if (operation === 'workflows') path = `/repos/${repo}/actions/workflows`;
else if (operation !== 'status') throw new Error('Unsupported release operation');
const response = await fetch(`https://api.github.com${path}`, { method, headers, body, signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
if (response.status === 204) console.log(JSON.stringify({ dispatched: process.argv[3] }));
else {
  const data = await response.json();
  const records = data.workflow_runs ?? data.jobs ?? data.workflows ?? [];
  console.log(JSON.stringify(records.map((r) => ({ id: r.id, name: r.name, status: r.status ?? r.state, conclusion: r.conclusion, sha: r.head_sha, url: r.html_url, path: r.path, event: r.event, createdAt: r.created_at,
    ...(r.steps ? { steps: r.steps.map((s) => ({ name: s.name, status: s.status, conclusion: s.conclusion })) } : {}) })), null, 2));
}
