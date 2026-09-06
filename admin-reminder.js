/* Smart Store - admin reservation reminder settings */
(() => {
  const CARD_ID = 'adminReservationReminderCard';
  const STYLE_ID = 'adminReservationReminderStyle';
  let initialized = false;
  let loading = false;

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{margin-bottom:18px}
      #${CARD_ID} .reminderHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
      #${CARD_ID} .reminderHead h3{margin:0 0 4px}
      #${CARD_ID} .reminderHead p{margin:0;color:#8e817b;font-size:13px;line-height:1.5}
      #${CARD_ID} .reminderToggle{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #efe4df}
      #${CARD_ID} .reminderToggle span{display:flex;flex-direction:column;gap:3px}
      #${CARD_ID} .reminderToggle small{color:#978983}
      #${CARD_ID} .reminderSwitch{width:22px;height:22px;accent-color:#7b5550}
      #${CARD_ID} .reminderDisabled{opacity:.48}
      #${CARD_ID} .reminderActions{display:flex;justify-content:flex-end;margin-top:14px}
      #${CARD_ID} .reminderStatus{display:block;margin-top:10px;color:#8e817b;font-size:12px;line-height:1.5}
    `;
    document.head.appendChild(style);
  }

  function ensureCard(){
    if(document.getElementById(CARD_ID)) return;

    const panel = document.querySelector('.adminPanel[data-panel="reservations"]');
    const list = document.getElementById('reservationList');
    if(!panel || !list) return;

    addStyles();

    const card = document.createElement('div');
    card.id = CARD_ID;
    card.className = 'formCard card';
    card.innerHTML = `
      <div class="reminderHead">
        <div>
          <h3>예약 리마인드</h3>
          <p>예약 전에 손님에게 자동 푸시 알림을 보냅니다.</p>
        </div>
      </div>

      <label class="reminderToggle">
        <span>
          <b>리마인드 사용</b>
          <small>끄면 자동 리마인드가 발송되지 않습니다.</small>
        </span>
        <input id="reservationReminderEnabled" class="reminderSwitch" type="checkbox">
      </label>

      <label id="reservationReminderHoursField" class="field">
        <span>발송 시점</span>
        <select id="reservationReminderHours">
          <option value="1">1시간 전</option>
          <option value="2">2시간 전</option>
          <option value="24">24시간 전</option>
          <option value="48">48시간 전</option>
        </select>
      </label>

      <small class="reminderStatus" id="reservationReminderStatus">
        서버가 15분마다 예약을 확인하며, 같은 예약에는 한 번만 발송합니다.
      </small>

      <div class="reminderActions">
        <button id="reservationReminderSave" class="primary mini" type="button">저장</button>
      </div>
    `;

    panel.insertBefore(card, list);

    document.getElementById('reservationReminderEnabled').addEventListener('change', refreshEnabledUi);
    document.getElementById('reservationReminderSave').addEventListener('click', saveReminderSettings);
  }

  function refreshEnabledUi(){
    const enabled = !!document.getElementById('reservationReminderEnabled')?.checked;
    const field = document.getElementById('reservationReminderHoursField');
    const select = document.getElementById('reservationReminderHours');
    if(field) field.classList.toggle('reminderDisabled', !enabled);
    if(select) select.disabled = !enabled;
  }

  async function loadReminderSettings(){
    if(loading || typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;
    loading = true;

    try{
      const {data:row, error} = await sb
        .from('stores')
        .select('reservation_reminder_enabled,reservation_reminder_hours')
        .eq('id', storeId)
        .single();

      if(error) throw error;

      const enabled = row?.reservation_reminder_enabled !== false;
      const hours = [1,2,24,48].includes(Number(row?.reservation_reminder_hours))
        ? Number(row.reservation_reminder_hours)
        : 24;

      const enabledInput = document.getElementById('reservationReminderEnabled');
      const hoursSelect = document.getElementById('reservationReminderHours');

      if(enabledInput) enabledInput.checked = enabled;
      if(hoursSelect) hoursSelect.value = String(hours);

      refreshEnabledUi();

      const status = document.getElementById('reservationReminderStatus');
      if(status){
        status.textContent = enabled
          ? `현재 설정 · 예약 ${hours}시간 전 자동 알림`
          : '현재 설정 · 리마인드 사용 안 함';
      }
    }catch(error){
      console.error('reminder settings load error', error);
      const status = document.getElementById('reservationReminderStatus');
      if(status) status.textContent = '리마인드 설정을 불러오지 못했습니다.';
    }finally{
      loading = false;
    }
  }

  async function saveReminderSettings(){
    if(typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;

    const enabled = !!document.getElementById('reservationReminderEnabled')?.checked;
    const hours = Number(document.getElementById('reservationReminderHours')?.value || 24);
    const allowed = [1,2,24,48];

    if(!allowed.includes(hours)){
      alert('리마인드 시간을 다시 선택해주세요.');
      return;
    }

    const button = document.getElementById('reservationReminderSave');
    if(button){
      button.disabled = true;
      button.textContent = '저장 중...';
    }

    const {error} = await sb
      .from('stores')
      .update({
        reservation_reminder_enabled: enabled,
        reservation_reminder_hours: hours
      })
      .eq('id', storeId);

    if(button){
      button.disabled = false;
      button.textContent = '저장';
    }

    if(error){
      alert(error.message);
      return;
    }

    const status = document.getElementById('reservationReminderStatus');
    if(status){
      status.textContent = enabled
        ? `저장 완료 ✓ · 예약 ${hours}시간 전 자동 알림`
        : '저장 완료 ✓ · 리마인드 사용 안 함';
    }

    if(typeof showAdminMessage === 'function'){
      showAdminMessage(
        enabled
          ? `예약 리마인드 · ${hours}시간 전`
          : '예약 리마인드 · 사용 안 함'
      );
    }

    setTimeout(loadReminderSettings, 150);
  }

  function init(){
    if(initialized) return;
    if(typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;
    if(!document.querySelector('.adminPanel[data-panel="reservations"]')) return;

    ensureCard();
    initialized = true;
    loadReminderSettings();
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    if(initialized || tries > 80) clearInterval(timer);
  }, 250);

  window.addEventListener('pageshow', () => setTimeout(() => {
    init();
    if(initialized) loadReminderSettings();
  }, 100));
})();
