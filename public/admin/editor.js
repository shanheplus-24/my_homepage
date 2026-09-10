/* global CMS */
(async()=>{
  try {
    const response=await fetch('/api/admin/config',{credentials:'same-origin',cache:'no-store'});
    if(!response.ok) throw new Error('登录已过期，请返回后台重新登录。');
    const config=await response.json();
    CMS.init({config:{...config,load_config_file:false,local_backend:false}});
  } catch(error){document.getElementById('error').textContent=error.message;}
})();
