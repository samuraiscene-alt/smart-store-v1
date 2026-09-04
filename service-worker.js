const CACHE='smart-store-v1-20260904-push-click-final-fix-1';
const ASSETS=['./','index.html','admin.html','styles.css','app.js?v=20260904-4','admin.js','admin-approval.js','push-client.js?v=20260904-5','customer-reservation.js?v=20260904-3','cloud-config.js','manifest.json','admin-manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();if(e.request.url.startsWith(self.location.origin))caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)))});


const PUSH_OPEN_DB='smart-store-push-open-v1';
const PUSH_OPEN_STORE='kv';
function openPushOpenDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(PUSH_OPEN_DB,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(PUSH_OPEN_STORE))req.result.createObjectStore(PUSH_OPEN_STORE,{keyPath:'key'});};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function savePendingCustomerReservation(reservationId){
  if(!reservationId)return;
  try{
    const db=await openPushOpenDb();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(PUSH_OPEN_STORE,'readwrite');
      tx.objectStore(PUSH_OPEN_STORE).put({key:'customerReservation',reservation_id:reservationId,saved_at:Date.now()});
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
    db.close();
  }catch(e){console.warn('push open store failed',e);}
}

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
  const reservationId=event.notification.data?.reservation_id||null;
  const raw=event.notification.data?.url||new URL('index.html',self.registration.scope).href;
  const target=new URL(raw,self.registration.scope);

  if(reservationId){
    target.searchParams.set('reservation_id',reservationId);
    target.searchParams.set('push_open',String(Date.now()));
  }

  event.waitUntil((async()=>{
    const isCustomerTarget=target.pathname.endsWith('/index.html')||target.searchParams.has('reservation_id');
    if(reservationId&&isCustomerTarget)await savePendingCustomerReservation(reservationId);
    const wins=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const win of wins){
      try{
        const current=new URL(win.url);
        if(current.origin===target.origin&&current.pathname===target.pathname){
          let active=win;
          if('navigate' in win){
            const navigated=await win.navigate(target.href);
            if(navigated)active=navigated;
          }
          await active.focus();
          if(reservationId){
            active.postMessage({type:'smart-store-open-reservation',reservation_id:reservationId});
          }
          return;
        }
      }catch{}
    }
    if(clients.openWindow){
      await clients.openWindow(target.href);
    }
  })());
});