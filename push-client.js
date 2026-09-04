/* Smart Store PWA Web Push */
(() => {
  const FUNCTION_URL = `${CONFIG.supabaseUrl}/functions/v1/send-push`;

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
  function b64ToUint8(base64String){
    const padding='='.repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
  }
  function subscriptionFields(sub){
    const j=sub.toJSON();
    return {
      endpoint:j.endpoint,
      p256dh:j.keys?.p256dh||'',
      auth:j.keys?.auth||''
    };
  }
  async function callFunction(body,{auth=false}={}){
    const headers={
      'Content-Type':'application/json',
      'apikey':CONFIG.supabaseKey
    };
    if(auth){
      const {data:{session}}=await sb.auth.getSession();
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
    const reg=await navigator.serviceWorker.register('service-worker.js');
    await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      if(isIOS()&&!isStandalone()){
        const err=new Error('아이폰에서는 이 페이지를 홈 화면에 추가한 뒤 알림을 켤 수 있습니다.');
        err.code='INSTALL_REQUIRED';
        throw err;
      }
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('알림 허용이 필요합니다.');
      const key=await publicKey();
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:b64ToUint8(key)
      });
    }
    return sub;
  }
  async function subscribeAdmin(){
    const sub=await getSubscription();
    const f=subscriptionFields(sub);
    const {error}=await sb.rpc('register_admin_push_subscription',{
      p_slug:STORE_SLUG,
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
    try{localStorage.setItem('smartStoreLastReservationId',reservationId)}catch{}
    const sub=await getSubscription();
    const f=subscriptionFields(sub);
    const {error}=await sb.rpc('register_customer_push_subscription',{
      p_slug:STORE_SLUG,
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
    try{return await callFunction({action:'new_reservation',reservation_id:reservationId})}
    catch(e){console.warn('admin push failed',e)}
  }
  async function sendReservationStatus(reservationId){
    if(!reservationId)return;
    try{return await callFunction({action:'reservation_status',reservation_id:reservationId},{auth:true})}
    catch(e){console.warn('customer push failed',e)}
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

    const refresh=async()=>{
      if(!supported()){
        btn.disabled=true;btn.textContent='이 기기에서는 푸시 알림을 지원하지 않습니다';
        return;
      }
      if(isIOS()&&!isStandalone()){
        note.textContent='아이폰에서는 관리자 페이지를 홈 화면에 추가한 뒤 알림을 켜주세요.';
        btn.textContent='홈 화면에 추가 후 알림 켜기';
        return;
      }
      if(Notification.permission==='granted'){
        try{
          const reg=await navigator.serviceWorker.register('service-worker.js');
          const sub=await reg.pushManager.getSubscription();
          if(sub){
            btn.textContent='관리자 푸시 알림 켜짐 ✓';
            note.textContent='앱을 닫아도 새 예약 알림을 받을 수 있습니다.';
          }
        }catch{}
      }
    };
    btn.onclick=async()=>{
      btn.disabled=true;
      try{
        await subscribeAdmin();
        btn.textContent='관리자 푸시 알림 켜짐 ✓';
        note.textContent='앱을 닫아도 새 예약 알림을 받을 수 있습니다.';
      }catch(e){
        if(e?.code==='INSTALL_REQUIRED'){
          alert('아이폰에서는 이 관리자 페이지를 Safari의 공유 버튼 → 홈 화면에 추가한 뒤, 홈화면 아이콘으로 실행해서 알림을 켜주세요.');
        }else{
          alert(e?.message||'푸시 알림 설정에 실패했습니다.');
        }
      }finally{btn.disabled=false}
    };
    refresh();
  }

  // 이미 권한이 허용된 관리자 PWA는 로그인 후 구독을 다시 동기화
  async function syncExistingAdmin(){
    if(!document.body.classList.contains('adminBody')||!supported()||Notification.permission!=='granted')return;
    try{
      const reg=await navigator.serviceWorker.register('service-worker.js');
      const sub=await reg.pushManager.getSubscription();
      if(sub)await subscribeAdmin();
    }catch{}
  }

  window.SmartStorePush={
    supported,isIOS,isStandalone,
    subscribeAdmin,subscribeCustomer,
    sendNewReservation,sendReservationStatus,
    installAdminUi,syncExistingAdmin
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(installAdminUi,100));
  }else setTimeout(installAdminUi,100);

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(document.body.classList.contains('adminBody')){
      installAdminUi();
      try{
        if(typeof currentUser!=='undefined'&&currentUser){
          clearInterval(timer);
          syncExistingAdmin();
        }
      }catch{}
    }else clearInterval(timer);
    if(tries>80)clearInterval(timer);
  },250);
})();