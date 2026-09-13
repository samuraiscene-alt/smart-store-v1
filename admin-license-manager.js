/* Smart Store - platform license manager */
(() => {
  if (window.__smartStoreLicenseManager) return;
  window.__smartStoreLicenseManager = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};

  const STYLE_ID = 'smartStoreLicenseManagerStyle';
  const BUTTON_ID = 'smartStoreLicenseManagerButton';
  const MODAL_ID = 'smartStoreLicenseManagerModal';

  let sb = null;
  let licenses = [];
let buttonMounting = false;
  const q = s => document.querySelector(s);

  const esc = (v = '') =>
    String(v).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

  function ensureClient() {
    if (sb) return sb;

    if (
      !window.supabase?.createClient ||
      !CONFIG.supabaseUrl ||
      !CONFIG.supabaseKey
    ) {
      return null;
    }

    sb = window.supabase.createClient(
      CONFIG.supabaseUrl,
      CONFIG.supabaseKey
    );

    return sb;
  }

  function statusLabel(status) {
    return ({
      trial: '체험',
      active: '활성',
      overdue: '미납 유예',
      suspended: '정지',
      cancelled: '해지'
    })[status] || status || '-';
  }

  function toLocalInput(value) {
    if (!value) return '';

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const pad = n => String(n).padStart(2, '0');

    return [
      d.getFullYear(),
      '-',
      pad(d.getMonth() + 1),
      '-',
      pad(d.getDate()),
      'T',
      pad(d.getHours()),
      ':',
      pad(d.getMinutes())
    ].join('');
  }

  function toIso(value) {
    if (!value) return null;

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return null;
    }

    return d.toISOString();
  }

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #${BUTTON_ID}{
        width:100%;
        margin-top:8px;
        padding:13px 14px;
        border:1px solid #eadfda;
        border-radius:16px;
        background:#fffdfa;
        color:#76524d;
        font-size:14px;
        font-weight:800;
        text-align:left;
      }

      #${MODAL_ID}{
        position:fixed;
        inset:0;
        z-index:100800;
        display:none;
        padding:
          max(18px,env(safe-area-inset-top))
          16px
          max(18px,env(safe-area-inset-bottom));
        background:rgba(35,28,26,.42);
        backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);
        overflow:auto;
      }

      #${MODAL_ID}.open{
        display:block;
      }

      #${MODAL_ID} .panel{
        width:min(100%,520px);
        margin:0 auto;
        padding:18px;
        box-sizing:border-box;
        border:1px solid #eadfda;
        border-radius:24px;
        background:#fffdfa;
        box-shadow:0 20px 60px rgba(60,39,35,.22);
      }

      #${MODAL_ID} .top{
        position:sticky;
        top:0;
        z-index:3;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin:-4px -4px 14px;
        padding:4px;
        background:#fffdfa;
      }

      #${MODAL_ID} h2{
        margin:0;
        color:#302a28;
        font-size:21px;
        letter-spacing:-.04em;
      }

      #${MODAL_ID} .close{
        flex:0 0 auto;
        width:40px;
        height:40px;
        border:0;
        border-radius:13px;
        background:#f5e9e5;
        color:#76524d;
        font-size:21px;
      }

      #${MODAL_ID} .loading,
      #${MODAL_ID} .empty{
        padding:28px 8px;
        color:#94867f;
        font-size:13px;
        text-align:center;
      }

      #${MODAL_ID} .licenseList{
        display:grid;
        gap:12px;
      }

      #${MODAL_ID} .licenseCard{
        padding:15px;
        border:1px solid #eadfda;
        border-radius:18px;
        background:#fff;
      }

      #${MODAL_ID} .storeHead{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:12px;
      }

      #${MODAL_ID} .storeName{
        min-width:0;
      }

      #${MODAL_ID} .storeName b{
        display:block;
        color:#302a28;
        font-size:15px;
      }

      #${MODAL_ID} .storeName small{
        display:block;
        margin-top:4px;
        color:#9a8b84;
        font-size:10px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      #${MODAL_ID} .badge{
        flex:0 0 auto;
        padding:6px 9px;
        border-radius:999px;
        background:#f5e9e5;
        color:#76524d;
        font-size:11px;
        font-weight:900;
      }

      #${MODAL_ID} .badge.off{
        background:#eee;
        color:#777;
      }

      #${MODAL_ID} .form{
        display:grid;
        gap:10px;
        margin-top:14px;
      }

      #${MODAL_ID} label{
        display:block;
      }

      #${MODAL_ID} label > span{
        display:block;
        margin-bottom:5px;
        color:#76524d;
        font-size:11px;
        font-weight:800;
      }

      #${MODAL_ID} select,
      #${MODAL_ID} input,
      #${MODAL_ID} textarea{
        width:100%;
        box-sizing:border-box;
        padding:12px;
        border:1px solid #eadfda;
        border-radius:13px;
        background:#fffdfa;
        color:#302a28;
        font-size:14px;
        outline:none;
      }

      #${MODAL_ID} textarea{
        min-height:68px;
        resize:vertical;
      }

      #${MODAL_ID} .dateRow[hidden]{
        display:none;
      }

      #${MODAL_ID} .save{
        width:100%;
        margin-top:2px;
        padding:13px;
        border:0;
        border-radius:14px;
        background:#76524d;
        color:#fff;
        font-size:14px;
        font-weight:900;
      }

      #${MODAL_ID} .save:disabled{
        opacity:.5;
      }

      #${MODAL_ID} .message{
        min-height:17px;
        color:#94867f;
        font-size:11px;
        text-align:center;
      }
    `;

    document.head.appendChild(style);
  }

  function mountModal() {
    if (document.getElementById(MODAL_ID)) return;

    const modal = document.createElement('div');
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <div class="panel">
        <div class="top">
          <h2>매장 라이선스 관리</h2>
          <button
            class="close"
            type="button"
            aria-label="닫기"
          >×</button>
        </div>

        <div class="content">
          <div class="loading">
            라이선스를 불러오는 중...
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close').onclick =
      closeModal;

    modal.addEventListener('click', e => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  async function checkPlatformAdmin() {
    const client = ensureClient();
    if (!client) return false;

    const { data, error } =
      await client.rpc(
        'current_platform_capabilities'
      );

    return (
      !error &&
      data?.is_platform_admin === true
    );
  }

  async function mountButton() {
  if (document.getElementById(BUTTON_ID)) {
    return true;
  }

  if (buttonMounting) {
    return false;
  }

  buttonMounting = true;

  const allowed = await checkPlatformAdmin();

    if (!allowed) {
  buttonMounting = false;
  return false;
}

    const drawer =
      document.querySelector(
        '#adminDrawerMenuV2 .panel'
      );

    if (!drawer) {
  buttonMounting = false;
  return false;
}

    const button =
      document.createElement('button');

    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent =
      '매장 라이선스 관리';

    button.onclick = openModal;

    const foot =
      drawer.querySelector('.foot');

    if (foot) {
      foot.parentNode.insertBefore(
        button,
        foot
      );
    } else {
      drawer.appendChild(button);
    }
buttonMounting = false;
    return true;
  }

  async function openModal() {
    mountModal();

    q(`#${MODAL_ID}`)
      ?.classList.add('open');

    await loadLicenses();
  }

  function closeModal() {
    q(`#${MODAL_ID}`)
      ?.classList.remove('open');
  }

  async function loadLicenses() {
    const client = ensureClient();
    if (!client) return;

    const content =
      q(`#${MODAL_ID} .content`);

    content.innerHTML = `
      <div class="loading">
        라이선스를 불러오는 중...
      </div>
    `;

    const { data, error } =
      await client.rpc(
        'platform_list_store_licenses'
      );

    if (error) {
      content.innerHTML = `
        <div class="empty">
          ${esc(
            error.message ||
            '라이선스를 불러오지 못했습니다.'
          )}
        </div>
      `;
      return;
    }

    licenses =
      Array.isArray(data)
        ? data
        : [];

    renderLicenses();
  }

  function renderLicenses() {
    const content =
      q(`#${MODAL_ID} .content`);

    if (!licenses.length) {
      content.innerHTML = `
        <div class="empty">
          등록된 매장이 없습니다.
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="licenseList">
        ${licenses.map(renderCard).join('')}
      </div>
    `;

    content
      .querySelectorAll('.licenseCard')
      .forEach(card => {
        bindCard(card);
      });
  }

  function renderCard(item) {
    const usable =
      item.usable === true;

    return `
      <div
        class="licenseCard"
        data-store-id="${esc(item.store_id)}"
      >
        <div class="storeHead">
          <div class="storeName">
            <b>${esc(item.store_name)}</b>
            <small>${esc(item.slug)}</small>
          </div>

          <span
            class="badge ${usable ? '' : 'off'}"
          >
            ${usable ? '사용 가능' : '사용 중지'}
          </span>
        </div>

        <div class="form">
          <label>
            <span>라이선스 상태</span>

            <select class="statusSelect">
              <option
                value="trial"
                ${item.status === 'trial' ? 'selected' : ''}
              >체험</option>

              <option
                value="active"
                ${item.status === 'active' ? 'selected' : ''}
              >활성</option>

              <option
                value="overdue"
                ${item.status === 'overdue' ? 'selected' : ''}
              >미납 유예</option>

              <option
                value="suspended"
                ${item.status === 'suspended' ? 'selected' : ''}
              >정지</option>

              <option
                value="cancelled"
                ${item.status === 'cancelled' ? 'selected' : ''}
              >해지</option>
            </select>
          </label>

          <label>
            <span>요금제 코드</span>

            <input
              class="planCode"
              type="text"
              maxlength="40"
              value="${esc(item.plan_code || '')}"
              placeholder="예: standard"
            >
          </label>

          <label
            class="dateRow trialDateRow"
            hidden
          >
            <span>체험 종료일</span>

            <input
              class="trialEnds"
              type="datetime-local"
              value="${esc(
                toLocalInput(item.trial_ends_at)
              )}"
            >
          </label>

          <label
            class="dateRow activeDateRow"
            hidden
          >
            <span>이용기간 종료일</span>

            <input
              class="periodEnds"
              type="datetime-local"
              value="${esc(
                toLocalInput(
                  item.current_period_ends_at
                )
              )}"
            >
          </label>

          <label
            class="dateRow overdueDateRow"
            hidden
          >
            <span>미납 유예 종료일</span>

            <input
              class="graceEnds"
              type="datetime-local"
              value="${esc(
                toLocalInput(item.grace_ends_at)
              )}"
            >
          </label>

          <label>
            <span>변경 사유</span>

            <textarea
              class="reason"
              placeholder="예: 9월 이용료 결제 완료"
            ></textarea>
          </label>

          <button
            class="save"
            type="button"
          >
            라이선스 저장
          </button>

          <div class="message">
            현재 상태:
            ${esc(statusLabel(item.status))}
          </div>
        </div>
      </div>
    `;
  }

  function updateDateRows(card) {
    const status =
      card.querySelector(
        '.statusSelect'
      )?.value;

    card.querySelector('.trialDateRow')
      .hidden = status !== 'trial';

    card.querySelector('.activeDateRow')
      .hidden = status !== 'active';

    card.querySelector('.overdueDateRow')
      .hidden = status !== 'overdue';
  }

  function setDefaultDateIfNeeded(card) {
    const status =
      card.querySelector(
        '.statusSelect'
      )?.value;

    const now = new Date();

    if (status === 'trial') {
      const input =
        card.querySelector('.trialEnds');

      if (!input.value) {
        const d =
          new Date(
            now.getTime() +
            14 * 24 * 60 * 60 * 1000
          );

        input.value =
          toLocalInput(d);
      }
    }

    if (status === 'overdue') {
      const input =
        card.querySelector('.graceEnds');

      if (!input.value) {
        const d =
          new Date(
            now.getTime() +
            7 * 24 * 60 * 60 * 1000
          );

        input.value =
          toLocalInput(d);
      }
    }
  }

  function bindCard(card) {
    const select =
      card.querySelector(
        '.statusSelect'
      );

    updateDateRows(card);

    select.onchange = () => {
      updateDateRows(card);
      setDefaultDateIfNeeded(card);
    };

    card.querySelector('.save').onclick =
      () => saveLicense(card);
  }

  async function saveLicense(card) {
    const client = ensureClient();
    if (!client) return;

    const storeId =
      card.dataset.storeId;

    const status =
      card.querySelector(
        '.statusSelect'
      ).value;

    const planCode =
      card.querySelector(
        '.planCode'
      ).value.trim();

    const reason =
      card.querySelector(
        '.reason'
      ).value.trim();

    const trialValue =
      card.querySelector(
        '.trialEnds'
      ).value;

    const periodValue =
      card.querySelector(
        '.periodEnds'
      ).value;

    const graceValue =
      card.querySelector(
        '.graceEnds'
      ).value;

    const message =
      card.querySelector('.message');

    const button =
      card.querySelector('.save');

    if (
      status === 'trial' &&
      !trialValue
    ) {
      message.textContent =
        '체험 종료일을 입력해주세요.';
      return;
    }

    if (
      status === 'overdue' &&
      !graceValue
    ) {
      message.textContent =
        '미납 유예 종료일을 입력해주세요.';
      return;
    }

    button.disabled = true;
    message.textContent =
      '저장하는 중...';

    const { data, error } =
      await client.rpc(
        'platform_update_store_license',
        {
          p_store_id: storeId,
          p_status: status,
          p_plan_code:
            planCode || null,
          p_trial_ends_at:
            status === 'trial'
              ? toIso(trialValue)
              : null,
          p_current_period_ends_at:
            status === 'active'
              ? toIso(periodValue)
              : null,
          p_grace_ends_at:
            status === 'overdue'
              ? toIso(graceValue)
              : null,
          p_reason:
            reason || null
        }
      );

    if (error) {
      message.textContent =
        error.message ||
        '저장에 실패했습니다.';

      button.disabled = false;
      return;
    }

    message.textContent =
      `저장 완료 ✓ ${statusLabel(
        data?.status || status
      )}`;

    button.disabled = false;

    setTimeout(() => {
      loadLicenses();
    }, 500);
  }

  function init() {
    addStyles();
    mountModal();

    let tries = 0;

    const timer =
      setInterval(async () => {
        tries++;

        const mounted =
          await mountButton();

        if (
          mounted ||
          tries >= 40
        ) {
          clearInterval(timer);
        }
      }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
