/* Smart Store - admin dashboard live refresh v1 */
(() => {
  if (window.__smartStoreAdminDashboardLiveV1) return;
  window.__smartStoreAdminDashboardLiveV1 = true;

  const DASH_ID = 'adminDrawerDashboardV2';
  const REFRESH_MS = 60000;
  let busy = false;
  let lastRefreshAt = 0;

  const q = s => document.querySelector(s);

  function dashboardVisible(){
    const app = q('#adminApp');
    const dash = q('#' + DASH_ID);
    return Boolean(
      app &&
      !app.classList.contains('hidden') &&
      dash &&
      dash.classList.contains('active') &&
      document.visibilityState === 'visible'
    );
  }

  function kstToday(){
    const parts = new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).formatToParts(new Date());

    const get = type => parts.find(x => x.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  function esc(v=''){
    return String(v).replace(/[&<>"']/g, ch => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[ch]));
  }

  function updateDashboardFromData(){
    if (typeof data === 'undefined') return;

    const reservations = Array.isArray(data.reservations) ? data.reservations : [];
    const today = kstToday();

    const todayRows = reservations
      .filter(r =>
        r.date === today &&
        !['취소','노쇼','예약거절'].includes(r.status)
      )
      .sort((a,b) =>
        String(a.time || '').localeCompare(String(b.time || ''))
      );

    const pending = reservations.filter(r => r.status === '예약대기').length;

    const dateEl = q('#admDate');
    const todayCount = q('#admTodayCount');
    const pendingCount = q('#admPendingCount');
    const customerCount = q('#admCustomerCount');
    const serviceCount = q('#admServiceCount');
    const todayList = q('#admTodayList');
    const badge = q('#admPendingBadge');

    if(dateEl){
      dateEl.textContent = new Intl.DateTimeFormat('ko-KR',{
        timeZone:'Asia/Seoul',
        month:'long',
        day:'numeric',
        weekday:'short'
      }).format(new Date());
    }

    if(todayCount) todayCount.textContent = todayRows.length;

    if(pendingCount){
      pendingCount.textContent = pending;
      pendingCount.style.color = pending ? 'var(--adm-wait)' : '';
    }

    if(customerCount){
      customerCount.textContent =
        (data.customers || []).filter(c => !c.archivedAt).length;
    }

    if(serviceCount){
      serviceCount.textContent =
        (data.services || []).filter(s => s.active !== false).length;
    }

    if(todayList){
      todayList.innerHTML = todayRows.length
        ? todayRows.map(r => `
            <article class="booking">
              <time>${esc(r.time || '')}</time>
              <div>
                <b>${esc(r.customerName || '고객')}</b>
                <small>${esc(r.serviceName || '')} · ${esc(r.staffName || '담당없음')}</small>
              </div>
              <span class="status${r.status === '예약대기' ? ' wait' : ''}">
                ${esc(r.status || '')}
              </span>
            </article>
          `).join('')
        : '<div class="empty">오늘 등록된 예약이 없습니다.</div>';
    }

    if(badge){
      badge.textContent = pending;
      badge.classList.toggle('show', pending > 0);
    }
  }

  async function refresh({force=false}={}){
    if (busy || !dashboardVisible()) return;

    const now = Date.now();

    if(!force && now - lastRefreshAt < 15000){
      updateDashboardFromData();
      return;
    }

    if(typeof loadAdminData !== 'function'){
      updateDashboardFromData();
      return;
    }

    busy = true;

    try{
      await loadAdminData();
      lastRefreshAt = Date.now();
      updateDashboardFromData();
    }catch(err){
      console.warn('admin dashboard live refresh failed', err);
    }finally{
      busy = false;
    }
  }

  const timer = setInterval(() => {
    refresh();
  }, REFRESH_MS);

  window.addEventListener('pageshow', () => {
    setTimeout(() => refresh({force:true}), 250);
  });

  window.addEventListener('focus', () => {
    setTimeout(() => refresh(), 250);
  });

  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      setTimeout(() => refresh(), 250);
    }
  });

  document.addEventListener('click', e => {
    if(
      e.target.closest('#adminFloatingHomeV2') ||
      e.target.closest('[data-action="dashboard"]')
    ){
      setTimeout(() => refresh({force:true}), 180);
    }
  });
function startInitialSync(){
  let tries = 0;

  const initTimer = setInterval(() => {
    tries++;

    if(
      dashboardVisible() &&
      typeof data !== 'undefined' &&
      data?.store?.id
    ){
      clearInterval(initTimer);
      updateDashboardFromData();
      setTimeout(() => refresh({force:true}), 120);
      return;
    }

    if(tries >= 80){
      clearInterval(initTimer);
    }
  },250);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded',startInitialSync,{once:true});
}else{
  startInitialSync();
}
  window.addEventListener('beforeunload', () => {
    clearInterval(timer);
  });
})();
