/* Smart Store - persistent customer reservation result */
(() => {
  const cfg=window.SMART_STORE_CONFIG;
  if(!cfg||!window.supabase)return;

  const detailSb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const DAYS=['일','월','화','수','목','금','토'];
  const ACK_PREFIX='smartStoreReservationAck:';
  const LAST_RESERVATION_KEY='smartStoreLastReservationId';
  const PUSH_OPEN_DB='smart-store-push-open-v1';
  const PUSH_OPEN_STORE='kv';
  const checking=new Set();
  let visibleReservation=null;

  const escHtml=(value='')=>String(value).replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const won=value=>`${Number(value||0).toLocaleString('ko-KR')}원`;

  function koreanDate(iso){
    const d=new Date(`${iso}T12:00:00`);
    if(Number.isNaN(d.getTime()))return String(iso||'');
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
  }

  function ackKey(r,eventType='',eventKey=''){
    if(eventType==='changed'){
      return `${ACK_PREFIX}${eventKey||`${r.id}:changed:${r.reservation_date}:${r.reservation_time}:${r.service_id||''}:${r.staff_name||''}`}`;
    }
    return `${ACK_PREFIX}${r.id}:${r.status}`;
  }

  function isAcked(r,eventType='',eventKey=''){
    try{
      return localStorage.getItem(ackKey(r,eventType,eventKey))==='1';
    }catch{
      return false;
    }
  }

  function acknowledge(r,eventType='',eventKey=''){
    try{
      localStorage.setItem(ackKey(r,eventType,eventKey),'1');
    }catch{}
  }

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

  async function consumePendingReservation(){
    try{
      const db=await openPushOpenDb();

      const row=await new Promise((resolve,reject)=>{
        const tx=db.transaction(PUSH_OPEN_STORE,'readwrite');
        const store=tx.objectStore(PUSH_OPEN_STORE);
        const get=store.get('customerReservation');

        get.onsuccess=()=>{
          const value=get.result||null;
          store.delete('customerReservation');
          resolve(value);
        };

        get.onerror=()=>reject(get.error);
      });

      db.close();

      if(!row?.reservation_id)return null;
      if(row.saved_at&&Date.now()-Number(row.saved_at)>48*60*60*1000)return null;

      return row;
    }catch(error){
      console.warn('push open read failed',error);
      return null;
    }
  }

  function ensurePersistentModal(){
    if(document.getElementById('customerPersistentReservationAlert'))return;

    const style=document.createElement('style');

    style.textContent=`
      #customerPersistentReservationAlert{z-index:99999}
      #customerPersistentReservationAlert .persistentReservationBox{width:min(92vw,460px)}
      #customerPersistentReservationAlert .persistentReservationNote{margin:12px 0 0;color:#8e817b;font-size:13px;line-height:1.5}
      #customerPersistentReservationAlert .persistentReservationActions{display:grid;grid-template-columns:1fr;gap:9px;margin-top:18px}
      #customerPersistentReservationAlert .persistentReservationActions.two{grid-template-columns:1fr 1.15fr}
      #customerPersistentReservationAlert .reviewList .changedRow{background:#fbefec;border-radius:12px;padding:10px 12px;margin:4px -8px}
      #customerPersistentReservationAlert .changeValue{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
      #customerPersistentReservationAlert .changeOld{color:#a79690;text-decoration:line-through;font-weight:500}
      #customerPersistentReservationAlert .changeArrow{color:#b77e76;font-weight:700}
      #customerPersistentReservationAlert .changeNew{color:#6d4f4c;font-weight:800}
      #customerPersistentReservationAlert .changeBadge{display:inline-flex;align-items:center;padding:3px 7px;border-radius:999px;background:#ead4ce;color:#7b5550;font-size:11px;font-weight:800;white-space:nowrap}
    `;

    document.head.appendChild(style);

    const wrap=document.createElement('div');
    wrap.id='customerPersistentReservationAlert';
    wrap.className='modalBackdrop hidden';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');

    wrap.innerHTML=`
      <section class="confirmBox persistentReservationBox">
        <div class="confirmIcon" id="persistentReservationIcon">✓</div>
        <h3 id="persistentReservationTitle">예약 결과</h3>
        <div id="persistentReservationBody"></div>
        <p class="persistentReservationNote">이 알림은 확인할 때까지 앱 안에 남아 있습니다.</p>
        <div id="persistentReservationActions" class="persistentReservationActions">
          <button id="persistentReservationSecondary" class="secondary" type="button" style="display:none">닫기</button>
          <button id="persistentReservationPrimary" class="primary" type="button">확인</button>
        </div>
      </section>
    `;

    document.body.appendChild(wrap);

    // 배경을 눌러도 닫히지 않는다. 반드시 버튼으로 확인해야 한다.
    wrap.addEventListener('click',event=>{
      if(event.target===wrap)event.stopPropagation();
    });
  }

  function changeRow(label,current,change,key=''){
    if(!change){
      return `<div><span>${escHtml(label)}</span><b>${key==='price'?won(current):escHtml(current??'-')}</b></div>`;
    }

    const before=key==='price'?won(change.before):escHtml(change.before??'-');
    const after=key==='price'?won(change.after):escHtml(change.after??'-');

    return `
      <div class="changedRow">
        <span>${escHtml(label)}</span>
        <b class="changeValue">
          <span class="changeOld">${before}</span>
          <span class="changeArrow">→</span>
          <span class="changeNew">${after}</span>
          <span class="changeBadge">변경됨</span>
        </b>
      </div>
    `;
  }

  function detailBody(r,rejected=false,changed=false,changes={}){
    return `
      <div class="reviewList">
        <div><span>예약자</span><b>${escHtml(r.customer_name||'고객')}</b></div>
        ${changeRow('날짜',koreanDate(r.reservation_date),changes.date?{
          before:koreanDate(changes.date.before),
          after:koreanDate(changes.date.after)
        }:null)}
        ${changeRow('시간',String(r.reservation_time||'-').slice(0,5),changes.time||null)}
        ${changeRow('서비스',r.service_name||'-',changes.service||null)}
        ${changeRow('담당자',r.staff_name||'담당없음',changes.staff||null)}
        ${changeRow('예상금액',r.price,changes.price||null,'price')}
      </div>
      ${rejected?'<p style="margin-top:14px">다른 시간으로 다시 예약해주세요.</p>':''}
      ${changed?'<p style="margin-top:14px">색으로 강조된 항목이 변경된 내용입니다.</p>':''}
    `;
  }

  function hidePersistentModal(){
    document.getElementById('customerPersistentReservationAlert')?.classList.add('hidden');
    visibleReservation=null;
  }

  function showPersistentReservation(r,eventType='',eventKey='',changes={}){
    const changed=eventType==='changed'&&r?.status==='예약확정';
    const validNormal=r&&['예약확정','예약거절'].includes(r.status);

    if(!r||(!changed&&!validNormal)||isAcked(r,eventType,eventKey))return;

    ensurePersistentModal();
    visibleReservation={reservation:r,eventType,eventKey};

    const rejected=r.status==='예약거절';
    const wrap=document.getElementById('customerPersistentReservationAlert');
    const title=document.getElementById('persistentReservationTitle');
    const body=document.getElementById('persistentReservationBody');
    const icon=document.getElementById('persistentReservationIcon');
    const primary=document.getElementById('persistentReservationPrimary');
    const secondary=document.getElementById('persistentReservationSecondary');
    const actions=document.getElementById('persistentReservationActions');

    if(changed){
      title.textContent='예약 내용이 변경되었습니다 ✓';
      icon.textContent='✓';
    }else{
      title.textContent=rejected?'예약이 거절되었습니다':'예약이 확정되었습니다 ✓';
      icon.textContent=rejected?'!':'✓';
    }

    body.innerHTML=detailBody(r,rejected,changed,changes);

    if(rejected&&!changed){
      actions.classList.add('two');
      secondary.style.display='';
      secondary.textContent='닫기';
      primary.textContent='다시 예약하기';

      secondary.onclick=()=>{
        acknowledge(r,eventType,eventKey);
        hidePersistentModal();
      };

      primary.onclick=()=>{
        acknowledge(r,eventType,eventKey);
        hidePersistentModal();

        if(typeof window.openBooking==='function'){
          window.openBooking(r.service_id?{serviceId:r.service_id}:{});
        }
      };
    }else{
      actions.classList.remove('two');
      secondary.style.display='none';
      primary.textContent='확인';

      primary.onclick=()=>{
        acknowledge(r,eventType,eventKey);
        hidePersistentModal();
      };
    }

    wrap.classList.remove('hidden');
  }

  async function openReservation(reservationId,eventType='',eventKey='',changes={}){
    if(!reservationId)return;

    const checkKey=`${reservationId}:${eventType}:${eventKey}`;
    if(checking.has(checkKey))return;

    checking.add(checkKey);

    try{
      const {data:r,error}=await detailSb.rpc('public_reservation_detail',{
        p_reservation_id:reservationId
      });

      if(error)throw error;
      if(!r)return;

      if(eventType==='changed'){
        if(r.status==='예약확정'&&!isAcked(r,eventType,eventKey)){
          showPersistentReservation(r,eventType,eventKey,changes);
        }
      }else if(['예약확정','예약거절'].includes(r.status)&&!isAcked(r,eventType,eventKey)){
        showPersistentReservation(r,eventType,eventKey);
      }

      const clean=new URL(location.href);
      clean.searchParams.delete('reservation_id');
      clean.searchParams.delete('push_open');
      clean.searchParams.delete('reservation_event');
      clean.searchParams.delete('reservation_event_key');
      history.replaceState({},'',clean.pathname+clean.search+clean.hash);
    }catch(error){
      console.error('reservation result check error',error);
    }finally{
      checking.delete(checkKey);
    }
  }

  async function readPendingOpen(){
    const params=new URLSearchParams(location.search);

    let id=params.get('reservation_id')||'';
    let eventType=params.get('reservation_event')||'';
    let eventKey=params.get('reservation_event_key')||'';
    let changes={};

    const pending=await consumePendingReservation();

    if(pending?.reservation_id){
      if(!id)id=pending.reservation_id;

      if(id===pending.reservation_id){
        eventType=eventType||pending.event_type||'';
        eventKey=eventKey||pending.event_key||'';
        changes=pending.changes||{};
      }
    }

    if(!id){
      try{
        id=localStorage.getItem(LAST_RESERVATION_KEY)||'';
      }catch{}
    }

    if(id)openReservation(id,eventType,eventKey,changes);
  }

  const scheduleRead=(delay=100)=>setTimeout(readPendingOpen,delay);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>scheduleRead(250));
  }else{
    scheduleRead(250);
  }

  window.addEventListener('pageshow',()=>scheduleRead(100));
  window.addEventListener('focus',()=>scheduleRead(100));

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')scheduleRead(100);
  });

  window.addEventListener('popstate',()=>scheduleRead(0));

  navigator.serviceWorker?.addEventListener('message',event=>{
    if(event.data?.type==='smart-store-open-reservation'){
      openReservation(
        event.data.reservation_id,
        event.data.event_type||'',
        event.data.event_key||'',
        event.data.changes||{}
      );
    }
  });

  // 앱을 보고 있는 중 결과/변경 알림이 와도 시스템 배너를 누르지 않아도 놓치지 않는다.
  setInterval(()=>{
    if(document.visibilityState==='visible'&&!visibleReservation){
      readPendingOpen();
    }
  },10000);
})();
