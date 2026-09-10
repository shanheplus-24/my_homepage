/* global CMS, createClass, h */
(() => {
  async function api(action, params) {
    const response = await fetch('/api/admin/' + action, {credentials:'same-origin',cache:'no-store',...(params === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)})});
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) window.parent.postMessage({type:'admin-expired'},location.origin);
      throw new Error(result.error || '后台请求失败');
    }
    return result;
  }
  const Auth = createClass({componentDidMount(){this.props.onLogin({});},render(){return h('p',{},'正在验证登录状态…');}});
  const asset = async a => ({path:a.path,content:await a.toBase64(),encoding:'base64'});
  function media(f) {
    if (!f.content) return f;
    const blob = new File([Uint8Array.from(atob(f.content),c=>c.charCodeAt(0))],f.name);
    const url = URL.createObjectURL(blob);
    return {...f,file:blob,size:blob.size,url,displayURL:url};
  }
  class PasswordBackend {
    constructor(config){this.mediaFolder=config.media_folder;this.versions={};}
    isGitBackend(){return false;}
    async status(){await api('session');return {auth:{status:true},api:{status:true,statusPage:''}};}
    authComponent(){return Auth;}
    async authenticate(){const s=await api('session');return {login:s.user,name:s.user};}
    restoreUser(){return this.authenticate();}
    getToken(){return Promise.resolve('');}
    logout(){window.parent.postMessage({type:'admin-logout'},location.origin);}
    async request(action,params={}){
      const result=await api('proxy',{action,params});
      const entries=Array.isArray(result)?result:[result];
      for(const e of entries) if(e?.file?.path) this.versions[e.file.path]=e.file.id;
      if(result?.versions) Object.assign(this.versions,result.versions);
      return result;
    }
    entriesByFolder(folder,extension,depth){return this.request('entriesByFolder',{folder,extension,depth});}
    entriesByFiles(files){return this.request('entriesByFiles',{files});}
    getEntry(path){return this.request('getEntry',{path});}
    expected(paths){return Object.fromEntries(paths.map(path=>[path,this.versions[path]??null]));}
    async persistEntry(entry){
      const assets=await Promise.all((entry.assets??[]).map(asset));
      const dataFiles=entry.dataFiles??[{path:entry.path,raw:entry.raw}];
      const expected=this.expected([...dataFiles,...assets].map(f=>f.path));
      const result=await this.request('persistEntry',{dataFiles,assets,expected});
      window.parent.postMessage({type:'admin-saved'},location.origin);
      return result;
    }
    async getMedia(mediaFolder=this.mediaFolder){
      const files=await this.request('getMedia',{mediaFolder});
      for(const f of files) this.versions[f.path]=f.id;
      return files.map(media);
    }
    async getMediaFile(path){const f=await this.request('getMediaFile',{path});this.versions[path]=f.id;return media(f);}
    async persistMedia(a){
      const serialized=await asset(a);
      await this.request('persistMedia',{asset:serialized,expected:this.expected([serialized.path])});
      return this.getMediaFile(serialized.path);
    }
    deleteFiles(paths){return this.request('deleteFiles',{paths,expected:this.expected(paths)});}
    getDeployPreview(){return Promise.resolve(null);}
    getNotes(){return Promise.resolve([]);}
  }
  CMS.registerBackend('password',PasswordBackend);
})();
