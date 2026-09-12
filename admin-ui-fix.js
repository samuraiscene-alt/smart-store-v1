/* Smart Store - admin UI fix: iPhone safe area + visible reservation reminder */
(() => {
  const STYLE_ID = 'adminUiFixStyle';
  const CARD_ID = 'adminReminderVisibleCard';
  const CONFIG = window.SMART_STORE_CONFIG || {};
  let client = null;
  let storeId = null;

  const q = s => document.querySelector(s);

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #adminApp .adminHeader{
        padding-top:calc(env(safe-area-inset-top, 0px) + 14px)!important;
        margin-top:0!important;
        position:relative;
        z-index:20;
      }
      #adminDrawerOpenV2{
        position:relative;
        z-index:21;
        touch-action:manipulation;
      }
      #${CARD_ID}{
        margin:0 0 18px;
        padding:18px;
        border:1px solid #eadfda;
        border-radius:20px;
        background:#fffdfa;
        box-shadow:0 8px 24px rgba(67,45,40,.04);
      }
      #${CARD_ID} .rHead{margin-bottom:14px}
      #${CARD_ID} .rHead h3{margin:0 0 5px;color:#302a28;font-size:18px}
      #${CARD_ID} .rHead p{margin:0;color:#94867f;font-size:12px;line-height:1.45}
      #${CARD_ID} .rToggle{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0;border-bottom:1px solid #efe4df}
      #${CARD_ID} .rToggle span{display:grid;gap:3px}
      #${CARD_ID} .rToggle small{color:#94867f;font-size:11px}
      #${CARD_ID} .rToggle input{width:22px;height:22px;accent-color:#76524d}
      #${CARD_ID} .rField{display:grid;gap:7px;margin-top:14px}
      #${CARD_ID} .rField>span{font-size:12px;font-weight:700;color:#4b3c37}
      #${CARD_ID} select{width:100%;min-height:44px;padding:0 12px;border:1px solid #e6d9d4;border-radius:13px;background:#fff;color:#302a28;font-size:14px}
      #${CARD_ID} .rActions{display:flex;justify-content:flex-end;margin-top:14px}
      #${CARD_ID} .rSave{min-width:82px;height:42px;border:0;border-radius:13px;background:#76524d;color:#fff;font-weight:800}
      #${CARD_ID} .rStatus{display:block;margin-top:10px;color:#94867f;font-size:11px;line-height:1.45}
      #${CARD_ID}.disabled .rField{opacity:.45}
    `;
    document.head.appendChild(style);
  }

  function ensureClient(){
    if(client) return client;
    if(!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    return client;
  }

  async function resolveStoreId(){
    if(storeId) return storeId;
    const sb = ensureClient();
    if(!sb) return null;
    const {data,error} = await sb.rpc('public_store_payload',{p_slug:CONFIG.storeSlug});
    if(error){ console.error('[admin ui fix] store load',error); return null; }
    storeId = data?.store?.id || null;
    return storeId;
  }

  function mountCard(){
    const list = q('#reservationList');
    if(!list || !list.parentNode) return false;

    const old = q('#adminReservationReminderCard');
    if(old) old.remove();

    let card = q(`#${CARD_ID}`);
    if(!card){
      card = document.createElement('section');
      card.id = CARD_ID;
      card.innerHTML = `
        <div class="rHead"><h3>예약 리마인드</h3><p>예약 전에 손님에게 자동 푸시 알림을 보냅니다.</p></div>
        <label class="rToggle">
          <span><b>리마인드 사용</b><small>끄면 자동 리마인드가 발송되지 않습니다.</small></span>
          <input id="adminReminderEnabledFix" type="checkbox">
        </label>
        <label class="rField">
          <span>발송 시점</span>
          <select id="adminReminderHoursFix">
            <option value="1">1시간 전</option>
            <option value="2">2시간 전</option>
            <option value="24">24시간 전</option>
            <option value="48">48시간 전</option>
          </select>
        </label>
        <small class="rStatus" id="adminReminderStatusFix">설정을 불러오는 중...</small>
        <div class="rActions"><button class="rSave" id="adminReminderSaveFix" type="button">저장</button></div>
      `;
      card.querySelector('#adminReminderEnabledFix').addEventListener('change',syncEnabled);
      card.querySelector('#adminReminderSaveFix').addEventListener('click',saveSettings);
    }

    list.parentNode.insertBefore(card,list);
    return true;
  }

  function syncEnabled(){
    const card = q(`#${CARD_ID}`);
    const enabled = !!q('#adminReminderEnabledFix')?.checked;
    const select = q('#adminReminderHoursFix');
    if(card) card.classList.toggle('disabled',!enabled);
    if(select) select.disabled = !enabled;
  }

  async function loadSettings(){
    if(!mountCard()) return;
    const sb = ensureClient();
    const id = await resolveStoreId();
    if(!sb || !id) return;

    const {data,error} = await sb.from('stores')
      .select('reservation_reminder_enabled,reservation_reminder_hours')
      .eq('id',id).single();

    const status = q('#adminReminderStatusFix');
    if(error){
      if(status) status.textContent='리마인드 설정을 불러오지 못했습니다.';
      return;
    }

    const enabled = data?.reservation_reminder_enabled !== false;
    const hours = [1,2,24,48].includes(Number(data?.reservation_reminder_hours))
      ? Number(data.reservation_reminder_hours) : 24;

    const enabledEl = q('#adminReminderEnabledFix');
    const hoursEl = q('#adminReminderHoursFix');
    if(enabledEl) enabledEl.checked = enabled;
    if(hoursEl) hoursEl.value = String(hours);
    syncEnabled();

    if(status) status.textContent = enabled
      ? `현재 설정 · 예약 ${hours}시간 전 자동 알림`
      : '현재 설정 · 리마인드 사용 안 함';
  }

  async function saveSettings(){
    const sb = ensureClient();
    const id = await resolveStoreId();
    if(!sb || !id) return;

    const enabled = !!q('#adminReminderEnabledFix')?.checked;
    const hours = Number(q('#adminReminderHoursFix')?.value || 24);
    const btn = q('#adminReminderSaveFix');
    const status = q('#adminReminderStatusFix');

    if(btn){ btn.disabled=true; btn.textContent='저장 중...'; }

    const {error} = await sb.from('stores')
      .update({
        reservation_reminder_enabled:enabled,
        reservation_reminder_hours:hours
      })
      .eq('id',id);

    if(btn){ btn.disabled=false; btn.textContent='저장'; }

    if(error){
      if(status) status.textContent='저장 실패';
      alert(error.message);
      return;
    }

    if(status) status.textContent = enabled
      ? `저장 완료 ✓ · 예약 ${hours}시간 전 자동 알림`
      : '저장 완료 ✓ · 리마인드 사용 안 함';
  }

  function init(){
    addStyles();

    let tries = 0;
    const timer = setInterval(()=>{
      tries++;
      if(mountCard()){
        clearInterval(timer);
        loadSettings();
      }else if(tries > 120){
        clearInterval(timer);
      }
    },250);

    const observer = new MutationObserver(()=>{
      if(q('#reservationList')) mountCard();
    });
    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('pageshow',()=>setTimeout(()=>{
      mountCard();
      loadSettings();
    },150));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
