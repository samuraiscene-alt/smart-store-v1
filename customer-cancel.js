/* Smart Store - persistent customer cancellation alert */
(() => {
  const cfg = window.SMART_STORE_CONFIG;
  if (!cfg || !window.supabase) return;

  const STORE_KEY_SUFFIX = encodeURIComponent(cfg.storeSlug||'default');
  const sbCancel = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const DB_NAME = 'smart-store-push-open-v1';
  const STORE_NAME = 'kv';
  const PENDING_KEY = `customerReservation:${STORE_KEY_SUFFIX}`;
  const ACK_PREFIX = `smartStoreReservationAck:${STORE_KEY_SUFFIX}:`;
  const DAYS = ['일','월','화','수','목','금','토'];

  let showing = false;
  const checking = new Set();

  const esc = (value='') => String(value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const won = value => `${Number(value || 0).toLocaleString('ko-KR')}원`;

  function koreanDate(iso){
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso || '');
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
  }

  function ackKey(reservationId, eventKey=''){
    return `${ACK_PREFIX}${eventKey || `${reservationId}:cancelled`}`;
  }

  function isAcked(reservationId, eventKey=''){
    try {
      return localStorage.getItem(ackKey(reservationId, eventKey)) === '1';
    } catch {
      return false;
    }
  }

  function acknowledge(reservationId, eventKey=''){
    try {
      localStorage.setItem(ackKey(reservationId, eventKey), '1');
    } catch {}
  }

  function openDb(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function consumePendingCancellation(){
    try {
      const db = await openDb();

      const row = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const get = store.get(PENDING_KEY);

        get.onsuccess = () => {
          const value = get.result || null;

          if (value?.event_type === 'cancelled') {
            store.delete(PENDING_KEY);
          }

          resolve(value);
        };

        get.onerror = () => reject(get.error);
      });

      db.close();

      if (!row || row.event_type !== 'cancelled' || !row.reservation_id) return null;
      if (row.saved_at && Date.now() - Number(row.saved_at) > 48 * 60 * 60 * 1000) return null;

      return row;
    } catch (error) {
      console.warn('cancellation pending read failed', error);
      return null;
    }
  }

  function ensureModal(){
    if (document.getElementById('customerCancellationAlert')) return;

    const style = document.createElement('style');
    style.textContent = `
      #customerCancellationAlert{z-index:100001}
      #customerCancellationAlert .cancelReservationBox{width:min(92vw,460px)}
      #customerCancellationAlert .cancelReservationLead{margin:14px 0 0;color:#7b6660;line-height:1.6}
      #customerCancellationAlert .cancelReservationNote{margin:12px 0 0;color:#8e817b;font-size:13px;line-height:1.5}
      #customerCancellationAlert .cancelReservationActions{display:grid;grid-template-columns:1fr 1.15fr;gap:9px;margin-top:18px}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'customerCancellationAlert';
    wrap.className = 'modalBackdrop hidden';
    wrap.setAttribute('role','dialog');
    wrap.setAttribute('aria-modal','true');

    wrap.innerHTML = `
      <section class="confirmBox cancelReservationBox">
        <div class="confirmIcon">!</div>
        <h3>예약이 취소되었습니다</h3>
        <div id="customerCancellationBody"></div>
        <p class="cancelReservationLead">매장에서 예약을 취소했습니다. 필요하시면 다시 예약해주세요.</p>
        <p class="cancelReservationNote">이 알림은 확인할 때까지 앱 안에 남아 있습니다.</p>
        <div class="cancelReservationActions">
          <button id="customerCancellationClose" class="secondary" type="button">닫기</button>
          <button id="customerCancellationRebook" class="primary" type="button">다시 예약하기</button>
        </div>
      </section>
    `;

    document.body.appendChild(wrap);

    wrap.addEventListener('click', event => {
      if (event.target === wrap) event.stopPropagation();
    });
  }

  function cleanUrl(){
    try {
      const url = new URL(location.href);
      url.searchParams.delete('reservation_id');
      url.searchParams.delete('push_open');
      url.searchParams.delete('reservation_event');
      url.searchParams.delete('reservation_event_key');
      history.replaceState({}, '', url.pathname + url.search + url.hash);
    } catch {}
  }

  function hide(){
    document.getElementById('customerCancellationAlert')?.classList.add('hidden');
    showing = false;
  }

  function showCancellation(r, eventKey=''){
    if (!r || r.status !== '취소' || isAcked(r.id, eventKey)) return;

    ensureModal();

    const body = document.getElementById('customerCancellationBody');
    const close = document.getElementById('customerCancellationClose');
    const rebook = document.getElementById('customerCancellationRebook');
    const wrap = document.getElementById('customerCancellationAlert');

    body.innerHTML = `
      <div class="reviewList">
        <div><span>예약자</span><b>${esc(r.customer_name || '고객')}</b></div>
        <div><span>날짜</span><b>${esc(koreanDate(r.reservation_date))}</b></div>
        <div><span>시간</span><b>${esc(String(r.reservation_time || '-').slice(0,5))}</b></div>
        <div><span>서비스</span><b>${esc(r.service_name || '-')}</b></div>
        <div><span>담당자</span><b>${esc(r.staff_name || '담당없음')}</b></div>
        <div><span>예상금액</span><b>${won(r.price)}</b></div>
      </div>
    `;

    close.onclick = () => {
      acknowledge(r.id, eventKey);
      hide();
    };

    rebook.onclick = () => {
      acknowledge(r.id, eventKey);
      hide();

      if (typeof window.openBooking === 'function') {
        window.openBooking(r.service_id ? { serviceId: r.service_id } : {});
      }
    };

    showing = true;
    wrap.classList.remove('hidden');
  }

  async function openCancelledReservation(reservationId, eventKey=''){
    if (!reservationId || isAcked(reservationId, eventKey)) return;

    const key = `${reservationId}:${eventKey}`;
    if (checking.has(key)) return;
    checking.add(key);

    try {
      const { data:r, error } = await sbCancel.rpc('public_reservation_detail', {
        p_reservation_id: reservationId
      });

      if (error) throw error;
      if (r?.status === '취소') {
        showCancellation(r, eventKey);
      }

      cleanUrl();
    } catch (error) {
      console.error('cancellation detail check error', error);
    } finally {
      checking.delete(key);
    }
  }

  async function checkCancellation(){
    if (showing) return;

    const params = new URLSearchParams(location.search);
    let reservationId = '';
    let eventKey = '';

    if (params.get('reservation_event') === 'cancelled') {
      reservationId = params.get('reservation_id') || '';
      eventKey = params.get('reservation_event_key') || '';
    }

    if (!reservationId) {
      const pending = await consumePendingCancellation();
      if (pending) {
        reservationId = pending.reservation_id || '';
        eventKey = pending.event_key || '';
      }
    }

    if (reservationId) {
      openCancelledReservation(reservationId, eventKey);
    }
  }

  const scheduleCheck = (delay=30) => setTimeout(checkCancellation, delay);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleCheck(20));
  } else {
    scheduleCheck(20);
  }

  window.addEventListener('pageshow', () => scheduleCheck(20));
  window.addEventListener('focus', () => scheduleCheck(20));

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleCheck(20);
  });

  navigator.serviceWorker?.addEventListener('message', event => {
    if (
      event.data?.type === 'smart-store-open-reservation' &&
      event.data?.event_type === 'cancelled' &&
event.data?.store_slug === cfg.storeSlug
    ) {
      openCancelledReservation(
        event.data.reservation_id || '',
        event.data.event_key || ''
      );
    }
  });

  setInterval(() => {
    if (document.visibilityState === 'visible' && !showing) {
      checkCancellation();
    }
  }, 5000);
})();
