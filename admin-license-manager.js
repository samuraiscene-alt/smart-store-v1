/* Smart Store - organization license overview */
(() => {
  if (window.__smartStoreLicenseManagerV2) return;
  window.__smartStoreLicenseManagerV2 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const STYLE_ID = 'smartStoreLicenseManagerStyleV2';
  const BUTTON_ID = 'smartStoreLicenseManagerButton';
  const MODAL_ID = 'smartStoreLicenseManagerModalV2';

  let sb = null;
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
      trial: '무료 체험',
      active: '이용 중',
      overdue: '미납 유예',
      suspended: '이용 정지',
      cancelled: '해지',
      missing: '라이선스 없음'
    })[status] || status || '-';
  }

  function kindLabel(kind) {
    return kind === 'additional'
      ? '추가 매장'
      : '첫 매장';
  }

  function formatDate(value) {
    if (!value) return '';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat(
      'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }
    ).format(d);
  }

  function licenseDetail(item) {
    if (item.status === 'trial') {
      const end = formatDate(item.trial_ends_at);
      return end
        ? `무료 체험 종료 · ${end}`
        : '무료 체험 중';
    }

    if (item.status === 'active') {
      const end = formatDate(
        item.current_period_ends_at
      );

      return end
        ? `이용기간 · ${end}까지`
        : '현재 정상 이용 중';
    }

    if (item.status === 'overdue') {
      const end = formatDate(item.grace_ends_at);
      return end
        ? `미납 유예 · ${end}까지`
        : '미납 유예 상태';
    }

    return statusLabel(item.status);
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

      #${MODAL_ID} .orgName{
        margin-bottom:12px;
        color:#302a28;
        font-size:17px;
        font-weight:900;
      }

      #${MODAL_ID} .summaryGrid{
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:8px;
        margin-bottom:14px;
      }

      #${MODAL_ID} .summaryItem{
        padding:12px 8px;
        border:1px solid #eadfda;
        border-radius:16px;
        background:#fff;
        text-align:center;
      }

      #${MODAL_ID} .summaryItem b{
        display:block;
        color:#76524d;
        font-size:20px;
      }

      #${MODAL_ID} .summaryItem span{
        display:block;
        margin-top:4px;
        color:#9a8b84;
        font-size:10px;
        line-height:1.35;
      }

      #${MODAL_ID} .entitlement{
        margin-bottom:14px;
        padding:12px 13px;
        border-radius:15px;
        background:#f8eeeb;
        color:#76524d;
        font-size:11px;
        line-height:1.6;
      }

      #${MODAL_ID} .licenseList{
        display:grid;
        gap:10px;
      }

      #${MODAL_ID} .licenseCard{
        padding:14px;
        border:1px solid #eadfda;
        border-radius:18px;
        background:#fff;
      }

      #${MODAL_ID} .storeHead{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:10px;
      }

      #${MODAL_ID} .storeName{
        min-width:0;
      }

      #${MODAL_ID} .storeName b{
        display:block;
        color:#302a28;
        font-size:14px;
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
        font-size:10px;
        font-weight:900;
      }

      #${MODAL_ID} .badge.off{
        background:#eee;
        color:#777;
      }

      #${MODAL_ID} .meta{
        display:flex;
        align-items:center;
        flex-wrap:wrap;
        gap:6px;
        margin-top:11px;
      }

      #${MODAL_ID} .kind{
        padding:5px 8px;
        border-radius:999px;
        background:#f7f2ef;
        color:#76524d;
        font-size:10px;
        font-weight:800;
      }

      #${MODAL_ID} .detail{
        color:#8d7f78;
        font-size:10px;
      }

      #${MODAL_ID} .footNote{
        margin-top:14px;
        padding:12px 13px;
        border:1px solid #eadfda;
        border-radius:15px;
        background:#fffdfa;
        color:#8d7f78;
        font-size:11px;
        line-height:1.6;
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
          <h2>라이선스 · 추가 매장</h2>
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

  async function checkOrganizationOwner() {
    const client = ensureClient();
    if (!client) return false;

    const { data, error } =
      await client.rpc(
        'current_organization_capabilities',
        { p_slug: CONFIG.storeSlug }
      );

    return (
      !error &&
      data?.can_manage_licenses === true
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

    const allowed =
      await checkOrganizationOwner();

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
      '라이선스 · 추가 매장';

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

    await loadOverview();
  }

  function closeModal() {
    q(`#${MODAL_ID}`)
      ?.classList.remove('open');
  }

  async function loadOverview() {
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
        'current_organization_license_overview',
        { p_slug: CONFIG.storeSlug }
      );

    if (error || !data) {
      content.innerHTML = `
        <div class="empty">
          ${esc(
            error?.message ||
            '라이선스를 불러오지 못했습니다.'
          )}
        </div>
      `;
      return;
    }

    renderOverview(data);
  }

  function renderOverview(data) {
    const content =
      q(`#${MODAL_ID} .content`);

    const stores =
      Array.isArray(data.stores)
        ? data.stores
        : [];

    const available =
      Number(data.available_store_slots || 0);

    const footMessage =
      available > 0
        ? `추가 매장 ${available}개를 더 만들 수 있습니다. 매장 전환 메뉴의 ‘+ 새 매장 만들기’에서 생성하세요.`
        : '추가 매장을 만들려면 추가 매장 이용권이 필요합니다. 결제 연동 후 구매가 완료되면 추가 가능 수량이 자동으로 늘어나는 구조입니다.';

    content.innerHTML = `
      <div class="orgName">
        ${esc(data.organization_name || 'Smart Store')}
      </div>

      <div class="summaryGrid">
        <div class="summaryItem">
          <b>${esc(data.used_store_count)}</b>
          <span>현재 매장</span>
        </div>

        <div class="summaryItem">
          <b>${esc(data.allowed_store_count)}</b>
          <span>이용 가능 매장</span>
        </div>

        <div class="summaryItem">
          <b>${esc(available)}</b>
          <span>추가 가능</span>
        </div>
      </div>

      <div class="entitlement">
        첫 매장 이용권
        <b>${esc(data.base_store_slots)}</b>개 ·
        추가 매장 이용권
        <b>${esc(data.additional_store_slots)}</b>개
      </div>

      <div class="licenseList">
        ${stores.length
          ? stores.map(renderStore).join('')
          : '<div class="empty">등록된 매장이 없습니다.</div>'}
      </div>

      <div class="footNote">
        ${esc(footMessage)}
      </div>
    `;
  }

  function renderStore(item) {
    const usable =
      item.usable === true;

    return `
      <div class="licenseCard">
        <div class="storeHead">
          <div class="storeName">
            <b>${esc(item.store_name)}</b>
            <small>${esc(item.slug)}</small>
          </div>

          <span
            class="badge ${usable ? '' : 'off'}"
          >
            ${esc(statusLabel(item.status))}
          </span>
        </div>

        <div class="meta">
          <span class="kind">
            ${esc(kindLabel(item.license_kind))}
          </span>
          <span class="detail">
            ${esc(licenseDetail(item))}
          </span>
        </div>
      </div>
    `;
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
