/* Smart Store - customer multi booking + phone verified cross-device lookup */
(() => {
  const RESERVATION_KEY = 'smartStoreLastReservationId';
  const CANCEL_TOKEN_KEY = 'smartStoreLastCancelToken';
  const HISTORY_KEY = 'smartStoreReservationHistoryV1';
  const TOKEN_MAP_KEY = 'smartStoreReservationCancelTokensV1';
  const AUTH_STORAGE_KEY = 'smartStoreCustomerPhoneAuthV1';
  const DAYS = ['일','월','화','수','목','금','토'];

  let detailSb = null;
  let policyCache = null;
  let currentReservation = null;
  let pendingPhoneE164 = '';

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

  function bookingTimeMs(r){
    const date = String(r?.reservation_date || '');
    const time = String(r?.reservation_time || '').slice(0,5);
    if(!date || !time) return NaN;
    return new Date(`${date}T${time}:00+09:00`).getTime();
  }

  function getClient(){
    if(detailSb) return detailSb;

    const cfg = window.SMART_STORE_CONFIG;
    if(!cfg || !window.supabase) return null;

    detailSb = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseKey,
      {
        auth:{
          storageKey:AUTH_STORAGE_KEY,
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:false
        }
      }
    );

    return detailSb;
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

  function readJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    }catch{
      return fallback;
    }
  }

  function writeJson(key, value){
    try{
      localStorage.setItem(key, JSON.stringify(value));
    }catch{}
  }

  function getHistory(){
    const value = readJson(HISTORY_KEY, []);
    return Array.isArray(value)
      ? [...new Set(value.filter(Boolean).map(String))]
      : [];
  }

  function setHistory(ids){
    writeJson(
      HISTORY_KEY,
      [...new Set((ids || []).filter(Boolean).map(String))].slice(0,50)
    );
  }

  function getTokenMap(){
    const value = readJson(TOKEN_MAP_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  }

  function setTokenFor(id, token){
    if(!id || !token) return;
    const map = getTokenMap();
    map[String(id)] = String(token);
    writeJson(TOKEN_MAP_KEY, map);
  }

  function getTokenFor(id){
    if(!id) return '';
    return String(getTokenMap()[String(id)] || '');
  }

  function removeTokenFor(id){
    if(!id) return;
    const map = getTokenMap();
    delete map[String(id)];
    writeJson(TOKEN_MAP_KEY, map);
  }

  function syncLegacyLatest(){
    const id = readLocal(RESERVATION_KEY);
    if(!id) return;

    const token = readLocal(CANCEL_TOKEN_KEY);
    const ids = getHistory();

    if(ids[0] !== id){
      setHistory([id, ...ids.filter(x => x !== id)]);
    }

    if(token){
      setTokenFor(id, token);
    }
  }

  function toE164Kr(raw){
    let digits = String(raw || '').replace(/\D/g, '');

    if(digits.startsWith('82')){
      const local = digits.slice(2);
      if(local.length < 9 || local.length > 11) return '';
      return `+82${local}`;
    }

    if(digits.startsWith('0')){
      digits = digits.slice(1);
    }

    if(digits.length < 9 || digits.length > 10) return '';
    return `+82${digits}`;
  }

  function domesticPhone(raw){
    let digits = String(raw || '').replace(/\D/g, '');

    if(digits.startsWith('82')){
      digits = `0${digits.slice(2)}`;
    }else if(!digits.startsWith('0') && digits.length >= 9){
      digits = `0${digits}`;
    }

    return digits;
  }

  function maskPhone(raw){
    const d = domesticPhone(raw);

    if(d.length >= 10){
      return `${d.slice(0,3)}-****-${d.slice(-4)}`;
    }

    return '인증된 휴대폰';
  }

  function friendlyAuthError(error){
    const raw = String(error?.message || error || '').trim();
    const lower = raw.toLowerCase();

    if(
      lower.includes('sms') && (
        lower.includes('provider') ||
        lower.includes('disabled') ||
        lower.includes('not enabled') ||
        lower.includes('unsupported')
      )
    ){
      return '현재 휴대폰 SMS 인증 서비스 설정이 완료되지 않았습니다.';
    }

    if(
      lower.includes('rate') ||
      lower.includes('too many') ||
      lower.includes('60 seconds')
    ){
      return '인증번호를 너무 자주 요청했습니다. 잠시 후 다시 시도해주세요.';
    }

    if(
      lower.includes('expired') ||
      lower.includes('invalid') ||
      lower.includes('token')
    ){
      return '인증번호가 올바르지 않거나 만료되었습니다. 다시 확인해주세요.';
    }

    return raw || '휴대폰 인증 중 오류가 발생했습니다.';
  }

  async function authPhone(){
    const client = getClient();
    if(!client) return '';

    try{
      const {data, error} = await client.auth.getSession();
      if(error) throw error;
      return String(data?.session?.user?.phone || '');
    }catch(e){
      console.warn('customer auth session read failed', e);
      return '';
    }
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
      #customerMyBookingModal .box{
        width:min(92vw,440px);
        max-height:min(82dvh,760px);
        overflow:auto;
        -webkit-overflow-scrolling:touch
      }
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

      #customerMyBookingModal .list{display:grid;gap:10px;margin-top:4px}
      #customerMyBookingModal .bookingItem{
        width:100%;border:1px solid var(--line);background:#fffdfa;border-radius:16px;padding:14px;
        color:var(--ink);text-align:left;display:grid;grid-template-columns:1fr auto;
        gap:10px;align-items:center
      }
      #customerMyBookingModal .bookingItem .main{min-width:0}
      #customerMyBookingModal .bookingItem .top{
        display:flex;align-items:center;gap:8px;flex-wrap:wrap
      }
      #customerMyBookingModal .bookingItem .badge{
        display:inline-flex;padding:4px 8px;border-radius:999px;background:var(--soft);
        color:var(--dark);font-size:11px;font-weight:800
      }
      #customerMyBookingModal .bookingItem b{
        display:block;margin-top:7px;font-size:15px;line-height:1.35
      }
      #customerMyBookingModal .bookingItem small{
        display:block;margin-top:4px;color:var(--muted);font-size:12px;line-height:1.45
      }
      #customerMyBookingModal .bookingItem .arr{
        color:var(--accent);font-size:22px;font-weight:800
      }
      #customerMyBookingModal .sectionLabel{
        margin:4px 0 9px;font-size:12px;font-weight:900;color:var(--accent);letter-spacing:.06em
      }
      #customerMyBookingModal .backToList{
        display:inline-flex;margin:0 0 12px;padding:0;border:0;background:none;
        color:var(--accent);font-weight:800
      }

      #customerMyBookingModal .authCard{
        margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:#fffdfa
      }
      #customerMyBookingModal .authCard b{
        display:block;font-size:13px;color:var(--ink)
      }
      #customerMyBookingModal .authCard p{
        margin:6px 0 12px;color:var(--muted);font-size:12px;line-height:1.55
      }
      #customerMyBookingModal .authCard button{width:100%}
      #customerMyBookingModal .verifiedBar{
        margin:0 0 12px;padding:10px 12px;border-radius:14px;background:#f7efeb;
        display:flex;align-items:center;justify-content:space-between;gap:10px
      }
      #customerMyBookingModal .verifiedBar span{
        color:var(--dark);font-size:12px;font-weight:800
      }
      #customerMyBookingModal .verifiedBar button{
        border:0;background:none;color:var(--accent);padding:4px;font-weight:800;font-size:12px
      }

      #customerMyBookingModal .authIntro{
        margin:0 0 14px;color:var(--muted);font-size:13px;line-height:1.6
      }
      #customerMyBookingModal .authField{
        display:block;margin-top:12px
      }
      #customerMyBookingModal .authField span{
        display:block;margin-bottom:6px;color:var(--muted);font-size:12px;font-weight:800
      }
      #customerMyBookingModal .authField input{
        width:100%;box-sizing:border-box;border:1px solid var(--line);background:#fffdfa;
        color:var(--ink);border-radius:14px;padding:13px 14px;font:inherit;font-size:16px;outline:none
      }
      #customerMyBookingModal .authField input:focus{border-color:var(--accent)}
      #customerMyBookingModal .authButtons{
        display:grid;gap:9px;margin-top:14px
      }
      #customerMyBookingModal .authMessage{
        margin-top:12px;padding:11px 12px;border-radius:12px;background:#fbf5f2;
        color:var(--muted);font-size:12px;line-height:1.55
      }
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
            <small>이 기기 또는 휴대폰 인증으로 내 예약을 확인합니다.</small>
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
        <p id="customerMyBookingHint" class="hint">내 예약을 확인합니다.</p>
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
    currentReservation = null;
    pendingPhoneE164 = '';
    document.getElementById('customerMyBookingModal')?.classList.add('hidden');
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

  function cancelState(r, policy, token, verified=false){
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

    if(!token && !verified){
      return {
        showCancel:false,
        reason:'이 예약의 직접 취소 정보를 이 기기에서 찾을 수 없습니다. 휴대폰 인증 후 다시 확인하거나 매장으로 문의해주세요.'
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

  function renderActions(r, state, token, policy, mode='detail'){
    const a = document.getElementById('customerMyBookingActions');
    if(!a) return;

    if(mode === 'list' || mode === 'auth'){
      a.className = 'actions';
      a.innerHTML = `<button id="customerMyBookingClose" class="primary" type="button">닫기</button>`;
      bindClose();
      return;
    }

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
          return;
        }

        try{
          if(typeof openBooking === 'function'){
            openBooking(r.service_id ? {serviceId:r.service_id} : {});
          }
        }catch{}
      };

      return;
    }

    a.className = 'actions';
    a.innerHTML = `<button id="customerMyBookingClose" class="primary" type="button">닫기</button>`;
    bindClose();
  }

  function setHint(text){
    const hint = document.getElementById('customerMyBookingHint');
    if(hint) hint.textContent = text || '';
  }

  function sortReservations(rows){
    return [...rows].sort((a,b) => {
      const aActive =
        ['예약대기','예약확정'].includes(a?.status) &&
        bookingTimeMs(a) >= Date.now();

      const bActive =
        ['예약대기','예약확정'].includes(b?.status) &&
        bookingTimeMs(b) >= Date.now();

      if(aActive !== bActive) return aActive ? -1 : 1;

      const at = bookingTimeMs(a);
      const bt = bookingTimeMs(b);

      if(aActive && bActive) return at - bt;
      return bt - at;
    });
  }

  function renderAuthCard(phone){
    if(phone){
      return `
        <div class="verifiedBar">
          <span>✓ 휴대폰 인증 · ${esc(maskPhone(phone))}</span>
          <button id="customerAuthLogout" type="button">인증 해제</button>
        </div>
      `;
    }

    return `
      <div class="authCard">
        <b>다른 휴대폰에서 예약했나요?</b>
        <p>예약할 때 입력한 휴대폰 번호를 인증하면 다른 기기에서 만든 예약도 불러올 수 있습니다.</p>
        <button id="customerAuthStart" class="secondary" type="button">휴대폰 인증으로 불러오기</button>
      </div>
    `;
  }

  async function bindAuthControls(){
    const start = document.getElementById('customerAuthStart');
    if(start) start.onclick = renderAuthView;

    const logout = document.getElementById('customerAuthLogout');

    if(logout){
      logout.onclick = async () => {
        const client = getClient();

        try{
          logout.disabled = true;
          if(client) await client.auth.signOut();
        }catch(e){
          console.warn('customer auth signout failed', e);
        }finally{
          pendingPhoneE164 = '';
          await loadList(false);
        }
      };
    }
  }

  async function renderList(rows, phone=''){
    currentReservation = null;

    const body = document.getElementById('customerMyBookingBody');
    const info = document.getElementById('customerMyBookingCancelInfo');

    if(info) info.innerHTML = '';
    if(!body) return;

    const sorted = sortReservations(rows);

    if(!sorted.length){
      body.innerHTML = `
        ${renderAuthCard(phone)}
        <div class="empty">
          확인할 예약 정보가 없습니다.<br>
          이 기기에서 새 예약을 하거나 휴대폰 인증으로 기존 예약을 불러올 수 있습니다.
        </div>
      `;
    }else{
      body.innerHTML = `
        ${renderAuthCard(phone)}
        <div class="sectionLabel">예약 ${sorted.length}건</div>
        <div class="list">
          ${sorted.map(r => `
            <button class="bookingItem" type="button" data-booking-id="${esc(r.id)}">
              <span class="main">
                <span class="top">
                  <span class="badge">${esc(r.status || '예약')}</span>
                  ${r.__verified ? '<span class="badge">본인인증</span>' : ''}
                </span>
                <b>${esc(kdate(r.reservation_date))} · ${esc(String(r.reservation_time || '-').slice(0,5))}</b>
                <small>${esc(r.service_name || '-')} · ${esc(r.staff_name || '담당없음')}</small>
              </span>
              <span class="arr">›</span>
            </button>
          `).join('')}
        </div>
      `;

      body.querySelectorAll('[data-booking-id]').forEach(btn => {
        btn.onclick = () => {
          const r = sorted.find(x => String(x.id) === btn.dataset.bookingId);
          if(r) renderDetail(r);
        };
      });
    }

    await bindAuthControls();

    setHint(
      phone
        ? '휴대폰 인증으로 다른 기기에서 만든 예약도 함께 확인할 수 있습니다.'
        : '이 기기에 저장된 예약을 보여줍니다. 다른 기기 예약은 휴대폰 인증으로 불러올 수 있습니다.'
    );

    renderActions(null, {showCancel:false, reason:''}, '', {}, 'list');
  }

  async function renderDetail(r){
    currentReservation = r;

    const body = document.getElementById('customerMyBookingBody');
    if(!body) return;

    body.innerHTML = `
      <button id="customerMyBookingBack" class="backToList" type="button">‹ 예약 목록</button>
      <div>
        <span class="status">${esc(r.status || '예약')}</span>
        <div class="reviewList">
          <div><span>예약자</span><b>${esc(r.customer_name || '고객')}</b></div>
          <div><span>날짜</span><b>${esc(kdate(r.reservation_date))}</b></div>
          <div><span>시간</span><b>${esc(String(r.reservation_time || '-').slice(0,5))}</b></div>
          <div><span>서비스</span><b>${esc(r.service_name || '-')}</b></div>
          <div><span>담당자</span><b>${esc(r.staff_name || '담당없음')}</b></div>
          <div><span>예상금액</span><b>${won(r.price)}</b></div>
        </div>
      </div>
    `;

    document.getElementById('customerMyBookingBack').onclick = () => loadList(false);

    const token = getTokenFor(r.id);
    const policy = await getPolicy();
    const state = cancelState(r, policy, token, r.__verified === true);

    renderCancelInfo(state, policy);
    renderActions(r, state, token, policy, 'detail');

    setHint(
      r.__verified
        ? '휴대폰 본인인증으로 확인한 예약입니다.'
        : '이 기기에서 저장된 예약입니다.'
    );
  }

  function renderAuthView(){
    currentReservation = null;
    pendingPhoneE164 = '';

    const body = document.getElementById('customerMyBookingBody');
    const info = document.getElementById('customerMyBookingCancelInfo');

    if(info) info.innerHTML = '';
    if(!body) return;

    body.innerHTML = `
      <button id="customerAuthBack" class="backToList" type="button">‹ 예약 목록</button>
      <p class="authIntro">
        예약할 때 입력한 휴대폰 번호로 인증번호를 받아주세요.
        인증이 완료되면 같은 번호로 예약한 내역을 이 기기에서도 확인할 수 있습니다.
      </p>

      <label class="authField">
        <span>휴대폰 번호</span>
        <input
          id="customerAuthPhone"
          inputmode="tel"
          autocomplete="tel"
          placeholder="010-0000-0000"
        />
      </label>

      <div id="customerAuthOtpArea"></div>
      <div id="customerAuthMessage"></div>

      <div class="authButtons">
        <button id="customerAuthSend" class="primary" type="button">인증번호 받기</button>
      </div>
    `;

    document.getElementById('customerAuthBack').onclick = () => loadList(false);
    document.getElementById('customerAuthSend').onclick = sendOtp;

    setHint('SMS 인증번호를 이용한 본인확인입니다.');
    renderActions(null, {showCancel:false, reason:''}, '', {}, 'auth');
  }

  function setAuthMessage(message, error=false){
    const box = document.getElementById('customerAuthMessage');
    if(!box) return;

    if(!message){
      box.innerHTML = '';
      return;
    }

    box.innerHTML = `
      <div class="authMessage"${error ? ' style="color:#9b504b"' : ''}>
        ${esc(message)}
      </div>
    `;
  }

  async function sendOtp(){
    const input = document.getElementById('customerAuthPhone');
    const send = document.getElementById('customerAuthSend');
    const e164 = toE164Kr(input?.value || '');

    if(!e164){
      setAuthMessage('올바른 휴대폰 번호를 입력해주세요.', true);
      return;
    }

    const client = getClient();

    if(!client){
      setAuthMessage('휴대폰 인증 기능을 준비하지 못했습니다.', true);
      return;
    }

    if(send){
      send.disabled = true;
      send.textContent = '발송 중...';
    }

    setAuthMessage('');

    try{
      const {error} = await client.auth.signInWithOtp({
        phone:e164
      });

      if(error) throw error;

      pendingPhoneE164 = e164;

      const area = document.getElementById('customerAuthOtpArea');

      if(area){
        area.innerHTML = `
          <label class="authField">
            <span>인증번호 6자리</span>
            <input
              id="customerAuthOtp"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="123456"
            />
          </label>
        `;
      }

      if(send){
        send.textContent = '인증번호 다시 받기';
      }

      const actions = document.querySelector('#customerMyBookingBody .authButtons');

      if(actions && !document.getElementById('customerAuthVerify')){
        actions.insertAdjacentHTML(
          'beforeend',
          '<button id="customerAuthVerify" class="secondary" type="button">인증 확인</button>'
        );

        document.getElementById('customerAuthVerify').onclick = verifyOtp;
      }

      setAuthMessage('문자로 받은 6자리 인증번호를 입력해주세요.');

      setTimeout(() => {
        document.getElementById('customerAuthOtp')?.focus();
      }, 100);
    }catch(e){
      console.error('customer phone OTP send failed', e);
      setAuthMessage(friendlyAuthError(e), true);
    }finally{
      if(send){
        send.disabled = false;
        if(send.textContent === '발송 중...'){
          send.textContent = '인증번호 받기';
        }
      }
    }
  }

  async function verifyOtp(){
    const verify = document.getElementById('customerAuthVerify');
    const token = String(document.getElementById('customerAuthOtp')?.value || '')
      .replace(/\D/g, '');

    if(!pendingPhoneE164){
      setAuthMessage('먼저 인증번호를 받아주세요.', true);
      return;
    }

    if(token.length !== 6){
      setAuthMessage('인증번호 6자리를 입력해주세요.', true);
      return;
    }

    const client = getClient();

    if(!client){
      setAuthMessage('휴대폰 인증 기능을 준비하지 못했습니다.', true);
      return;
    }

    if(verify){
      verify.disabled = true;
      verify.textContent = '확인 중...';
    }

    try{
      const {data, error} = await client.auth.verifyOtp({
        phone:pendingPhoneE164,
        token,
        type:'sms'
      });

      if(error) throw error;

      if(!data?.session){
        throw new Error('휴대폰 인증 세션을 만들지 못했습니다.');
      }

      pendingPhoneE164 = '';
      setAuthMessage('휴대폰 인증이 완료되었습니다.');

      await loadList(true);
    }catch(e){
      console.error('customer phone OTP verify failed', e);
      setAuthMessage(friendlyAuthError(e), true);
    }finally{
      if(document.body.contains(verify)){
        verify.disabled = false;
        verify.textContent = '인증 확인';
      }
    }
  }

  async function fetchReservation(id){
    const client = getClient();

    if(!client){
      throw new Error('예약 조회 기능을 준비하지 못했습니다.');
    }

    const {data:r, error} = await client.rpc('public_reservation_detail', {
      p_reservation_id:id
    });

    if(error) throw error;
    return r || null;
  }

  async function fetchReservations(ids){
    const results = await Promise.all(
      ids.map(async id => {
        try{
          const r = await fetchReservation(id);
          return r ? {...r, __local:true} : null;
        }catch(e){
          console.warn('reservation detail load failed', id, e);
          return null;
        }
      })
    );

    return results.filter(Boolean);
  }

  async function fetchVerifiedReservations(){
    const client = getClient();
    const cfg = window.SMART_STORE_CONFIG;
    const phone = await authPhone();

    if(!client || !cfg?.storeSlug || !phone){
      return {phone:'', rows:[]};
    }

    try{
      const {data:rows, error} = await client.rpc('public_my_reservations', {
        p_slug:cfg.storeSlug
      });

      if(error) throw error;

      return {
        phone,
        rows:(Array.isArray(rows) ? rows : []).map(r => ({
          ...r,
          __verified:true
        }))
      };
    }catch(e){
      console.error('verified reservations load failed', e);

      return {
        phone,
        rows:[],
        error:e
      };
    }
  }

  function mergeReservations(localRows, verifiedRows){
    const map = new Map();

    for(const r of localRows || []){
      if(!r?.id) continue;
      map.set(String(r.id), {...r, __local:true});
    }

    for(const r of verifiedRows || []){
      if(!r?.id) continue;

      const id = String(r.id);
      const existing = map.get(id) || {};

      map.set(id, {
        ...existing,
        ...r,
        __local:existing.__local === true,
        __verified:true
      });
    }

    return [...map.values()];
  }

  async function cancelReservation(r, token, policy, button){
    if(!r?.id) return;

    if(!token && !r.__verified){
      window.alert('이 예약을 취소하려면 휴대폰 인증이 필요합니다.');
      return;
    }

    if(!window.confirm('이 예약을 취소하시겠습니까?')) return;

    const client = getClient();

    if(!client){
      window.alert('예약 취소 기능을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    button.disabled = true;
    button.textContent = '취소 중...';

    try{
      let result;
      let error;

      if(token){
        const response = await client.rpc('cancel_public_reservation', {
          p_reservation_id:r.id,
          p_cancel_token:token
        });

        result = response.data;
        error = response.error;
      }else{
        const response = await client.rpc('cancel_authenticated_reservation', {
          p_reservation_id:r.id
        });

        result = response.data;
        error = response.error;
      }

      if(error) throw error;

      if(!result?.ok){
        const message = result?.message || '예약을 취소할 수 없습니다.';
        const phone = String(result?.store_phone || policy.phone || '');

        window.alert(phone ? `${message}\n매장 문의 ${phone}` : message);

        policyCache = null;

        const fresh = await fetchReservation(r.id);

        if(fresh){
          await renderDetail({
            ...fresh,
            __verified:r.__verified === true,
            __local:r.__local === true
          });
        }

        return;
      }

      if(token){
        removeTokenFor(r.id);

        if(String(readLocal(RESERVATION_KEY)) === String(r.id)){
          removeLocal(CANCEL_TOKEN_KEY);
        }
      }

      window.alert('예약이 정상적으로 취소되었습니다.');

      const fresh = await fetchReservation(r.id);

      if(fresh){
        await renderDetail({
          ...fresh,
          __verified:r.__verified === true,
          __local:r.__local === true
        });
      }else{
        await loadList(false);
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

  async function loadList(showLoading=true){
    syncLegacyLatest();

    const body = document.getElementById('customerMyBookingBody');
    const info = document.getElementById('customerMyBookingCancelInfo');

    if(showLoading && body){
      body.innerHTML = '<div class="empty">예약 정보를 불러오는 중입니다.</div>';
    }

    if(info) info.innerHTML = '';

    const ids = getHistory();

    try{
      policyCache = null;

      const [localRows, verified] = await Promise.all([
        ids.length ? fetchReservations(ids) : Promise.resolve([]),
        fetchVerifiedReservations()
      ]);

      if(ids.length){
        const validLocalIds = localRows.map(r => String(r.id));
        setHistory(ids.filter(id => validLocalIds.includes(String(id))));
      }

      if(verified.error){
        console.warn('phone verified list unavailable', verified.error);
      }

      const rows = mergeReservations(localRows, verified.rows);

      await renderList(rows, verified.phone);
    }catch(e){
      console.error('my booking list load error', e);

      if(body){
        body.innerHTML = `
          <div class="empty">
            예약 정보를 불러오지 못했습니다.<br>
            잠시 후 다시 시도해주세요.
          </div>
        `;
      }

      renderActions(null, {showCancel:false, reason:''}, '', {}, 'list');
    }
  }

  async function open(){
    modal();

    const w = document.getElementById('customerMyBookingModal');
    w?.classList.remove('hidden');

    await loadList(true);
  }

  function init(){
    syncLegacyLatest();
    ensureButton();
    modal();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  }else{
    init();
  }

  window.addEventListener('pageshow', () => setTimeout(init, 100));
  window.addEventListener('focus', () => setTimeout(init, 100));

  // app.js가 새 예약을 저장하면 기존 단일 예약 키를 자동으로 다건 이력에 누적한다.
  setInterval(syncLegacyLatest, 1000);

  const retry = setInterval(() => {
    if(ensureButton()) clearInterval(retry);
  }, 500);

  setTimeout(() => clearInterval(retry), 10000);
})();