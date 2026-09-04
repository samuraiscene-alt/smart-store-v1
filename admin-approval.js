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
        const wasPending=r.status==='예약대기';
        const {error}=await sb.from('reservations').update({status:sel.value}).eq('id',sel.dataset.resStatus);
        if(error){alert(error.message);return}
        if(wasPending&&['예약확정','예약거절'].includes(sel.value)){
          await window.SmartStorePush?.sendReservationStatus(r.id);
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
