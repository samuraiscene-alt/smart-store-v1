/* Smart Store PWA Web Push */
(() => {
  const PUSH_CONFIG = window.SMART_STORE_CONFIG;
  if (!PUSH_CONFIG || !window.supabase) {
    console.error('Smart Store push config is not ready');
    return;
  }

  const PUSH_STORE_SLUG = PUSH_CONFIG.storeSlug;
  const PUSH_LAST_RESERVATION_KEY = `smartStoreLastReservationId:${encodeURIComponent(PUSH_STORE_SLUG||'default')}`;
  const pushSb = window.supabase.createClient(PUSH_CONFIG.supabaseUrl, PUSH_CONFIG.supabaseKey);
  const FUNCTION_URL = `${PUSH_CONFIG.supabaseUrl}/functions/v1/send-push`;
  const SERVICE_WORKER_URL = 'service-worker.js?v=20260905-1';

  async function ensureServiceWorker(){
    if(!('serviceWorker' in navigator))throw new Error('서비스워커를 지원하지 않습니다.');
    const reg=await navigator.serviceWorker.register(SERVICE_WORKER_URL,{scope:'./',updateViaCache:'none'});
    try{await reg.update();}catch{}
    const candidate=reg.installing||reg.waiting;
    if(candidate&&candidate.state!=='activated'){
      await new Promise(resolve=>{
        const done=()=>resolve();
        candidate.addEventListener('statechange',()=>{if(candidate.state==='activated')done()});
        setTimeout(done,4000);
      });
    }
    await navigator.serviceWorker.ready;
    return reg;
  }

  function isIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function isStandalone(){
    return window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }
  function supported(){
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function b64ToUint8(value){
    const padding='='.repeat((4-value.length%4)%4);
    const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
  }
  function subscriptionFields(sub){
    const j=sub.toJSON();
    return {endpoint:j.endpoint,p256dh:j.keys?.p256dh||'',auth:j.keys?.auth||''};
  }

  async function callFunction(body,{auth=false}={}){
    const headers={
      'Content-Type':'application/json',
      'apikey':PUSH_CONFIG.supabaseKey
    };
    if(auth){
      const {data:{session}}=await pushSb.auth.getSession();
      if(!session?.access_token)throw new Error('관리자 로그인이 필요합니다.');
      headers.Authorization=`Bearer ${session.access_token}`;
    }
    const res=await fetch(FUNCTION_URL,{method:'POST',headers,body:JSON.stringify(body)});
    const out=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(out.error||'푸시 서버 연결에 실패했습니다.');
    return out;
  }

  async function publicKey(){
    const out=await callFunction({action:'public_key'});
    if(!out.publicKey)throw new Error('푸시 공개키를 불러오지 못했습니다.');
    return out.publicKey;
  }

  async function getSubscription(){
    if(!supported())throw new Error('이 기기에서는 푸시 알림을 지원하지 않습니다.');

    const reg=await ensureServiceWorker();

    const key=await publicKey();
    const wantedKey=b64ToUint8(key);
    let sub=await reg.pushManager.getSubscription();

    if(sub){
      const currentKey=sub.options?.applicationServerKey;
      if(currentKey){
        const current=new Uint8Array(currentKey);
        const same=current.length===wantedKey.length &&
          current.every((v,i)=>v===wantedKey[i]);
        if(!same){
          await sub.unsubscribe();
          sub=null;
        }
      }
    }

    if(!sub){
      if(isIOS()&&!isStandalone()){
        const err=new Error('아이폰에서는 이 페이지를 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.');
        err.code='INSTALL_REQUIRED';
        throw err;
      }
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('알림 허용이 필요합니다.');

      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:wantedKey
      });
    }
    return sub;
  }

  async function subscribeAdmin(){
    const sub=await getSubscription();
    const f=subscriptionFields(sub);
    const {error}=await pushSb.rpc('register_admin_push_subscription',{
      p_slug:PUSH_STORE_SLUG,
      p_endpoint:f.endpoint,
      p_p256dh:f.p256dh,
      p_auth:f.auth,
      p_user_agent:navigator.userAgent
    });
    if(error)throw error;
    return true;
  }

  async function subscribeCustomer(reservationId){
    if(!reservationId)throw new Error('예약 정보를 찾을 수 없습니다.');
    try{localStorage.setItem(PUSH_LAST_RESERVATION_KEY,reservationId)}catch{}

    const sub=await getSubscription();
    const f=subscriptionFields(sub);
    const {error}=await pushSb.rpc('register_customer_push_subscription',{
      p_slug:PUSH_STORE_SLUG,
      p_reservation_id:reservationId,
      p_endpoint:f.endpoint,
      p_p256dh:f.p256dh,
      p_auth:f.auth,
      p_user_agent:navigator.userAgent
    });
    if(error)throw error;
    return true;
  }

  async function sendNewReservation(reservationId){
    if(!reservationId)return;
    try{
      return await callFunction({action:'new_reservation',reservation_id:reservationId});
    }catch(e){
      console.warn('admin push failed',e);
    }
  }

  async function sendReservationStatus(reservationId){
    if(!reservationId)return;
    try{
      return await callFunction(
        {action:'reservation_status',reservation_id:reservationId},
        {auth:true}
      );
    }catch(e){
      console.warn('customer push failed',e);
    }
  }

  function installAdminUi(){
    if(!document.body.classList.contains('adminBody'))return;
    if(document.getElementById('adminPushCard'))return;

    const storePanel=document.querySelector('[data-panel="store"]');
    if(!storePanel)return;

    const card=document.createElement('div');
    card.id='adminPushCard';
    card.className='formCard card';
    card.innerHTML=`
      <h3>관리자 푸시 알림</h3>
      <p class="formNote" id="adminPushNote">새 예약이 들어오면 아이폰 알림으로 알려드립니다.</p>
      <button id="enableAdminPush" class="secondary full" type="button">🔔 관리자 푸시 알림 켜기</button>
    `;

    const approval=storePanel.querySelector('#reservationApprovalMode')?.closest('.formCard');
    if(approval)approval.insertAdjacentElement('afterend',card);
    else storePanel.appendChild(card);

    const btn=document.getElementById('enableAdminPush');
    const note=document.getElementById('adminPushNote');

    async function refresh(){
      if(!supported()){
        btn.disabled=true;
        btn.textContent='이 기기에서는 푸시 알림을 지원하지 않습니다';
        return;
      }
      if(isIOS()&&!isStandalone()){
        note.textContent='아이폰에서는 관리자 페이지를 홈 화면에 추가한 뒤 알림을 켜주세요.';
        btn.textContent='홈 화면에 추가 후 알림 켜기';
        return;
      }
      if(Notification.permission==='granted'){
        try{
          const reg=await ensureServiceWorker();
          const sub=await reg.pushManager.getSubscription();
          if(sub){
            btn.textContent='관리자 푸시 알림 켜짐 ✓';
            note.textContent='앱을 닫아도 새 예약 알림을 받을 수 있습니다.';
          }
        }catch{}
      }
    }

    btn.onclick=async()=>{
      btn.disabled=true;
      try{
        await subscribeAdmin();
        btn.textContent='관리자 푸시 알림 켜짐 ✓';
        note.textContent='앱을 닫아도 새 예약 알림을 받을 수 있습니다.';
      }catch(e){
        if(e?.code==='INSTALL_REQUIRED'){
          alert('아이폰에서는 Safari의 공유 버튼 → 홈 화면에 추가한 뒤, 홈화면 아이콘으로 실행해서 알림을 켜주세요.');
        }else{
          alert(e?.message||'푸시 알림 설정에 실패했습니다.');
        }
      }finally{
        btn.disabled=false;
      }
    };

    refresh();
  }

  async function syncExistingAdmin(){
    if(!document.body.classList.contains('adminBody'))return;
    if(!supported()||Notification.permission!=='granted')return;

    try{
      const {data:{session}}=await pushSb.auth.getSession();
      if(!session)return;

      await ensureServiceWorker();
      // 권한이 이미 허용돼 있으면 현재 PWA의 구독을 매번 서버와 다시 맞춘다.
      // 서버 등록 함수가 같은 관리자 계정의 오래된 endpoint는 자동 비활성화한다.
      await subscribeAdmin();
    }catch{}
  }

  window.SmartStorePush={
    supported,isIOS,isStandalone,
    subscribeAdmin,subscribeCustomer,
    sendNewReservation,sendReservationStatus,
    installAdminUi,syncExistingAdmin
  };

  const start=()=>{
    ensureServiceWorker().catch(err=>console.warn('service worker refresh failed',err));
    installAdminUi();
    setTimeout(syncExistingAdmin,250);
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start);
  }else{
    start();
  }

  window.addEventListener('pageshow',()=>setTimeout(syncExistingAdmin,300));
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')setTimeout(syncExistingAdmin,300);
  });
})();
