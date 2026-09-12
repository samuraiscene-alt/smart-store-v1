const CACHE='smart-store-v1-20260912-store-scope-1';

const ASSETS=[
  './',
  'index.html',
  'admin.html',
  'styles.css',
  'app.js?v=20260904-4',
  'admin.js',
  'admin-approval.js?v=20260905-1',
  'push-client.js?v=20260905-1',
  'customer-reservation.js?v=20260905-1',
  'cloud-config.js',
  'manifest.json',
  'admin-manifest.json'
];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache=>cache.addAll(ASSETS))
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys=>
        Promise.all(
          keys
            .filter(key=>key!==CACHE)
            .map(key=>caches.delete(key))
        )
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;

  const url=new URL(event.request.url);

  const fresh=
    url.origin===self.location.origin &&
    (
      event.request.mode==='navigate' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js')
    );

  const request=fresh
    ? new Request(event.request,{cache:'no-store'})
    : event.request;

  event.respondWith(
    fetch(request)
      .then(response=>{
        const copy=response.clone();

        if(url.origin===self.location.origin){
          caches.open(CACHE).then(cache=>
            cache.put(event.request,copy)
          );
        }

        return response;
      })
      .catch(()=>
        caches.match(event.request,{ignoreSearch:true})
      )
  );
});


/* =========================================================
   PUSH OPEN STORAGE
========================================================= */

const PUSH_OPEN_DB='smart-store-push-open-v1';
const PUSH_OPEN_STORE='kv';

function openPushOpenDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(PUSH_OPEN_DB,1);

    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(PUSH_OPEN_STORE)){
        req.result.createObjectStore(
          PUSH_OPEN_STORE,
          {keyPath:'key'}
        );
      }
    };

    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function savePendingCustomerReservation(
  reservationId,
  eventType='',
  eventKey='',
  changes={},
  storeSlug=''
){
  if(!reservationId)return;

  try{
    const db=await openPushOpenDb();

    const suffix=encodeURIComponent(
      storeSlug || 'default'
    );

    await new Promise((resolve,reject)=>{
      const tx=db.transaction(
        PUSH_OPEN_STORE,
        'readwrite'
      );

      tx.objectStore(PUSH_OPEN_STORE).put({
        key:`customerReservation:${suffix}`,
        reservation_id:reservationId,
        event_type:eventType||'',
        event_key:eventKey||'',
        changes:changes||{},
        store_slug:storeSlug||'',
        saved_at:Date.now()
      });

      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });

    db.close();

  }catch(error){
    console.warn(
      'push open store failed',
      error
    );
  }
}


/* =========================================================
   OPEN CUSTOMER APP MESSAGE
========================================================= */

async function notifyOpenCustomerClients(
  reservationId,
  eventType='',
  eventKey='',
  changes={},
  storeSlug=''
){
  if(!reservationId)return;

  const wins=await clients.matchAll({
    type:'window',
    includeUncontrolled:true
  });

  for(const win of wins){

    try{

      const current=new URL(win.url);

      if(
        current.pathname.endsWith('/index.html') ||
        current.pathname.endsWith('/')
      ){

        win.postMessage({
          type:'smart-store-open-reservation',
          reservation_id:reservationId,
          event_type:eventType||'',
          event_key:eventKey||'',
          changes:changes||{},
          store_slug:storeSlug||''
        });

      }

    }catch{}

  }
}


/* =========================================================
   PUSH RECEIVE
========================================================= */

