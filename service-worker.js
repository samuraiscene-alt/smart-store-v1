const CACHE='smart-store-v1-20260904-pwa-push-1';
const ASSETS=['./','index.html','admin.html','styles.css','app.js','admin.js','admin-approval.js','push-client.js','cloud-config.js','manifest.json','admin-manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();if(e.request.url.startsWith(self.location.origin))caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});

self.addEventListener('push',event=>{
  let payload={title:'Smart Store',body:'새 알림이 있습니다.',url:'index.html',tag:'smart-store'};
  try{if(event.data)payload={...payload,...event.data.json()}}catch{}
  const url=new URL(payload.url||'index.html',self.registration.scope).href;
  event.waitUntil(self.registration.showNotification(payload.title||'Smart Store',{
    body:payload.body||'',
    tag:payload.tag||'smart-store',
    data:{url,reservation_id:payload.reservation_id||null}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const url=event.notification.data?.url||new URL('index.html',self.registration.scope).href;
  event.waitUntil((async()=>{
    const wins=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const win of wins){
      try{
        const a=new URL(win.url),b=new URL(url);
        if(a.origin===b.origin&&a.pathname===b.pathname){
          await win.focus();
          if('navigate' in win)await win.navigate(url);
          return;
        }
      }catch{}
    }
    if(clients.openWindow)return clients.openWindow(url);
  })());
});