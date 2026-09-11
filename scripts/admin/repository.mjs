import config from './config.mjs';
import { parse } from 'yaml';

export const fail = (status, message) => Object.assign(new Error(message), { status });
export function contentCollection(path) {
  if (typeof path !== 'string' || path.length > 240 || /[:\\\x00-\x1f]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..')) throw fail(400, '无效文件路径。');
  return config.collections.find(c => c.files?.some(f => f.file === path) || (c.folder && path.startsWith(c.folder + '/') && !path.slice(c.folder.length + 1).includes('/') && path.endsWith('.' + c.extension)));
}
export function mediaPath(path) {
  contentCollection(path); // Also validate path syntax.
  return path.startsWith(config.media_folder + '/') && /^[^/]+\.(png|jpe?g|gif|webp|avif|mp4|webm)$/i.test(path.slice(config.media_folder.length + 1));
}
export function validateChange(change, deleting = false) {
  const collection = contentCollection(change.path);
  if (!collection && !mediaPath(change.path)) throw fail(403, '此文件不在后台可维护范围内。');
  if (deleting) {
    if (!collection || !collection.folder || collection.delete === false) throw fail(403, '此内容不允许删除；论文请使用隐藏选项。');
    return;
  }
  if (collection) {
    if (typeof change.raw !== 'string' || change.raw.length > 400000) throw fail(400, '内容为空或过大。');
    try {
      const document = change.path.endsWith('.json') ? JSON.parse(change.raw) : parse(change.raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '');
      if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error();
      if (document.id && document.id !== change.path.split('/').at(-1).replace(/\.[^.]+$/, '')) throw new Error();
    } catch { throw fail(400, '内容格式无效，或记录 ID 与文件名不一致。'); }
  } else {
    if (change.encoding !== 'base64' || typeof change.content !== 'string' || change.content.length > 7000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(change.content)) throw fail(400, '图片或视频格式无效，单个文件最多 5 MB。');
    const bytes = atob(change.content);
    const ext = change.path.split('.').at(-1).toLowerCase();
    const valid = ext === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n') : ['jpg','jpeg'].includes(ext) ? bytes.startsWith('\xff\xd8\xff') : ext === 'gif' ? /^GIF8[79]a/.test(bytes) : ext === 'webp' ? bytes.startsWith('RIFF') && bytes.slice(8,12) === 'WEBP' : ext === 'webm' ? bytes.startsWith('\x1a\x45\xdf\xa3') : bytes.slice(4,8) === 'ftyp';
    if (!valid) throw fail(400, '文件实际类型与扩展名不一致。');
  }
}

export class GithubRepository {
  constructor(token, fetcher = fetch) { this.token = token; this.fetcher = fetcher; }
  async api(path, method = 'GET', data) {
    if (!this.token) throw fail(503, '尚未配置仓库写入凭据。');
    const response = await this.fetcher('https://api.github.com/repos/shanheplus-24/my_homepage/' + path, {
      method, headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'shanheplus-admin', 'Content-Type':'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    });
    if (!response.ok) throw fail(response.status === 409 || response.status === 422 ? 409 : response.status === 404 ? 404 : 502, response.status === 409 || response.status === 422 ? '仓库内容已变化，请重新打开条目后保存。' : '仓库请求失败，请检查服务端凭据及仓库权限。');
    return response.status === 204 ? {} : response.json();
  }
  async tree() {
    if (!this.cachedTree) {
      const ref = await this.api('git/ref/heads/main');
      const commit = await this.api('git/commits/' + ref.object.sha);
      const tree = await this.api(`git/trees/${commit.tree.sha}?recursive=1`);
      if (tree.truncated) throw fail(502, '仓库目录过大，无法安全读取。');
      this.head = ref.object.sha; this.baseTree = commit.tree.sha;
      this.cachedTree = tree.tree.filter(f => f.type === 'blob');
    }
    return this.cachedTree;
  }
  async list() { return (await this.tree()).map(f => ({path:f.path,id:f.sha})); }
  async read(path, binary = false) {
    const item = (await this.tree()).find(f => f.path === path);
    if (!item) throw fail(404, '找不到此记录。');
    const blob = await this.api('git/blobs/' + item.sha);
    const content = blob.content.replace(/\s/g, '');
    const file = {path, id:item.sha, name:path.split('/').at(-1)};
    return binary ? {...file, content, encoding:'base64'} : {file, data:new TextDecoder().decode(Uint8Array.from(atob(content), c => c.charCodeAt(0)).buffer)};
  }
  async write(changes, expected, deleting = false) {
    const files = await this.tree();
    for (const change of changes) {
      validateChange(change, deleting);
      const existing = files.find(f => f.path === change.path);
      if (!Object.hasOwn(expected, change.path) || expected[change.path] !== (existing?.sha ?? null)) throw fail(409, '内容已更新或尚未载入，请重新打开后再保存。');
      if (!existing && contentCollection(change.path)?.create === false) throw fail(403, '此列表不允许直接创建条目。');
    }
    const tree = [];
    for (const change of changes) {
      const blob = deleting ? null : await this.api('git/blobs', 'POST', {content:change.raw ?? change.content, encoding:change.raw === undefined ? 'base64' : 'utf-8'});
      tree.push({path:change.path,mode:'100644',type:'blob',sha:blob?.sha ?? null});
    }
    const nextTree = await this.api('git/trees', 'POST', {base_tree:this.baseTree,tree});
    const commit = await this.api('git/commits', 'POST', {message:'Update website content from authenticated admin',tree:nextTree.sha,parents:[this.head]});
    await this.api('git/refs/heads/main', 'PATCH', {sha:commit.sha,force:false});
    this.cachedTree = null;
    return {saved:true,commit:commit.sha,versions:Object.fromEntries(tree.map(f=>[f.path,f.sha]))};
  }
}

export async function proxyAction(repo, action, params = {}) {
  const read = path => { if (!contentCollection(path)) throw fail(403, '此内容不可读取。'); return repo.read(path); };
  if (action === 'entriesByFolder') {
    const collection = config.collections.find(c => c.folder === params.folder && c.extension === params.extension);
    if (!collection) throw fail(403, '未知内容列表。');
    const paths = (await repo.list()).filter(f => f.path.startsWith(collection.folder + '/') && contentCollection(f.path) === collection);
    const result = [];
    // Keep API pressure bounded for the existing 38-publication collection.
    for (let i = 0; i < paths.length; i += 6) result.push(...await Promise.all(paths.slice(i,i+6).map(f=>read(f.path))));
    return result;
  }
  if (action === 'entriesByFiles') return Promise.all((params.files ?? []).map(f => read(f.path ?? f.file)));
  if (action === 'getEntry') return read(params.path);
  if (action === 'getMedia') {
    if (params.mediaFolder !== config.media_folder) throw fail(403,'未知媒体目录。');
    return (await repo.list()).filter(f=>mediaPath(f.path)).map(f=>({...f,name:f.path.split('/').at(-1),url:'/' + f.path.replace(/^public\//,''),displayURL:'/' + f.path.replace(/^public\//,'')}));
  }
  if (action === 'getMediaFile') { if (!mediaPath(params.path)) throw fail(403, '未知媒体。'); return repo.read(params.path, true); }
  if (action === 'persistEntry' || action === 'persistMedia') {
    const changes = action === 'persistMedia' ? [params.asset] : [...(params.dataFiles ?? []), ...(params.assets ?? [])];
    if (!changes.length || changes.length > 12 || new Set(changes.map(c=>c.path)).size !== changes.length) throw fail(400,'保存文件数量无效。');
    return repo.write(changes, params.expected ?? {});
  }
  if (action === 'deleteFiles') {
    if (!Array.isArray(params.paths) || !params.paths.length || params.paths.length > 12) throw fail(400,'无效删除请求。');
    return repo.write(params.paths.map(path=>({path})),params.expected ?? {},true);
  }
  if (action === 'getDeployPreview') return null;
  if (action === 'getNotes') return [];
  throw fail(400, '不支持此操作。');
}
