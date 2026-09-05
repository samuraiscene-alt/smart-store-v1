const CACHE='smart-store-v1-20260905-persistent-alerts-1';
const ASSETS=['./','index.html','admin.html','styles.css','app.js?v=20260904-4','admin.js','admin-approval.js?v=20260905-1','push-client.js?v=20260905-1','customer-reservation.js?v=20260905-1','cloud-config.js','manifest.json','admin-manifest.json'];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const fresh=url.origin===self.location.origin &&
    (event.request.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('.js'));
  const request=fresh?new Request(event.request,{cache:'no-store'}):event.request;
  event.respondWith(
    fetch(request).then(response=>{
      const copy=response.clone();
      if(url.origin===self.location.origin){
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }).catch(()=>caches.match(event.request,{ignoreSearch:true}))
  );
});

const PUSH_OPEN_DB='smart-store-push-open-v1';
const PUSH_OPEN_STORE='kv';
function openPushOpenDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(PUSH_OPEN_DB,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(PUSH_OPEN_STORE)){
        req.result.createObjectStore(PUSH_OPEN_STORE,{keyPath:'key'});
      }
    };
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
      tx.objectStore(PUSH_OPEN_STORE).put({
        key:'customerReservation',
        reservation_id:reservationId,
        saved_at:Date.now()
      });
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
    db.close();
  }catch(error){
    console.warn('push open store failed',error);
  }
}

async function notifyOpenCustomerClients(reservationId){
  if(!reservationId)return;
  const wins=await clients.matchAll({type:'window',includeUncontrolled:true});
  for(const win of wins){
    try{
      const current=new URL(win.url);
      if(current.pathname.endsWith('/index.html')||current.pathname.endsWith('/')){
        win.postMessage({type:'smart-store-open-reservation',reservation_id:reservationId});
      }
    }catch{}
  }
}

self.addEventListener('push',event=>{
  let payload={title:'Smart Store',body:'새 알림이 있습니다.',url:'index.html',tag:'smart-store'};
  try{
    if(event.data)payload={...payload,...event.data.json()};
  }catch{}

  const target=new URL(payload.url||'index.html',self.registration.scope);
  const reservationId=payload.reservation_id||null;
  const isCustomer=target.pathname.endsWith('/index.html');

  const tasks=[];
  if(isCustomer&&reservationId){
    // 손님이 시스템 배너를 누르지 않아도 결과를 잃지 않도록 도착 즉시 저장한다.
    tasks.push(savePendingCustomerReservation(reservationId));
    tasks.push(notifyOpenCustomerClients(reservationId));
  }

  tasks.push(self.registration.showNotification(payload.title||'Smart Store',{
    body:payload.body||'',
    tag:payload.tag||'smart-store',
    renotify:true,
    requireInteraction:true,
    data:{url:target.href,reservation_id:reservationId}
  }));

  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const reservationId=event.notification.data?.reservation_id||null;
  const raw=event.notification.data?.url||new URL('index.html',self.registration.scope).href;
  const target=new URL(raw,self.registration.scope);
  const isCustomer=target.pathname.endsWith('/index.html');

  if(isCustomer&&reservationId){
    target.searchParams.set('reservation_id',reservationId);
    target.searchParams.set('push_open',String(Date.now()));
  }

  event.waitUntil((async()=>{
    if(isCustomer&&reservationId)await savePendingCustomerReservation(reservationId);

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
          if(isCustomer&&reservationId){
            active.postMessage({type:'smart-store-open-reservation',reservation_id:reservationId});
          }
          return;
        }
      }catch{}
    }

    if(clients.openWindow)await clients.openWindow(target.href);
  })());
});
