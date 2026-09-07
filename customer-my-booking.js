/* Smart Store - customer recent booking viewer + direct cancellation */
(() => {
  const RESERVATION_KEY = 'smartStoreLastReservationId';
  const CANCEL_TOKEN_KEY = 'smartStoreLastCancelToken';
  const DAYS = ['일','월','화','수','목','금','토'];

  let detailSb = null;
  let policyCache = null;

  const esc = (v='') => String(v).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const won = v => `${Number(v || 0).toLocaleString('ko-KR')}원`;

  const kdate = iso => {
    const d = new Date(`${iso}T12:00:00`);
    return Number.isNaN(d.getTime())
      ? String(iso || '')
      : `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
  };

  function getClient(){
    if(detailSb) return detailSb;
    const cfg = window.SMART_STORE_CONFIG;
    if(!cfg || !window.supabase) return null;
    detailSb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
    return detailSb;
  }

  function styles(){
    if(document.getElementById('customerMyBookingStyle')) return;

    const s = document.createElement('style');
    s.id = 'customerMyBookingStyle';
    s.textContent = `
      #customerMyBookingOpen{
        width:100%;margin:14px 0 28px;border:1px solid var(--line);
        background:rgba(255,253,250,.96);border-radius:18px;padding:14px 16px;
        color:var(--ink);display:flex;align-items:center;justify-content:space-between;
        gap:12px;text-align:left;box-shadow:0 8px 24px rgba(67,45,40,.05);
        position:relative;z-index:1
      }
      #customerMyBookingOpen .left{display:flex;align-items:center;gap:11px;min-width:0}
      #customerMyBookingOpen .ico{
        width:38px;height:38px;flex:0 0 38px;border-radius:50%;display:grid;place-items:center;
        background:var(--soft);color:var(--accent);font-size:18px
      }
      #customerMyBookingOpen b{display:block;font-size:14px}
      #customerMyBookingOpen small{
        display:block;margin-top:3px;color:var(--muted);font-size:11px;line-height:1.4
      }
      #customerMyBookingOpen .arr{flex:0 0 auto;color:var(--accent);font-size:20px;font-weight:800}

      #customerMyBookingModal{z-index:100002}
      #customerMyBookingModal .box{width:min(92vw,440px)}
      #customerMyBookingModal .status{
        display:inline-flex;margin:2px 0 14px;padding:6px 10px;border-radius:999px;
        background:var(--soft);color:var(--dark);font-size:12px;font-weight:800
      }
      #customerMyBookingModal .empty{
        padding:18px;border-radius:18px;background:#f9f3f0;color:var(--muted);
        line-height:1.6;text-align:center
      }
      #customerMyBookingModal .hint{
        margin:12px 0 0;color:var(--muted);font-size:12px;line-height:1.5
      }
      #customerMyBookingModal .cancelInfo{
        margin-top:14px;padding:13px 14px;border-radius:14px;background:#fbf5f2;
        color:var(--muted);font-size:12px;line-height:1.55
      }
      #customerMyBookingModal .cancelInfo a{
        display:inline-block;margin-top:7px;color:var(--accent);font-weight:800;text-decoration:none
      }
      #customerMyBookingModal .actions{display:grid;gap:9px;margin-top:18px}
      #customerMyBookingModal .actions.two{grid-template-columns:1fr 1fr}
      #customerMyBookingModal .cancelButton{
        border:1px solid #d9aaa3;background:#fff8f6;color:#a65f59
      }
      #customerMyBookingModal .cancelButton:disabled{opacity:.55}
    `;
    document.head.appendChild(s);
  }

  function ensureButton(){
    styles();
    const quick = document.querySelector('.quickGrid');
    if(!quick) return false;

    let b = document.getElementById('customerMyBookingOpen');
    if(!b){
      b = document.createElement('button');
      b.id = 'customerMyBookingOpen';
      b.type = 'button';
      b.innerHTML = `
        <span class="left">
          <span class="ico">◷</span>
          <span>
            <b>내 예약 확인</b>
            <small>이 기기에서 예약한 최근 예약을 확인합니다.</small>
          </span>
        </span>
        <span class="arr">›</span>
      `;
      quick.insertAdjacentElement('afterend', b);
    }
    b.onclick = open;
    return true;
  }

  function modal(){
    if(document.getElementById('customerMyBookingModal')) return;

    styles();

    const w = document.createElement('div');
    w.id = 'customerMyBookingModal';
    w.className = 'modalBackdrop hidden';
    w.innerHTML = `
      <section class="confirmBox box">
        <div class="confirmIcon">◷</div>
        <h3>내 예약</h3>
        <div id="customerMyBookingBody">
          <div class="empty">예약 정보를 불러오는 중입니다.</div>
        </div>
        <p class="hint">현재는 이 기기에서 만든 가장 최근 예약을 보여줍니다.</p>
        <div id="customerMyBookingCancelInfo"></div>
        <div id="customerMyBookingActions" class="actions">
          <button id="customerMyBookingClose" class="primary" type="button">닫기</button>
        </div>
      </section>
    `;

    document.body.appendChild(w);

    w.addEventListener('click', e => {
      if(e.target === w) close();
    });

    bindClose();
  }

  function bindClose(){
    const b = document.getElementById('customerMyBookingClose');
    if(b) b.onclick = close;
  }

  function close(){
    document.getElementById('customerMyBookingModal')?.classList.add('hidden');
  }

  function readLocal(key){
    try{
      return localStorage.getItem(key) || '';
    }catch{
      return '';
    }
  }

  function removeLocal(key){
    try{
      localStorage.removeItem(key);
    }catch{}
  }

  async function getPolicy(force=false){
    if(policyCache && !force) return policyCache;

    const client = getClient();
    const cfg = window.SMART_STORE_CONFIG;

    const fallback = {
      enabled:false,
      deadlineHours:24,
      lateEnabled:false,
      lateText:'취소 가능 시간이 지났습니다. 매장으로 문의해주세요.',
      phone:''
    };

    if(!client || !cfg?.storeSlug){
      policyCache = fallback;
      return policyCache;
    }

    try{
      const {data:payload, error} = await client.rpc('public_store_payload', {
        p_slug:cfg.storeSlug
      });

      if(error) throw error;

      const st = payload?.store || {};

      policyCache = {
        enabled:st.customer_cancel_enabled === true,
        deadlineHours:Math.max(0, Number(st.customer_cancel_deadline_hours ?? 24)),
        lateEnabled:st.late_cancel_notice_enabled === true,
        lateText:String(st.late_cancel_notice_text || '').trim() ||
          '취소 가능 시간이 지났습니다. 매장으로 문의해주세요.',
        phone:String(st.phone || '')
      };

      return policyCache;
    }catch(e){
      console.warn('customer cancel policy load failed', e);
      policyCache = fallback;
      return policyCache;
    }
  }

  function bookingTimeMs(r){
    const date = String(r?.reservation_date || '');
    const time = String(r?.reservation_time || '').slice(0,5);
    if(!date || !time) return NaN;
    return new Date(`${date}T${time}:00+09:00`).getTime();
  }

  function cancelState(r, policy, token){
    const active = r && ['예약대기','예약확정'].includes(r.status);

    if(!active){
      return {showCancel:false, reason:''};
    }

    if(!policy.enabled){
      return {
        showCancel:false,
        reason:'고객 직접 취소가 비활성화되어 있습니다. 매장으로 문의해주세요.'
      };
    }

    if(!token){
      return {
        showCancel:false,
        reason:'이 예약의 직접 취소 정보를 이 기기에서 찾을 수 없습니다. 매장으로 문의해주세요.'
      };
    }

    const bookingMs = bookingTimeMs(r);

    if(!Number.isFinite(bookingMs)){
      return {
        showCancel:false,
        reason:'예약 시간을 확인할 수 없습니다. 매장으로 문의해주세요.'
      };
    }

    const now = Date.now();
    const deadlineMs = bookingMs - (policy.deadlineHours * 60 * 60 * 1000);

    if(now >= bookingMs){
      return {
        showCancel:false,
        reason:policy.lateEnabled
          ? policy.lateText
          : '예약 시간이 지났습니다. 매장으로 문의해주세요.'
      };
    }

    if(now > deadlineMs){
      return {
        showCancel:false,
        reason:policy.lateEnabled
          ? policy.lateText
          : '취소 가능 시간이 지났습니다. 매장으로 문의해주세요.'
      };
    }

    return {
      showCancel:true,
      reason:'',
      label:policy.deadlineHours === 0
        ? '예약 시작 전까지 직접 취소할 수 있습니다.'
        : `예약 ${policy.deadlineHours}시간 전까지 직접 취소할 수 있습니다.`
    };
  }

  function phoneLink(phone){
    const tel = String(phone || '').replace(/[^\d+]/g, '');
    if(!phone || !tel) return '';
    return `<a href="tel:${esc(tel)}">매장 문의 ${esc(phone)}</a>`;
  }

  function renderCancelInfo(state, policy){
    const box = document.getElementById('customerMyBookingCancelInfo');
    if(!box) return;

    if(state.showCancel){
      box.innerHTML = `<div class="cancelInfo">${esc(state.label || '')}</div>`;
      return;
    }

    if(state.reason){
      box.innerHTML = `
        <div class="cancelInfo">
          ${esc(state.reason)}
          ${phoneLink(policy.phone)}
        </div>
      `;
      return;
    }

    box.innerHTML = '';
  }

  function renderActions(r, state, token, policy){
    const a = document.getElementById('customerMyBookingActions');
    if(!a) return;

    const rebook = r && ['취소','예약거절','방문완료','노쇼'].includes(r.status);

    if(state.showCancel){
      a.className = 'actions two';
      a.innerHTML = `
        <button id="customerMyBookingClose" class="secondary" type="button">닫기</button>
        <button id="customerMyBookingCancel" class="secondary cancelButton" type="button">예약 취소</button>
      `;
      bindClose();

      const cancelBtn = document.getElementById('customerMyBookingCancel');
      cancelBtn.onclick = () => cancelReservation(r, token, policy, cancelBtn);
      return;
    }

    if(rebook){
      a.className = 'actions two';
      a.innerHTML = `
        <button id="customerMyBookingClose" class="secondary" type="button">닫기</button>
        <button id="customerMyBookingRebook" class="primary" type="button">다시 예약하기</button>
      `;
      bindClose();

      document.getElementById('customerMyBookingRebook').onclick = () => {
        close();
        if(typeof window.openBooking === 'function'){
          window.openBooking(r.service_id ? {serviceId:r.service_id} : {});
        }
      };
      return;
    }

    a.className = 'actions';
    a.innerHTML = `<button id="customerMyBookingClose" class="primary" type="button">닫기</button>`;
    bindClose();
  }

  async function render(r){
    const body = document.getElementById('customerMyBookingBody');
    if(!body) return;

    body.innerHTML = `
      <span class="status">${esc(r.status || '예약')}</span>
      <div class="reviewList">
        <div><span>예약자</span><b>${esc(r.customer_name || '고객')}</b></div>
        <div><span>날짜</span><b>${esc(kdate(r.reservation_date))}</b></div>
        <div><span>시간</span><b>${esc(String(r.reservation_time || '-').slice(0,5))}</b></div>
        <div><span>서비스</span><b>${esc(r.service_name || '-')}</b></div>
        <div><span>담당자</span><b>${esc(r.staff_name || '담당없음')}</b></div>
        <div><span>예상금액</span><b>${won(r.price)}</b></div>
      </div>
    `;

    const token = readLocal(CANCEL_TOKEN_KEY);
    const policy = await getPolicy();
    const state = cancelState(r, policy, token);

    renderCancelInfo(state, policy);
    renderActions(r, state, token, policy);
  }

  function empty(msg='이 기기에서 확인할 최근 예약 정보가 없습니다.<br>새 예약을 완료하면 여기에서 확인할 수 있습니다.'){
    const body = document.getElementById('customerMyBookingBody');
    const info = document.getElementById('customerMyBookingCancelInfo');

    if(body) body.innerHTML = `<div class="empty">${msg}</div>`;
    if(info) info.innerHTML = '';

    renderActions(null, {showCancel:false, reason:''}, '', {
      enabled:false, deadlineHours:24, lateEnabled:false, lateText:'', phone:''
    });
  }

  async function fetchReservation(id){
    const client = getClient();
    if(!client) throw new Error('예약 조회 기능을 준비하지 못했습니다.');

    const {data:r, error} = await client.rpc('public_reservation_detail', {
      p_reservation_id:id
    });

    if(error) throw error;
    return r || null;
  }

  async function cancelReservation(r, token, policy, button){
    if(!r?.id || !token) return;

    if(!window.confirm('이 예약을 취소하시겠습니까?')) return;

    const client = getClient();

    if(!client){
      window.alert('예약 취소 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    button.disabled = true;
    button.textContent = '취소 중...';

    try{
      const {data:result, error} = await client.rpc('cancel_public_reservation', {
        p_reservation_id:r.id,
        p_cancel_token:token
      });

      if(error) throw error;

      if(!result?.ok){
        const message = result?.message || '예약을 취소할 수 없습니다.';
        const phone = String(result?.store_phone || policy.phone || '');

        window.alert(phone ? `${message}\n매장 문의 ${phone}` : message);

        policyCache = null;

        const fresh = await fetchReservation(r.id);
        if(fresh) await render(fresh);
        return;
      }

      removeLocal(CANCEL_TOKEN_KEY);

      window.alert('예약이 정상적으로 취소되었습니다.');

      const fresh = await fetchReservation(r.id);
      if(fresh){
        await render(fresh);
      }else{
        empty();
      }
    }catch(e){
      console.error('customer direct cancel failed', e);
      window.alert(e?.message || '예약 취소에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }finally{
      if(document.body.contains(button)){
        button.disabled = false;
        button.textContent = '예약 취소';
      }
    }
  }

  async function open(){
    modal();

    const w = document.getElementById('customerMyBookingModal');
    const body = document.getElementById('customerMyBookingBody');
    const info = document.getElementById('customerMyBookingCancelInfo');

    if(body){
      body.innerHTML = '<div class="empty">예약 정보를 불러오는 중입니다.</div>';
    }
    if(info) info.innerHTML = '';

    w?.classList.remove('hidden');

    const id = readLocal(RESERVATION_KEY);

    if(!id){
      empty();
      return;
    }

    try{
      policyCache = null;

      const r = await fetchReservation(id);

      if(!r){
        empty();
        return;
      }

      await render(r);
    }catch(e){
      console.error('my booking load error', e);
      empty('예약 정보를 불러오지 못했습니다.<br>잠시 후 다시 시도해주세요.');
    }
  }

  function init(){
    ensureButton();
    modal();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  window.addEventListener('pageshow', () => setTimeout(init, 100));
  window.addEventListener('focus', () => setTimeout(ensureButton, 100));

  const retry = setInterval(() => {
    if(ensureButton()) clearInterval(retry);
  }, 500);

  setTimeout(() => clearInterval(retry), 10000);
})();
