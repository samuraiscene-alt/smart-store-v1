/* Smart Store - admin customer cancellation alert */
(() => {
  const cfg = window.SMART_STORE_CONFIG;
  if (!cfg || !window.supabase) return;

  const alertSb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const ACK_KEY = 'smartStoreAdminCustomerCancelAckV1';
  const STYLE_ID = 'adminCustomerCancelAlertStyle';
  const MODAL_ID = 'adminCustomerCancelAlertModal';

  let storeId = '';
  let customerCancelledIds = new Set();
  let refreshBusy = false;
  let currentPopupId = '';

  const esc = (v='') => String(v).replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));

  const won = v => `${Number(v || 0).toLocaleString('ko-KR')}원`;
  const hhmm = v => String(v || '').slice(0,5);

  function readAck(){
    try{
      const value = JSON.parse(localStorage.getItem(ACK_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    }catch{
      return [];
    }
  }

  function markAck(id){
    if(!id) return;
    const next = [id, ...readAck().filter(x => x !== id)].slice(0,200);
    try{
      localStorage.setItem(ACK_KEY, JSON.stringify(next));
    }catch{}
  }

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;

    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #${MODAL_ID}{z-index:100010}
      #${MODAL_ID} .customerCancelBox{
        width:min(92vw,460px);
        padding:26px 22px 22px
      }
      #${MODAL_ID} .customerCancelIcon{
        width:58px;
        height:58px;
        border-radius:50%;
        display:grid;
        place-items:center;
        margin:0 auto 15px;
        background:#f5e3df;
        color:#a34f4a;
        font-size:28px;
        font-weight:900
      }
      #${MODAL_ID} h3{
        margin:0;
        text-align:center;
        font-size:22px;
        line-height:1.35
      }
      #${MODAL_ID} .customerCancelSub{
        margin:9px 0 18px;
        text-align:center;
        color:#8d7d77;
        font-size:13px;
        line-height:1.5
      }
      #${MODAL_ID} .customerCancelDetail{
        display:grid;
        gap:11px;
        padding:17px 16px;
        border-radius:17px;
        background:#faf5f2
      }
      #${MODAL_ID} .customerCancelDetail div{
        display:flex;
        justify-content:space-between;
        gap:18px;
        align-items:flex-start
      }
      #${MODAL_ID} .customerCancelDetail span{
        color:#998983;
        font-size:13px;
        flex:0 0 auto
      }
      #${MODAL_ID} .customerCancelDetail b{
        color:#332a27;
        font-size:14px;
        text-align:right;
        line-height:1.35
      }
      #${MODAL_ID} .customerCancelConfirm{
        width:100%;
        margin-top:18px;
        border:0;
        border-radius:16px;
        padding:15px;
        background:#7e5651;
        color:#fff;
        font-weight:900;
        font-size:16px
      }
      .customerCancelledSelect{
        color:#a04d48!important;
        font-weight:900!important;
        background:#fff3f0!important
      }
      .customerCancelledItem{
        box-shadow:inset 4px 0 0 #c9756d
      }
    `;
    document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID)) return;

    addStyles();

    const w = document.createElement('div');
    w.id = MODAL_ID;
    w.className = 'modalBackdrop hidden';
    w.innerHTML = `
      <section class="confirmBox customerCancelBox">
        <div class="customerCancelIcon">!</div>
        <h3>고객이 예약을 취소했습니다</h3>
        <p class="customerCancelSub">예약 내용을 확인해주세요.</p>

        <div id="adminCustomerCancelDetail" class="customerCancelDetail"></div>

        <button
          id="adminCustomerCancelConfirm"
          class="customerCancelConfirm"
          type="button">
          확인
        </button>
      </section>
    `;

    document.body.appendChild(w);

    document.getElementById('adminCustomerCancelConfirm').onclick = () => {
      if(currentPopupId) markAck(currentPopupId);
      currentPopupId = '';
      w.classList.add('hidden');

      setTimeout(refresh,120);
    };
  }

  async function resolveStoreId(){
    if(storeId) return storeId;

    const {data:payload, error} = await alertSb.rpc('public_store_payload', {
      p_slug:cfg.storeSlug
    });

    if(error) throw error;

    storeId = payload?.store?.id || '';
    return storeId;
  }

  function decorateStatus(forceCurrentState=false){
    if(!customerCancelledIds.size) return;

    customerCancelledIds.forEach(id => {
      const sel = document.querySelector(
        `[data-res-status="${CSS.escape(id)}"]`
      );

      if(!sel) return;

      if(forceCurrentState && sel.value !== '취소'){
        sel.value = '취소';
      }

      if(sel.value !== '취소') return;

      const opt = [...sel.options].find(o =>
        o.value === '취소' ||
        o.textContent.trim() === '취소' ||
        o.textContent.trim() === '고객취소'
      );

      if(opt){
        opt.value = '취소';
        opt.textContent = '고객취소';
      }

      sel.classList.add('customerCancelledSelect');

      const item = sel.closest('.reservationItem');
      if(item){
        item.classList.remove('pendingApproval');
        item.classList.add('customerCancelledItem');
      }
    });
  }

  function showPopup(r){
    ensureModal();

    currentPopupId = r.id;

    document.getElementById('adminCustomerCancelDetail').innerHTML = `
      <div><span>예약자</span><b>${esc(r.customers?.name || '고객')}</b></div>
      <div><span>날짜</span><b>${esc(r.reservation_date || '-')}</b></div>
      <div><span>시간</span><b>${esc(hhmm(r.reservation_time) || '-')}</b></div>
      <div><span>서비스</span><b>${esc(r.service_name || '-')}</b></div>
      <div><span>담당자</span><b>${esc(r.staff_name || '담당없음')}</b></div>
      <div><span>금액</span><b>${won(r.price)}</b></div>
    `;

    document.getElementById(MODAL_ID).classList.remove('hidden');
  }

  async function refresh(){
    if(refreshBusy) return;
    refreshBusy = true;

    try{
      const {data:{session}} = await alertSb.auth.getSession();
      if(!session) return;

      const id = await resolveStoreId();
      if(!id) return;

      const {data:rows, error} = await alertSb
        .from('reservations')
        .select(
          'id,reservation_date,reservation_time,service_name,staff_name,price,status,cancelled_by,updated_at,customers(name,phone)'
        )
        .eq('store_id', id)
        .eq('status', '취소')
        .eq('cancelled_by', 'customer')
        .order('updated_at', {ascending:false});

      if(error) throw error;

      customerCancelledIds = new Set((rows || []).map(r => r.id));

      // DB에서 고객취소가 확인되면 현재 화면도 즉시 고객취소 상태로 맞춘다.
      decorateStatus(true);

      if(currentPopupId) return;

      const ack = new Set(readAck());
      const pending = (rows || []).find(r => !ack.has(r.id));

      if(pending){
        showPopup(pending);
      }
    }catch(e){
      console.warn('customer cancellation admin alert failed', e);
    }finally{
      refreshBusy = false;
    }
  }

  addStyles();
  ensureModal();

  // 예약 화면이 다시 그려져도 "고객취소" 표시를 유지한다.
  const observer = new MutationObserver(() => decorateStatus(false));
  observer.observe(document.documentElement, {
    childList:true,
    subtree:true
  });

  const start = () => {
    refresh();

    let tries = 0;
    const timer = setInterval(() => {
      refresh();
      tries += 1;
      if(tries >= 15) clearInterval(timer);
    },1000);
  };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start);
  }else{
    start();
  }

  // 푸시를 눌러 관리자 앱으로 돌아온 경우에도 즉시 확인한다.
  window.addEventListener('pageshow', () => setTimeout(refresh,150));
  window.addEventListener('focus', () => setTimeout(refresh,150));

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      setTimeout(refresh,150);
    }
  });
})();
