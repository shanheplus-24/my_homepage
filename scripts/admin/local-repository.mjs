import { readFile, writeFile, readdir, mkdir, unlink, realpath } from 'node:fs/promises';
import { resolve, dirname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import config from './config.mjs';
import { contentCollection, mediaPath, validateChange, fail } from './repository.mjs';
const hash = data => createHash('sha256').update(data).digest('hex');
let writeQueue = Promise.resolve();
export class LocalRepository {
  constructor(root){this.root=resolve(root);}
  async path(path){
    const target=resolve(this.root,path);
    if(!target.startsWith(this.root+sep))throw fail(403,'路径越界。');
    const canonicalRoot=await realpath(this.root);
    let parent=target;
    for(;;){try{const canonical=await realpath(parent);if(canonical!==canonicalRoot&&!canonical.startsWith(canonicalRoot+sep))throw fail(403,'不允许通过链接访问项目外文件。');break;}catch(e){if(e.code!=='ENOENT')throw e;parent=dirname(parent);}}
    return target;
  }
  async list(){
    const paths=config.collections.flatMap(c=>c.files?.map(f=>f.file)??[]);
    for(const folder of [...config.collections.map(c=>c.folder).filter(Boolean),config.media_folder]){
      let names=[];try{names=await readdir(await this.path(folder));}catch(e){if(e.code!=='ENOENT')throw e;}
      for(const name of names){const path=folder+'/'+name;if(contentCollection(path)||mediaPath(path))paths.push(path);}
    }
    return Promise.all(paths.map(async path=>({path,id:hash(await readFile(await this.path(path)))})));
  }
  async read(path,binary=false){
    let bytes;try{bytes=await readFile(await this.path(path));}catch(e){if(e.code==='ENOENT')throw fail(404,'找不到此记录。');throw e;}
    const file={path,id:hash(bytes),name:path.split('/').at(-1)};
    return binary?{...file,content:bytes.toString('base64'),encoding:'base64'}:{file,data:bytes.toString('utf8')};
  }
  async write(changes,expected,deleting=false){
    const run=async()=>{
      const staged=[];
      for(const change of changes){
        validateChange(change,deleting);const target=await this.path(change.path);
        let bytes=null;try{bytes=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;}
        if(!Object.hasOwn(expected,change.path)||expected[change.path] !== (bytes?hash(bytes):null))throw fail(409,'内容已更新，请重新打开后保存。');
        if(!bytes&&contentCollection(change.path)?.create===false)throw fail(403,'此列表不允许直接创建条目。');
        staged.push({target,previous:bytes,next:deleting?null:Buffer.from(change.raw??change.content,change.raw===undefined?'base64':'utf8')});
      }
      const done=[];
      try{for(const item of staged){await mkdir(dirname(item.target),{recursive:true});if(item.next)await writeFile(item.target,item.next);else await unlink(item.target);done.push(item);}}
      catch(error){for(const item of done.reverse()){if(item.previous)await writeFile(item.target,item.previous);else await unlink(item.target);}throw error;}
      return {saved:true,versions:Object.fromEntries(staged.map((s,i)=>[changes[i].path,s.next?hash(s.next):null]))};
    };
    const result=writeQueue.then(run);writeQueue=result.catch(()=>{});return result;
  }
}
