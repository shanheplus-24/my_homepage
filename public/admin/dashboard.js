(() => {
  if(location.hostname.endsWith('github.io')){location.replace('https://www.shanheplus.com/admin/');return;}
  const $=id=>document.getElementById(id);
  let database,config,expireTimer;
  async function api(path,body){
    const response=await fetch('/api/admin/'+path,{cache:'no-store',credentials:'same-origin',...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'请求失败');
    return data;
  }
  function locked(message=''){
    clearTimeout(expireTimer);database=null;config=null;$('workspace').hidden=true;$('login-panel').hidden=false;$('editor').removeAttribute('src');$('papers').replaceChildren();$('stats').replaceChildren();$('navigation').replaceChildren();$('login-message').textContent=message;
  }
  async function logout(){try{await api('logout',{});}finally{locked('已退出登录。');}}
  function openEditor(collection,id){
    $('overview').hidden=true;$('editor').hidden=false;
    const hash=`#/collections/${encodeURIComponent(collection)}${id?'/entries/'+encodeURIComponent(id):''}`;
    if(!$('editor').getAttribute('src'))$('editor').src='/api/admin/editor'+hash;
    else $('editor').contentWindow.location.hash=hash;
    for(const b of $('navigation').children)b.classList.toggle('active',b.dataset.collection===collection);
  }
  function render(){
    const query=$('paper-search').value.toLowerCase();const filter=$('paper-filter').value;
    $('papers').replaceChildren();
    const entries=database.entries.filter(e=>(!query||JSON.stringify([e.title,e.authors,e.links]).toLowerCase().includes(query))&&(filter==='all'||(filter==='pending'?e.confirmation.pending:e.review.identity)));
    for(const e of entries){
      const row=document.createElement('article');row.className='paper';
      const info=document.createElement('div');
      if(e.confirmation.pending||e.review.identity){const tag=document.createElement('span');tag.className='badge';tag.textContent=e.review.identity?'身份待核实 · 暂不公开':'Information Check Needed';info.append(tag);}
      const title=document.createElement('h2');title.textContent=e.title;const meta=document.createElement('p');meta.textContent=`${e.venue} · ${e.year} · ${[...(e.domains??[]),...(e.methods??[])].join(' / ')}`;info.append(title,meta);
      const edit=document.createElement('button');edit.textContent='编辑';edit.onclick=()=>openEditor('publications',e.id);row.append(info,edit);$('papers').append(row);
    }
    if(!entries.length)$('papers').textContent='没有符合条件的论文。';
  }
  async function enter(){
    const session=await api('session');
    [config,database]=await Promise.all([api('config'),api('data')]);
    $('login-panel').hidden=true;$('workspace').hidden=false;$('overview').hidden=false;$('editor').hidden=true;
    expireTimer=setTimeout(()=>locked('会话已过期，请重新登录。'),Math.max(0,session.expiresAt-Date.now()));
    const overview=document.createElement('button');overview.textContent='维护总览';overview.className='active';overview.onclick=()=>{$('overview').hidden=false;$('editor').hidden=true;for(const b of $('navigation').children)b.classList.toggle('active',b===overview);};$('navigation').replaceChildren(overview);
    for(const c of config.collections){const b=document.createElement('button');b.textContent=c.label;b.dataset.collection=c.name;b.onclick=()=>openEditor(c.name);$('navigation').append(b);}
    $('stats').replaceChildren();
    for(const [label,count] of [['公开论文',database.entries.filter(e=>e.visible).length],['自动新增待核对',database.entries.filter(e=>e.confirmation.pending).length],['身份待核实',database.entries.filter(e=>e.review.identity).length]]){
      const card=document.createElement('div');card.className='stat';const value=document.createElement('strong');value.textContent=count;const caption=document.createElement('span');caption.textContent=label;card.append(value,caption);$('stats').append(card);
    }
    render();
  }
  $('login-form').onsubmit=async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;$('login-message').textContent='正在登录…';try{await api('login',{username:form.username.value,password:form.password.value});form.password.value='';await enter();}catch(error){locked(error.message);}finally{button.disabled=false;}};
  $('logout').onclick=logout;$('paper-search').oninput=render;$('paper-filter').onchange=render;
  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==$('editor').contentWindow)return;if(event.data?.type==='admin-logout')logout();if(event.data?.type==='admin-expired')locked('会话已过期，请重新登录。');if(event.data?.type==='admin-saved')$('save-status').textContent=location.hostname==='127.0.0.1'?'已保存到本地文件':'已保存到仓库，正在自动发布';});
  enter().catch(async()=>{locked();try{const status=await api('status');if(!status.configured)$('login-message').textContent='后台已关闭匿名访问。管理员账号尚未启用，请完成服务端安全配置。';}catch{$('login-message').textContent='登录服务暂时不可用，请稍后重试。';}});
})();
