/* Smart Store - admin customer cancellation policy + optional customer notices */
(() => {
  const CARD_ID = 'adminCustomerCancelPolicyCard';
  const STYLE_ID = 'adminCustomerCancelPolicyStyle';
  let initialized = false;
  let loading = false;

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{margin-bottom:18px}
      #${CARD_ID} .policyHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:15px}
      #${CARD_ID} .policyHead h3{margin:0 0 4px}
      #${CARD_ID} .policyHead p{margin:0;color:#8e817b;font-size:13px;line-height:1.5}

      #${CARD_ID} .policyToggle{
        display:flex;align-items:center;justify-content:space-between;gap:16px;
        padding:14px 0;border-bottom:1px solid #efe4df;
      }
      #${CARD_ID} .policyToggle span{display:flex;flex-direction:column;gap:3px}
      #${CARD_ID} .policyToggle small{color:#978983}
      #${CARD_ID} .policySwitch{width:22px;height:22px;accent-color:#7b5550}

      #${CARD_ID} .policyDisabled{opacity:.48}
      #${CARD_ID} .policySection{
        margin-top:16px;padding-top:15px;border-top:1px solid #efe4df;
      }
      #${CARD_ID} .policySection:first-of-type{margin-top:10px}
      #${CARD_ID} .policySectionTitle{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        margin-bottom:10px;
      }
      #${CARD_ID} .policySectionTitle b{font-size:14px}
      #${CARD_ID} .policySectionTitle input{width:21px;height:21px;accent-color:#7b5550}

      #${CARD_ID} textarea{
        width:100%;min-height:78px;resize:vertical;
      }
      #${CARD_ID} textarea::placeholder{
        color:#b8aaa4;
        opacity:1;
      }

      #${CARD_ID} .policyPreview{
        margin-top:12px;padding:12px 13px;border-radius:14px;
        background:#f9f3f0;color:#7b6660;font-size:12px;line-height:1.55
      }
      #${CARD_ID} .policyStatus{
        display:block;margin-top:10px;color:#8e817b;font-size:12px;line-height:1.55
      }
      #${CARD_ID} .policyActions{
        display:flex;justify-content:flex-end;margin-top:14px
      }
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
      <div class="policyHead">
        <div>
          <h3>고객 예약 취소 정책</h3>
          <p>손님 직접 취소 기준과 고객에게 보여줄 안내 문구를 매장별로 설정합니다.</p>
        </div>
      </div>

      <label class="policyToggle">
        <span>
          <b>고객 직접 취소 허용</b>
          <small>끄면 손님이 직접 취소할 수 없고 매장 문의 안내만 표시됩니다.</small>
        </span>
        <input id="customerCancelEnabled" class="policySwitch" type="checkbox">
      </label>

      <label id="customerCancelDeadlineField" class="field">
        <span>직접 취소 가능 시간</span>
        <select id="customerCancelDeadlineHours">
          <option value="1">예약 1시간 전까지</option>
          <option value="3">예약 3시간 전까지</option>
          <option value="6">예약 6시간 전까지</option>
          <option value="12">예약 12시간 전까지</option>
          <option value="24">예약 24시간 전까지</option>
          <option value="48">예약 48시간 전까지</option>
          <option value="72">예약 72시간 전까지</option>
        </select>
      </label>

      <div class="policySection">
        <label class="policySectionTitle" for="depositNoticeEnabled">
          <b>예약금 안내 사용</b>
          <input id="depositNoticeEnabled" type="checkbox">
        </label>

        <label id="depositNoticeField" class="field">
          <span>고객에게 보여줄 예약금 안내 문구</span>
          <textarea
            id="depositNoticeText"
            rows="3"
            placeholder="예: 예약확정을 받으시려면 예약금 입금 부탁드립니다."
          ></textarea>
        </label>
        <small class="formNote">체크하면 예약 최종 확인/완료 화면에 업주가 입력한 문구를 표시합니다.</small>
      </div>

      <div class="policySection">
        <label class="policySectionTitle" for="lateCancelNoticeEnabled">
          <b>취소 제한 이후 안내 사용</b>
          <input id="lateCancelNoticeEnabled" type="checkbox">
        </label>

        <label id="lateCancelNoticeField" class="field">
          <span>취소 가능 시간이 지난 뒤 보여줄 안내 문구</span>
          <textarea
            id="lateCancelNoticeText"
            rows="3"
            placeholder="예: 취소 가능 시간이 지난 뒤에는 예약금 환불이 어렵습니다."
          ></textarea>
        </label>
        <small class="formNote">체크하면 직접 취소가 제한된 예약에서 업주가 입력한 문구를 표시합니다.</small>
      </div>

      <div id="customerCancelPolicyPreview" class="policyPreview"></div>
      <small id="customerCancelPolicyStatus" class="policyStatus">
        서버 설정을 확인하고 있습니다.
      </small>

      <div class="policyActions">
        <button id="customerCancelPolicySave" class="primary mini" type="button">저장</button>
      </div>
    `;

    const reminder = document.getElementById('adminReservationReminderCard');
    if(reminder) panel.insertBefore(card, reminder.nextSibling);
    else panel.insertBefore(card, list);

    document.getElementById('customerCancelEnabled')?.addEventListener('change', refreshUi);
    document.getElementById('customerCancelDeadlineHours')?.addEventListener('change', refreshUi);
    document.getElementById('depositNoticeEnabled')?.addEventListener('change', refreshUi);
    document.getElementById('lateCancelNoticeEnabled')?.addEventListener('change', refreshUi);
    document.getElementById('depositNoticeText')?.addEventListener('input', refreshUi);
    document.getElementById('lateCancelNoticeText')?.addEventListener('input', refreshUi);
    document.getElementById('customerCancelPolicySave')?.addEventListener('click', saveSettings);
  }

  function refreshUi(){
    const cancelEnabled = !!document.getElementById('customerCancelEnabled')?.checked;
    const hours = Number(document.getElementById('customerCancelDeadlineHours')?.value || 24);

    const depositEnabled = !!document.getElementById('depositNoticeEnabled')?.checked;
    const depositText = (document.getElementById('depositNoticeText')?.value || '').trim();

    const lateEnabled = !!document.getElementById('lateCancelNoticeEnabled')?.checked;
    const lateText = (document.getElementById('lateCancelNoticeText')?.value || '').trim();

    const deadlineField = document.getElementById('customerCancelDeadlineField');
    const deadlineSelect = document.getElementById('customerCancelDeadlineHours');
    deadlineField?.classList.toggle('policyDisabled', !cancelEnabled);
    if(deadlineSelect) deadlineSelect.disabled = !cancelEnabled;

    const depositField = document.getElementById('depositNoticeField');
    const depositInput = document.getElementById('depositNoticeText');
    depositField?.classList.toggle('policyDisabled', !depositEnabled);
    if(depositInput) depositInput.disabled = !depositEnabled;

    const lateField = document.getElementById('lateCancelNoticeField');
    const lateInput = document.getElementById('lateCancelNoticeText');
    lateField?.classList.toggle('policyDisabled', !lateEnabled);
    if(lateInput) lateInput.disabled = !lateEnabled;

    const preview = document.getElementById('customerCancelPolicyPreview');
    if(!preview) return;

    const lines = [];

    lines.push(
      cancelEnabled
        ? `손님 직접 취소 · 예약 ${hours}시간 전까지 가능`
        : '손님 직접 취소 · 사용 안 함'
    );

    if(depositEnabled){
      lines.push(
        depositText
          ? `예약금 안내 · "${depositText}"`
          : '예약금 안내 · 사용 중(문구 미입력 시 고객에게 표시하지 않음)'
      );
    }else{
      lines.push('예약금 안내 · 사용 안 함');
    }

    if(lateEnabled){
      lines.push(
        lateText
          ? `제한 이후 안내 · "${lateText}"`
          : '제한 이후 안내 · 사용 중(문구 미입력 시 기본 매장 문의 안내만 표시)'
      );
    }else{
      lines.push('제한 이후 안내 · 사용 안 함');
    }

    preview.innerHTML = lines.map(v => `<div>${escapeHtml(v)}</div>`).join('');
  }

  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function setUnavailable(message){
    const save = document.getElementById('customerCancelPolicySave');
    if(save) save.disabled = true;

    const status = document.getElementById('customerCancelPolicyStatus');
    if(status) status.textContent = message || '서버 취소정책 기능 준비 중입니다.';
  }

  async function loadSettings(){
    if(loading || typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;
    loading = true;

    try{
      const {data:row, error} = await sb
        .from('stores')
        .select(`
          customer_cancel_enabled,
          customer_cancel_deadline_hours,
          deposit_notice_enabled,
          deposit_notice_text,
          late_cancel_notice_enabled,
          late_cancel_notice_text
        `)
        .eq('id', storeId)
        .single();

      if(error) throw error;

      const allowed = [1,3,6,12,24,48,72];
      const hours = allowed.includes(Number(row?.customer_cancel_deadline_hours))
        ? Number(row.customer_cancel_deadline_hours)
        : 24;

      const cancelEnabled = row?.customer_cancel_enabled === true;
      const depositEnabled = row?.deposit_notice_enabled === true;
      const lateEnabled = row?.late_cancel_notice_enabled === true;

      const cancelInput = document.getElementById('customerCancelEnabled');
      const hoursSelect = document.getElementById('customerCancelDeadlineHours');
      const depositToggle = document.getElementById('depositNoticeEnabled');
      const depositText = document.getElementById('depositNoticeText');
      const lateToggle = document.getElementById('lateCancelNoticeEnabled');
      const lateText = document.getElementById('lateCancelNoticeText');
      const save = document.getElementById('customerCancelPolicySave');

      if(cancelInput) cancelInput.checked = cancelEnabled;
      if(hoursSelect) hoursSelect.value = String(hours);
      if(depositToggle) depositToggle.checked = depositEnabled;
      if(depositText) depositText.value = row?.deposit_notice_text || '';
      if(lateToggle) lateToggle.checked = lateEnabled;
      if(lateText) lateText.value = row?.late_cancel_notice_text || '';
      if(save) save.disabled = false;

      refreshUi();

      const status = document.getElementById('customerCancelPolicyStatus');
      if(status){
        status.textContent = cancelEnabled
          ? `현재 설정 · 예약 ${hours}시간 전까지 고객 직접 취소 가능`
          : '현재 설정 · 고객 직접 취소 사용 안 함';
      }

    }catch(error){
      console.error('customer cancel policy load error', error);
      setUnavailable('서버 취소정책 설정이 아직 준비되지 않았습니다.');
      refreshUi();
    }finally{
      loading = false;
    }
  }

  async function saveSettings(){
    if(typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;

    const cancelEnabled = !!document.getElementById('customerCancelEnabled')?.checked;
    const hours = Number(document.getElementById('customerCancelDeadlineHours')?.value || 24);

    const depositEnabled = !!document.getElementById('depositNoticeEnabled')?.checked;
    const depositText = (document.getElementById('depositNoticeText')?.value || '').trim();

    const lateEnabled = !!document.getElementById('lateCancelNoticeEnabled')?.checked;
    const lateText = (document.getElementById('lateCancelNoticeText')?.value || '').trim();

    const allowed = [1,3,6,12,24,48,72];
    if(!allowed.includes(hours)){
      alert('취소 가능 시간을 다시 선택해주세요.');
      return;
    }

    const button = document.getElementById('customerCancelPolicySave');
    if(button){
      button.disabled = true;
      button.textContent = '저장 중...';
    }

    const {error} = await sb
      .from('stores')
      .update({
        customer_cancel_enabled: cancelEnabled,
        customer_cancel_deadline_hours: hours,
        deposit_notice_enabled: depositEnabled,
        deposit_notice_text: depositText || null,
        late_cancel_notice_enabled: lateEnabled,
        late_cancel_notice_text: lateText || null
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

    const status = document.getElementById('customerCancelPolicyStatus');
    if(status){
      status.textContent = cancelEnabled
        ? `저장 완료 ✓ · 예약 ${hours}시간 전까지 고객 직접 취소 가능`
        : '저장 완료 ✓ · 고객 직접 취소 사용 안 함';
    }

    if(typeof showAdminMessage === 'function'){
      showAdminMessage('고객 예약 취소 정책 저장 완료');
    }

    refreshUi();
  }

  function init(){
    if(initialized) return;
    if(typeof sb === 'undefined' || typeof storeId === 'undefined' || !storeId) return;
    if(!document.querySelector('.adminPanel[data-panel="reservations"]')) return;

    ensureCard();
    initialized = true;
    loadSettings();
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    init();
    if(initialized || tries > 80) clearInterval(timer);
  }, 250);

  window.addEventListener('pageshow', () => setTimeout(() => {
    init();
    if(initialized) loadSettings();
  }, 100));
})();
