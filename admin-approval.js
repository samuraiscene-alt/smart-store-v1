/* Smart Store - 관리자 승인 실시간 알림 */
(() => {
  const REJECTED_STATUS = '예약거절';
  const DISMISSED_KEY = 'smartStoreDismissedPendingReservations';
  let realtimeChannel = null;
  let approvalModalReservationId = null;
  let setupDone = false;

  const css = `
    #pendingReservationBadge{
      display:none; min-width:21px; height:21px; padding:0 6px; margin-left:5px;
      border-radius:999px; background:#a94f4f; color:#fff; font-size:11px;
      font-weight:900; align-items:center; justify-content:center; vertical-align:middle;
    }
    #pendingReservationBar{
      display:none; align-items:center; justify-content:space-between; gap:12px;
      margin:12px 0 14px; padding:14px 15px; border-radius:18px;
      background:#f4dfdf; border:1px solid #e8caca; color:#6d4f4c;
    }
    #pendingReservationBar b{font-size:14px}
    #pendingReservationBar small{display:block; margin-top:3px; color:#8e817b}
    #pendingReservationBar button{
      border:0; border-radius:13px; padding:10px 13px; white-space:nowrap;
      background:#6d4f4c; color:#fff; font-weight:800;
    }
    .reservationItem.pendingApproval{border-color:#d8b8b0;background:#fff9f7}
    .approvalModalBox{width:min(100%,460px)}
    .approvalModalTop{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .approvalModalTop h3{margin:4px 0 0}
    .approvalNewBadge{
      display:inline-flex;align-items:center;justify-content:center;
      min-width:46px;height:46px;border-radius:50%;background:#f4dfdf;color:#a94f4f;
      font-weight:900;font-size:18px;
    }
    .approvalDetails{
      display:grid;gap:10px;margin-top:18px;padding:15px;
      background:#f9f3f0;border-radius:18px;
    }
    .approvalDetails div{display:flex;justify-content:space-between;gap:14px}
    .approvalDetails span{color:#8e817b;font-size:13px}
    .approvalDetails b{text-align:right;font-size:14px}
    .approvalCustomerPhone{font-size:12px;color:#8e817b;margin-top:4px}
    .approvalButtons{display:grid;grid-template-columns:1fr 1.15fr;gap:9px;margin-top:18px}
    .approvalLater{width:100%;margin-top:8px}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function safeMoney(n){ return typeof money === 'function' ? money(n) : `${Number(n||0).toLocaleString('ko-KR')}원`; }
  function safePhone(v){ return typeof formatPhone === 'function' ? formatPhone(v) : String(v||''); }
  function safeEsc(v){ return typeof esc === 'function' ? esc(v) : String(v||''); }

  function dismissedIds(){
    try { return new Set(JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function dismissId(id){
    const ids = dismissedIds();
    ids.add(id);
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  }

  function pendingReservations(){
    if (typeof data === 'undefined' || !Array.isArray(data.reservations)) return [];
    return data.reservations
      .filter(r => r.status === '예약대기')
      .sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  }

  function injectPendingUi(){
    const tab = document.querySelector('.adminTabs [data-tab="reservations"]');
    if (tab && !document.getElementById('pendingReservationBadge')){
      const badge = document.createElement('span');
      badge.id = 'pendingReservationBadge';
      badge.textContent = '0';
      tab.appendChild(badge);
    }

    const panel = document.querySelector('[data-panel="reservations"]');
    const list = document.getElementById('reservationList');
    if (panel && list && !document.getElementById('pendingReservationBar')){
      const bar = document.createElement('div');
      bar.id = 'pendingReservationBar';
      bar.innerHTML = `
        <div><b id="pendingReservationBarTitle">승인 대기 0건</b>
        <small>확인이 필요한 새 예약이 있습니다.</small></div>
        <button id="openPendingReservation">예약 확인</button>
      `;
      list.parentNode.insertBefore(bar, list);
      document.getElementById('openPendingReservation').onclick = () => {
        const next = pendingReservations()[0];
        if (next) showApprovalModal(next.id, true);
      };
    }

    if (!document.getElementById('reservationApprovalModal')){
      const wrap = document.createElement('div');
      wrap.id = 'reservationApprovalModal';
      wrap.className = 'modalBackdrop hidden';
      wrap.innerHTML = `
        <section class="confirmBox approvalModalBox">
          <div class="approvalModalTop">
            <div>
              <span class="approvalNewBadge">!</span>
              <p class="eyebrow" style="margin-top:12px">NEW BOOKING</p>
              <h3>새 예약이 들어왔습니다</h3>
            </div>
            <button id="approvalModalClose" class="iconBtn">✕</button>
          </div>
          <div id="approvalReservationDetails" class="approvalDetails"></div>
          <div class="approvalButtons">
            <button id="rejectPendingReservation" class="danger">예약 거절</button>
            <button id="approvePendingReservation" class="primary">예약 승인</button>
          </div>
          <button id="approvalLater" class="textBtn approvalLater">나중에 확인</button>
        </section>
      `;
      document.body.appendChild(wrap);

      document.getElementById('approvalModalClose').onclick = closeApprovalModal;
      document.getElementById('approvalLater').onclick = () => {
        if (approvalModalReservationId) dismissId(approvalModalReservationId);
        closeApprovalModal();
      };
      document.getElementById('approvePendingReservation').onclick = () => decideReservation('예약확정');
      document.getElementById('rejectPendingReservation').onclick = () => decideReservation(REJECTED_STATUS);
    }
  }

  function refreshPendingUi(){
    injectPendingUi();
    const count = pendingReservations().length;
    const badge = document.getElementById('pendingReservationBadge');
    const bar = document.getElementById('pendingReservationBar');
    const title = document.getElementById('pendingReservationBarTitle');

    if (badge){
      badge.textContent = String(count);
      badge.style.display = count ? 'inline-flex' : 'none';
    }
    if (bar) bar.style.display = count ? 'flex' : 'none';
    if (title) title.textContent = `승인 대기 ${count}건`;
  }

  function closeApprovalModal(){
    document.getElementById('reservationApprovalModal')?.classList.add('hidden');
    approvalModalReservationId = null;
  }

  function showApprovalModal(id, force=false){
    injectPendingUi();
    const r = data.reservations.find(x => x.id === id && x.status === '예약대기');
    if (!r) return;
    if (!force && dismissedIds().has(id)) return;

    approvalModalReservationId = id;
    const details = document.getElementById('approvalReservationDetails');
    details.innerHTML = `
      <div><span>고객</span><b>${safeEsc(r.customerName || '고객')}<div class="approvalCustomerPhone">${safeEsc(safePhone(r.customerPhone || ''))}</div></b></div>
      <div><span>날짜</span><b>${safeEsc(r.date)}</b></div>
      <div><span>시간</span><b>${safeEsc(r.time)}</b></div>
      <div><span>서비스</span><b>${safeEsc(r.serviceName || '')}</b></div>
      <div><span>${safeEsc(data.store.staffLabel || '담당자')}</span><b>${safeEsc(r.staffName || '담당없음')}</b></div>
      <div><span>금액</span><b>${safeMoney(r.price)}</b></div>
    `;
    document.getElementById('reservationApprovalModal').classList.remove('hidden');
  }

  async function decideReservation(status){
    const id = approvalModalReservationId;
    if (!id) return;
    const approveBtn = document.getElementById('approvePendingReservation');
    const rejectBtn = document.getElementById('rejectPendingReservation');
    approveBtn.disabled = true; rejectBtn.disabled = true;

    const { error } = await sb.from('reservations').update({status}).eq('id', id).eq('status','예약대기');
    approveBtn.disabled = false; rejectBtn.disabled = false;
    if (error){ alert(error.message); return; }

    closeApprovalModal();
    await window.SmartStorePush?.sendReservationStatus(id);
    await loadAdminData();
    if (typeof showAdminMessage === 'function'){
      showAdminMessage(status === '예약확정' ? '예약 승인 완료 ✓' : '예약 거절 완료 ✓');
    }
    setTimeout(() => {
      const next = pendingReservations()[0];
      if (next) showApprovalModal(next.id);
    }, 250);
  }

  // 예약 목록에 "예약거절" 상태 추가 + 대기행 강조
  const enhancedRenderReservations = () => {
    const statuses=['예약대기','예약확정','방문완료','예약거절','취소','노쇼'];
    const rs=[...data.reservations].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
    const list=document.getElementById('reservationList');
    if (!list) return;
    list.innerHTML=rs.length?rs.map(r=>`
      <article class="adminItem reservationItem ${r.status==='예약대기'?'pendingApproval':''}">
        <div>
          <h3>${r.date} ${r.time} · ${safeEsc(r.customerName||'고객')}</h3>
          <p>${safeEsc(r.serviceName)} · ${safeEsc(r.staffName||'담당없음')} · ${safeMoney(r.price)}</p>
        </div>
        <select class="reservationSelect" data-res-status="${r.id}">
          ${statuses.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </article>`).join(''):'<p class="formNote">아직 예약이 없습니다.</p>';

    document.querySelectorAll('[data-res-status]').forEach(sel=>{
      sel.onchange=async()=>{
        const reservationId=sel.dataset.resStatus;
const currentReservation=data.reservations.find(r=>r.id===reservationId);
const wasPending=currentReservation?.status==='예약대기';
const nextStatus=sel.value;

const {error}=await sb.from('reservations')
  .update({status:nextStatus})
  .eq('id',reservationId);

if(error){
  alert(error.message);
  await loadAdminData();
  return;
}

if(wasPending&&['예약확정','예약거절'].includes(nextStatus)){
  await window.SmartStorePush?.sendReservationStatus(reservationId);
}

await loadAdminData();
      };
    });
  };
  try { renderReservations = enhancedRenderReservations; } catch {}

  // 예약거절은 오늘 예약/CRM 예약 횟수에서 제외
  try {
    const previousRenderAll = renderAll;
    renderAll = function(){
      previousRenderAll();
      const today = new Intl.DateTimeFormat('en-CA',{
        timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
      }).format(new Date());
      const todayEl = document.getElementById('todayReservations');
      if (todayEl){
        todayEl.textContent = data.reservations.filter(
          r => r.date===today && !['취소','노쇼',REJECTED_STATUS].includes(r.status)
        ).length;
      }
      refreshPendingUi();
    };
  } catch {}

  try {
    const previousOpenCustomer = openCustomer;
    openCustomer = function(id){
      previousOpenCustomer(id);
      const rs = customerReservations(id);
      const reservations = rs.filter(r => !['취소','노쇼',REJECTED_STATUS].includes(r.status));
      const visits = rs.filter(r => r.status === '방문완료');
      const reservationCount = document.getElementById('customerReservationCount');
      if (reservationCount) reservationCount.textContent = reservations.length;
      const visitCount = document.getElementById('customerVisitCount');
      if (visitCount) visitCount.textContent = visits.length;
      const total = document.getElementById('customerTotalSpend');
      if (total) total.textContent = safeMoney(visits.reduce((sum,r)=>sum+Number(r.price||0),0));
      const last = document.getElementById('customerLastVisit');
      if (last) last.textContent = visits[0]?.date || '-';
    };
  } catch {}

  async function ensureRealtime(){
    if (realtimeChannel || !storeId || !currentUser) return;
    realtimeChannel = sb.channel(`admin-reservations-${storeId}`)
      .on('postgres_changes',{
        event:'*', schema:'public', table:'reservations', filter:`store_id=eq.${storeId}`
      }, async payload => {
        const insertedPending = payload.eventType==='INSERT' && payload.new?.status==='예약대기';
        await loadAdminData();
        if (insertedPending){
          setTimeout(() => showApprovalModal(payload.new.id, true), 120);
        }
      })
      .subscribe();
  }

  function afterAdminDataLoaded(){
    setupDone = true;
    refreshPendingUi();
    enhancedRenderReservations();
    ensureRealtime();
    const first = pendingReservations().find(r => !dismissedIds().has(r.id));
    if (first && document.getElementById('reservationApprovalModal')?.classList.contains('hidden')){
      setTimeout(() => showApprovalModal(first.id), 250);
    }
  }

  // loadAdminData 후마다 승인대기 UI/Realtime 갱신
  try {
    const previousLoadAdminData = loadAdminData;
    loadAdminData = async function(){
      await previousLoadAdminData();
      afterAdminDataLoaded();
    };
  } catch {}

  // admin.js의 초기 비동기 로딩이 먼저 끝난 경우도 보정
  let tries = 0;
  const readyTimer = setInterval(() => {
    tries++;
    if (typeof storeId !== 'undefined' && storeId && typeof data !== 'undefined' && Array.isArray(data.reservations)){
      clearInterval(readyTimer);
      afterAdminDataLoaded();
    } else if (tries > 60){
      clearInterval(readyTimer);
    }
  }, 250);

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && realtimeChannel){
      sb.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  });
})();
/* 예약 날짜/시간 수정 + Google Calendar 자동 /* 예약 상세 수정 + Google Calendar 자동 동기화 */
(() => {
  let editingReservationId = null;
  let originalReservation = null;

  const style = document.createElement('style');
  style.textContent = `
    .reservationEditActions{
      display:flex;
      flex-direction:column;
      gap:7px;
      align-items:stretch;
    }

    .reservationScheduleEdit{
      white-space:nowrap;
    }

    #reservationScheduleModal .reservationEditSummary{
      margin:12px 0 16px;
      padding:14px;
      border-radius:16px;
      background:#f9f3f0;
      color:#6d4f4c;
      line-height:1.55;
    }

    #reservationServiceInfo{
      display:block;
      margin-top:7px;
      color:#8e817b;
      font-size:13px;
    }

    #reservationStaffField.hidden{
      display:none;
    }
  `;
  document.head.appendChild(style);

  function safeText(v=''){
    return String(v).replace(/[&<>"']/g,m=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m]));
  }

  function activeServices(currentId){
    return data.services.filter(
      s => s.active !== false || s.id === currentId
    );
  }

  function serviceById(id){
    return data.services.find(s => s.id === id);
  }

  function staffById(id){
    return data.staff.find(s => s.id === id);
  }

  function compatibleStaff(serviceId){
    return data.staff.filter(
      s =>
        s.active !== false &&
        Array.isArray(s.services) &&
        s.services.includes(serviceId)
    );
  }

  function ensureReservationEditModal(){
    if(document.getElementById('reservationScheduleModal')) return;

    const wrap=document.createElement('div');
    wrap.id='reservationScheduleModal';
    wrap.className='modalBackdrop hidden';

    wrap.innerHTML=`
      <section class="confirmBox editBox">
        <div class="sheetTop">
          <div>
            <p class="eyebrow">BOOKING</p>
            <h3>예약 상세 수정</h3>
          </div>
          <button id="reservationScheduleClose" class="iconBtn">✕</button>
        </div>

        <div
          id="reservationEditSummary"
          class="reservationEditSummary">
        </div>

        <label class="field">
          <span>서비스</span>
          <select id="reservationEditService"></select>
          <small id="reservationServiceInfo"></small>
        </label>

        <label
          id="reservationStaffField"
          class="field">
          <span id="reservationStaffLabel">담당자</span>
          <select id="reservationEditStaff"></select>
        </label>

        <label class="field">
          <span>예약 날짜</span>
          <input
            id="reservationEditDate"
            type="date">
        </label>

        <label class="field">
          <span>예약 시간</span>
          <input
            id="reservationEditTime"
            type="time">
        </label>

        <label class="field">
          <span>관리자 메모</span>
          <textarea
            id="reservationEditNote"
            rows="3"
            placeholder="예약 관련 메모"></textarea>
        </label>

        <div class="confirmActions">
          <button
            id="reservationScheduleCancel"
            class="secondary">
            취소
          </button>

          <button
            id="reservationScheduleSave"
            class="primary">
            저장
          </button>
        </div>
      </section>
    `;

    document.body.appendChild(wrap);

    document.getElementById(
      'reservationScheduleClose'
    ).onclick=closeReservationEdit;

    document.getElementById(
      'reservationScheduleCancel'
    ).onclick=closeReservationEdit;

    document.getElementById(
      'reservationScheduleSave'
    ).onclick=saveReservationEdit;

    document.getElementById(
      'reservationEditService'
    ).onchange=()=>{
      const serviceId=
        document.getElementById(
          'reservationEditService'
        ).value;

      refreshServiceInfo();
      refreshStaffOptions(serviceId);
    };
  }

  function closeReservationEdit(){
    document.getElementById(
      'reservationScheduleModal'
    )?.classList.add('hidden');

    editingReservationId=null;
    originalReservation=null;
  }

  function refreshServiceInfo(){
    const serviceId=
      document.getElementById(
        'reservationEditService'
      )?.value;

    const svc=serviceById(serviceId);
    const info=document.getElementById(
      'reservationServiceInfo'
    );

    if(!svc || !info) return;

    info.textContent=
      `${Number(svc.price||0).toLocaleString('ko-KR')}원 · ` +
      `${Number(svc.duration||30)}분`;
  }

  function refreshStaffOptions(serviceId,preferredId=null){
    const field=document.getElementById(
      'reservationStaffField'
    );

    const select=document.getElementById(
      'reservationEditStaff'
    );

    if(!field || !select) return;

    if(data.store.staffEnabled === false){
      field.classList.add('hidden');
      select.innerHTML='';
      return;
    }

    field.classList.remove('hidden');

    document.getElementById(
      'reservationStaffLabel'
    ).textContent=
      data.store.staffLabel || '담당자';

    let staffList=compatibleStaff(serviceId);

    /*
      기존 예약의 서비스와 동일한 경우,
      현재 담당자가 비활성 상태여도 표시해서
      기존 예약을 깨뜨리지 않는다.
    */
    if(
      originalReservation &&
      serviceId === originalReservation.serviceId &&
      originalReservation.staffId &&
      !staffList.some(
        s => s.id === originalReservation.staffId
      )
    ){
      const current=
        staffById(originalReservation.staffId);

      if(current){
        staffList=[
          current,
          ...staffList.filter(
            s => s.id !== current.id
          )
        ];
      }
    }

    if(!staffList.length){
      select.innerHTML=
        `<option value="">가능한 담당자 없음</option>`;
      return;
    }

    select.innerHTML=
      staffList.map(s=>
        `<option value="${s.id}">
          ${safeText(s.name)}
        </option>`
      ).join('');

    if(
      preferredId &&
      staffList.some(s=>s.id===preferredId)
    ){
      select.value=preferredId;
    }else{
      select.value=staffList[0].id;
    }
  }

  async function openReservationEdit(id){
    ensureReservationEditModal();

    const r=data.reservations.find(
      x => x.id === id
    );

    if(!r) return;

    editingReservationId=id;
    originalReservation=r;

    const services=
      activeServices(r.serviceId);

    const serviceSelect=
      document.getElementById(
        'reservationEditService'
      );

    serviceSelect.innerHTML=
      services.map(s=>
        `<option value="${s.id}">
          ${safeText(s.name)}
        </option>`
      ).join('');

    if(
      services.some(
        s => s.id === r.serviceId
      )
    ){
      serviceSelect.value=r.serviceId;
    }

    document.getElementById(
      'reservationEditDate'
    ).value=r.date;

    document.getElementById(
      'reservationEditTime'
    ).value=r.time;

    document.getElementById(
      'reservationEditSummary'
    ).innerHTML=`
      <b>${safeText(r.customerName||'고객')}</b><br>
      ${safeText(r.customerPhone||'')}
    `;

    const {data:dbReservation,error}=
      await sb
        .from('reservations')
        .select('note')
        .eq('id',id)
        .maybeSingle();

    document.getElementById(
      'reservationEditNote'
    ).value=
      error
        ? ''
        : (dbReservation?.note || '');

    refreshServiceInfo();

    refreshStaffOptions(
      serviceSelect.value,
      r.staffId
    );

    document.getElementById(
      'reservationScheduleModal'
    ).classList.remove('hidden');
  }

  async function saveReservationEdit(){
    if(
      !editingReservationId ||
      !originalReservation
    ) return;

    const serviceId=
      document.getElementById(
        'reservationEditService'
      ).value;

    const date=
      document.getElementById(
        'reservationEditDate'
      ).value;

    const time=
      document.getElementById(
        'reservationEditTime'
      ).value;

    const note=
      document.getElementById(
        'reservationEditNote'
      ).value.trim();

    const service=
      serviceById(serviceId);

    if(!service){
      alert('서비스를 선택해주세요.');
      return;
    }

    if(!date || !time){
      alert('날짜와 시간을 선택해주세요.');
      return;
    }

    const patch={
      service_id:service.id,
      service_name:service.name,
      price:Number(service.price||0),
      duration_minutes:Number(
        service.duration||30
      ),
      reservation_date:date,
      reservation_time:time,
      note:note || null
    };

    if(data.store.staffEnabled !== false){
      const staffId=
        document.getElementById(
          'reservationEditStaff'
        ).value;

      const staff=
        staffById(staffId);

      if(!staff){
        alert(
          `선택한 서비스가 가능한 ${
            data.store.staffLabel || '담당자'
          }를 선택해주세요.`
        );
        return;
      }

      patch.staff_id=staff.id;
      patch.staff_name=staff.name;
      patch.staff_any=false;
    }

    const button=
      document.getElementById(
        'reservationScheduleSave'
      );

    button.disabled=true;

    const {error}=await sb
      .from('reservations')
      .update(patch)
      .eq('id',editingReservationId);

    button.disabled=false;

    if(error){
      alert(error.message);
      return;
    }

    closeReservationEdit();

    await loadAdminData();

    if(
      typeof showAdminMessage === 'function'
    ){
      showAdminMessage(
        '예약 상세 변경 완료 ✓'
      );
    }
  }

  function enhanceReservationEditButtons(){
    ensureReservationEditModal();

    document.querySelectorAll(
      '#reservationList .reservationItem'
    ).forEach(row=>{

      const select=
        row.querySelector(
          '[data-res-status]'
        );

      if(!select) return;

      const id=
        select.dataset.resStatus;

      if(
        row.querySelector(
          `[data-edit-reservation="${id}"]`
        )
      ) return;

      let actions=
        row.querySelector(
          '.reservationEditActions'
        );

      if(!actions){
        actions=
          document.createElement('div');

        actions.className=
          'reservationEditActions';

        select.parentNode.insertBefore(
          actions,
          select
        );

        actions.appendChild(select);
      }

      const button=
        document.createElement('button');

      button.type='button';
      button.className=
        'secondary mini reservationScheduleEdit';

      button.dataset.editReservation=id;
      button.textContent='예약수정';

      button.onclick=
        ()=>openReservationEdit(id);

      actions.insertBefore(
        button,
        select
      );
    });
  }

  try{
    const previousLoadAdminData=
      loadAdminData;

    loadAdminData=
      async function(){

        await previousLoadAdminData();

        setTimeout(
          enhanceReservationEditButtons,
          0
        );
      };

  }catch{}

  let tries=0;

  const timer=setInterval(()=>{

    tries++;

    if(
      typeof data !== 'undefined' &&
      Array.isArray(data.reservations) &&
      document.getElementById(
        'reservationList'
      )
    ){
      enhanceReservationEditButtons();
      clearInterval(timer);
    }

    if(tries>60){
      clearInterval(timer);
    }

  },250);
})();