self.addEventListener('push',event=>{

  let payload={
    title:'Smart Store',
    body:'새 알림이 있습니다.',
    url:'index.html',
    tag:'smart-store'
  };

  try{

    if(event.data){
      payload={
        ...payload,
        ...event.data.json()
      };
    }

  }catch{}


  const storeSlug=payload.store_slug||'';

  const target=new URL(
    payload.url||'index.html',
    self.registration.scope
  );


  /*
   * 푸시가 어느 매장 알림인지 URL에도 저장한다.
   * 알림을 눌렀을 때 다른 매장으로 열리는 것을 방지한다.
   */
  if(storeSlug){
    target.searchParams.set(
      'store',
      storeSlug
    );
  }


  const reservationId=
    payload.reservation_id||null;

  const eventType=
    payload.event_type||'';

  const eventKey=
    payload.event_key||
    payload.tag||
    '';

  const changes=
    payload.changes||{};


  const isCustomer=
    target.pathname.endsWith('/index.html');


  const tasks=[];


  if(isCustomer && reservationId){

    /*
     * 고객이 시스템 알림을 누르지 않아도
     * 도착 즉시 매장별 저장소에 보관한다.
     */
    tasks.push(
      savePendingCustomerReservation(
        reservationId,
        eventType,
        eventKey,
        changes,
        storeSlug
      )
    );

    tasks.push(
      notifyOpenCustomerClients(
        reservationId,
        eventType,
        eventKey,
        changes,
        storeSlug
      )
    );

  }


  tasks.push(
    self.registration.showNotification(
      payload.title||'Smart Store',
      {
        body:payload.body||'',

        tag:
          payload.tag||
          'smart-store',

        renotify:true,
        requireInteraction:true,

        data:{
          url:target.href,
          reservation_id:reservationId,
          event_type:eventType,
          event_key:eventKey,
          changes,
          store_slug:storeSlug
        }
      }
    )
  );


  event.waitUntil(
    Promise.all(tasks)
  );

});


/* =========================================================
   NOTIFICATION CLICK
========================================================= */

self.addEventListener('notificationclick',event=>{

  event.notification.close();


  const reservationId=
    event.notification.data
      ?.reservation_id||null;

  const eventType=
    event.notification.data
      ?.event_type||'';

  const eventKey=
    event.notification.data
      ?.event_key||'';

  const changes=
    event.notification.data
      ?.changes||{};

  const storeSlug=
    event.notification.data
      ?.store_slug||'';


  const raw=
    event.notification.data?.url ||
    new URL(
      'index.html',
      self.registration.scope
    ).href;


  const target=new URL(
    raw,
    self.registration.scope
  );


  /*
   * 이전 버전 알림 URL에도
   * store 파라미터가 없을 수 있으므로
   * 클릭 시 한 번 더 보강한다.
   */
  if(storeSlug){
    target.searchParams.set(
      'store',
      storeSlug
    );
  }


  const isCustomer=
    target.pathname.endsWith('/index.html');


  if(isCustomer && reservationId){

    target.searchParams.set(
      'reservation_id',
      reservationId
    );

    target.searchParams.set(
      'push_open',
      String(Date.now())
    );

    if(eventType){
      target.searchParams.set(
        'reservation_event',
        eventType
      );
    }

    if(eventKey){
      target.searchParams.set(
        'reservation_event_key',
        eventKey
      );
    }

  }


  event.waitUntil(
    (async()=>{

      if(isCustomer && reservationId){

        await savePendingCustomerReservation(
          reservationId,
          eventType,
          eventKey,
          changes,
          storeSlug
        );

      }


      const wins=
        await clients.matchAll({
          type:'window',
          includeUncontrolled:true
        });


      for(const win of wins){

        try{

          const current=
            new URL(win.url);


          if(
            current.origin===target.origin &&
            current.pathname===target.pathname
          ){

            let active=win;


            if('navigate' in win){

              const navigated=
                await win.navigate(
                  target.href
                );

              if(navigated){
                active=navigated;
              }

            }


            await active.focus();


            if(
              isCustomer &&
              reservationId
            ){

              active.postMessage({
                type:
                  'smart-store-open-reservation',

                reservation_id:
                  reservationId,

                event_type:
                  eventType,

                event_key:
                  eventKey,

                changes,

                store_slug:
                  storeSlug
              });

            }


            return;

          }

        }catch{}

      }


      if(clients.openWindow){

        await clients.openWindow(
          target.href
        );

      }

    })()
  );

});
