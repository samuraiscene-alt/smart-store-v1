/* Smart Store - Google Calendar 연결 */
(() => {
  const STYLE = `
    .googleCalendarCard{margin-top:14px}
    .googleCalendarHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .googleCalendarHead h3{margin:0}
    .googleCalendarStatus{display:flex;align-items:center;gap:8px;margin-top:8px;color:#8e817b;font-size:13px}
    .googleCalendarDot{width:9px;height:9px;border-radius:50%;background:#b8aaa4;flex:none}
    .googleCalendarDot.connected{background:#4d9b6a}
    .googleCalendarActions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
    .googleCalendarMessage{margin-top:9px;font-size:12px;color:#8e817b}
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  function injectCard(){
    if(document.getElementById('googleCalendarCard')) return;
    const storePanel = document.querySelector('[data-panel="store"]');
    if(!storePanel) return;

    const card = document.createElement('div');
    card.id = 'googleCalendarCard';
    card.className = 'formCard card googleCalendarCard';
    card.innerHTML = `
      <div class="googleCalendarHead">
        <div>
          <h3>Google Calendar</h3>
          <div class="googleCalendarStatus">
            <span id="googleCalendarDot" class="googleCalendarDot"></span>
            <span id="googleCalendarStatusText">연결 상태 확인 중...</span>
          </div>
        </div>
      </div>
      <div class="googleCalendarActions">
        <button id="googleCalendarConnect" class="primary">Google Calendar 연결</button>
        <button id="googleCalendarDisconnect" class="secondary hidden">연결 해제</button>
      </div>
      <p id="googleCalendarAccount" class="googleCalendarMessage"></p>
      <small class="formNote">연결하면 예약 확정 내용을 Google Calendar와 동기화할 수 있습니다.</small>
    `;

    const approvalCard = storePanel.querySelector('#reservationApprovalMode')?.closest('.formCard');
    if(approvalCard) approvalCard.insertAdjacentElement('afterend', card);
    else storePanel.appendChild(card);

    document.getElementById('googleCalendarConnect').onclick = startConnect;
    document.getElementById('googleCalendarDisconnect').onclick = disconnect;
  }

  async function invoke(action){
    if(typeof sb === 'undefined' || !storeId) throw new Error('관리자 로그인이 필요합니다.');
    const { data: sessionData } = await sb.auth.getSession();
    if(!sessionData?.session) throw new Error('로그인 세션이 없습니다.');

    const { data, error } = await sb.functions.invoke('google-calendar-connect', {
      body: { action, store_id: storeId }
    });
    if(error) throw error;
    if(data?.error) throw new Error(data.error);
    return data;
  }

  function renderStatus(result){
    injectCard();
    const connected = !!result?.connected;
    const dot = document.getElementById('googleCalendarDot');
    const text = document.getElementById('googleCalendarStatusText');
    const account = document.getElementById('googleCalendarAccount');
    const connect = document.getElementById('googleCalendarConnect');
    const disconnect = document.getElementById('googleCalendarDisconnect');

    dot?.classList.toggle('connected', connected);
    if(text) text.textContent = connected ? '연결됨' : '연결되지 않음';
    if(account) {
      account.textContent = connected && result?.connection?.google_account_email
        ? `연결 계정: ${result.connection.google_account_email}`
        : '';
    }
    connect?.classList.toggle('hidden', connected);
    disconnect?.classList.toggle('hidden', !connected);
  }

  async function refreshStatus(){
    injectCard();
    if(!storeId || !currentUser) return;
    try {
      renderStatus(await invoke('status'));
    } catch(e) {
      const t = document.getElementById('googleCalendarStatusText');
      if(t) t.textContent = '연결 상태 확인 실패';
      console.error('[Google Calendar]', e);
    }
  }

  async function startConnect(){
    const btn = document.getElementById('googleCalendarConnect');
    if(btn) btn.disabled = true;
    try {
      const result = await invoke('start');
      if(!result?.auth_url) throw new Error('Google 인증 주소를 받지 못했습니다.');
      window.location.href = result.auth_url;
    } catch(e) {
      if(btn) btn.disabled = false;
      alert(`Google Calendar 연결 오류\n${e?.message || e}`);
    }
  }

  async function disconnect(){
    if(!confirm('Google Calendar 연결을 해제할까요?')) return;
    try {
      const result = await invoke('disconnect');
      renderStatus(result);
      if(typeof showAdminMessage === 'function') showAdminMessage('Google Calendar 연결 해제 완료');
    } catch(e) {
      alert(`연결 해제 오류\n${e?.message || e}`);
    }
  }

  function handleReturn(){
    const url = new URL(location.href);
    const state = url.searchParams.get('google_calendar');
    if(!state) return;
    const reason = url.searchParams.get('reason');

    url.searchParams.delete('google_calendar');
    url.searchParams.delete('reason');
    history.replaceState({}, '', url.pathname + url.search + url.hash);

    setTimeout(async() => {
      await refreshStatus();
      if(state === 'connected') {
        if(typeof showAdminMessage === 'function') showAdminMessage('Google Calendar 연결 완료 ✓');
        else alert('Google Calendar 연결이 완료되었습니다.');
      } else {
        alert(`Google Calendar 연결 실패${reason ? `\n${reason}` : ''}`);
      }
    }, 500);
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if(typeof storeId !== 'undefined' && storeId && typeof currentUser !== 'undefined' && currentUser) {
      clearInterval(timer);
      injectCard();
      refreshStatus();
      handleReturn();
    } else if(tries > 80) {
      clearInterval(timer);
    }
  }, 250);

  window.addEventListener('pageshow', () => setTimeout(refreshStatus, 300));
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') setTimeout(refreshStatus, 300);
  });
})();
