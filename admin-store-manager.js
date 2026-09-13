/* Smart Store - multi store manager v3 */
(() => {
  if (window.__smartStoreManagerV3) return;
  window.__smartStoreManagerV3 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const STYLE_ID = 'adminStoreManagerStyleV3';
  const MODAL_ID = 'adminStoreManagerModalV3';
  const SWITCHER_ID = 'adminStoreSwitcherV3';

  let sb = null;
  let stores = [];

  const q = s => document.querySelector(s);

  function esc(v = '') {
    return String(v).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

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

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #${SWITCHER_ID}{
        margin:8px 0 12px;
        padding:12px;
        border:1px solid #eadfda;
        border-radius:18px;
        background:#fffdfa;
      }

      #${SWITCHER_ID} .title{
        margin-bottom:9px;
        color:#94867f;
        font-size:11px;
        font-weight:800;
        letter-spacing:.08em;
      }

      #${SWITCHER_ID} .stores{
        display:grid;
        gap:7px;
      }

      #${SWITCHER_ID} .storeBtn{
        width:100%;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding:11px 12px;
        border:1px solid #eadfda;
        border-radius:14px;
        background:#fff;
        color:#302a28;
        text-align:left;
      }

      #${SWITCHER_ID} .storeBtn.current{
        background:#f5e9e5;
        border-color:#d8b8b0;
      }

      #${SWITCHER_ID} .storeText{
        min-width:0;
      }

      #${SWITCHER_ID} .storeText b{
        display:block;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        font-size:13px;
      }

      #${SWITCHER_ID} .storeText small{
        display:block;
        margin-top:3px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
        color:#94867f;
        font-size:10px;
      }

      #${SWITCHER_ID} .check{
        flex:0 0 auto;
        color:#76524d;
        font-size:16px;
        font-weight:900;
      }

      #${SWITCHER_ID} .loading{
        padding:8px 2px;
        color:#94867f;
        font-size:11px;
      }

      .adminStoreManagerButtonV3{
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
        z-index:100500;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(40,32,29,.35);
        backdrop-filter:blur(5px);
        -webkit-backdrop-filter:blur(5px);
      }

      #${MODAL_ID}.open{
        display:flex;
      }

      #${MODAL_ID} .box{
        width:min(100%,420px);
        max-height:88vh;
        overflow:auto;
        -webkit-overflow-scrolling:touch;
        background:#fffdfa;
        border:1px solid #eadfda;
        border-radius:26px;
        padding:22px;
        box-shadow:0 20px 60px rgba(60,39,35,.2);
      }

      #${MODAL_ID} .top{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:18px;
      }

      #${MODAL_ID} h2{
        margin:0;
        color:#302a28;
        font-size:22px;
        letter-spacing:-.04em;
      }

      #${MODAL_ID} .close{
        width:38px;
        height:38px;
        border:0;
        border-radius:12px;
        background:#f5e9e5;
        color:#76524d;
        font-size:20px;
      }

      #${MODAL_ID} label{
        display:block;
        margin-top:14px;
      }

      #${MODAL_ID} label span{
        display:block;
        margin-bottom:7px;
        color:#76524d;
        font-size:12px;
        font-weight:800;
      }

      #${MODAL_ID} input{
        width:100%;
        box-sizing:border-box;
        padding:14px;
        border:1px solid #eadfda;
        border-radius:15px;
        background:#fff;
        color:#302a28;
        font-size:16px;
        outline:none;
      }

      #${MODAL_ID} small{
        display:block;
        margin-top:7px;
        color:#94867f;
        font-size:11px;
        line-height:1.5;
      }

      #${MODAL_ID} .create{
        width:100%;
        margin-top:20px;
        padding:15px;
        border:0;
        border-radius:16px;
        background:#76524d;
        color:#fff;
        font-size:15px;
        font-weight:800;
      }

      #${MODAL_ID} .status{
        min-height:18px;
        margin-top:12px;
        color:#94867f;
        font-size:12px;
        text-align:center;
      }

      #${MODAL_ID} .result{
        display:none;
      }

      #${MODAL_ID} .result.show{
        display:block;
      }

      #${MODAL_ID} .createForm.hidden{
        display:none;
      }

      #${MODAL_ID} .successBox{
        padding:18px;
        border:1px solid #eadfda;
        border-radius:18px;
        background:#fff;
      }

      #${MODAL_ID} .successTitle{
        margin:0 0 8px;
        color:#302a28;
        font-size:18px;
        font-weight:900;
      }

      #${MODAL_ID} .successText{
        margin:0;
        color:#94867f;
        font-size:12px;
        line-height:1.6;
      }

      #${MODAL_ID} .resultLabel{
        margin-top:18px;
        margin-bottom:7px;
        color:#76524d;
        font-size:12px;
        font-weight:800;
      }

      #${MODAL_ID} .copyRow{
        display:grid;
        grid-template-columns:1fr auto;
        gap:8px;
        align-items:stretch;
      }

      #${MODAL_ID} .copyValue{
        min-width:0;
        padding:12px 13px;
        border:1px solid #eadfda;
        border-radius:14px;
        background:#fff;
        color:#302a28;
        font-size:13px;
        line-height:1.45;
        word-break:break-all;
      }

      #${MODAL_ID} .copyBtn{
        border:0;
        border-radius:14px;
        padding:0 14px;
        background:#f5e9e5;
        color:#76524d;
        font-size:12px;
        font-weight:800;
      }

      #${MODAL_ID} .warning{
        margin-top:16px;
        padding:12px 13px;
        border-radius:14px;
        background:#f8eeeb;
        color:#76524d;
        font-size:11px;
        line-height:1.6;
      }

      #${MODAL_ID} .openAdmin{
        width:100%;
        margin-top:18px;
        padding:15px;
        border:0;
        border-radius:16px;
        background:#76524d;
        color:#fff;
        font-size:15px;
        font-weight:800;
      }

      #${MODAL_ID} .newAnother{
        width:100%;
        margin-top:9px;
        padding:13px;
        border:1px solid #eadfda;
        border-radius:16px;
        background:#fff;
        color:#76524d;
        font-size:14px;
        font-weight:800;
      }
    `;

    document.head.appendChild(style);
  }

  function mountModal() {
    if (document.getElementById(MODAL_ID)) return;

    const modal = document.createElement('div');
    modal.id = MODAL_ID;

    modal.innerHTML = `
      <div class="box">
        <div class="top">
          <h2>새 매장 만들기</h2>
          <button class="close" type="button">×</button>
        </div>

        <div class="createForm">
          <label>
            <span>매장명</span>
            <input
              id="newStoreNameV3"
              maxlength="80"
              placeholder="예: JOON NAIL"
            >
          </label>

          <label>
            <span>매장 주소 ID</span>
            <input
              id="newStoreSlugV3"
              maxlength="48"
              autocapitalize="none"
              autocomplete="off"
              placeholder="예: joon-nail"
            >
          </label>

          <small>
            영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.
            비워두면 자동으로 생성됩니다.
          </small>

          <button class="create" type="button">
            새 매장 생성
          </button>

          <div class="status"></div>
        </div>

        <div class="result">
          <div class="successBox">
            <p class="successTitle">
              매장 생성 완료 ✓
            </p>
            <p class="successText">
              플랫폼 운영자 계정은 이 매장의 소유자로 등록되지 않습니다.
              아래 등록코드를 실제 매장 사장님에게 전달해주세요.
            </p>
          </div>

          <div class="resultLabel">
            매장명
          </div>
          <div
            class="copyValue"
            id="createdStoreNameV3"
          ></div>

          <div class="resultLabel">
            사장님 등록코드
          </div>
          <div class="copyRow">
            <div
              class="copyValue"
              id="createdClaimTokenV3"
            ></div>
            <button
              class="copyBtn"
              type="button"
              data-copy-target="createdClaimTokenV3"
            >
              복사
            </button>
          </div>

          <div class="resultLabel">
            관리자 주소
          </div>
          <div class="copyRow">
            <div
              class="copyValue"
              id="createdAdminUrlV3"
            ></div>
            <button
              class="copyBtn"
              type="button"
              data-copy-target="createdAdminUrlV3"
            >
              복사
            </button>
          </div>

          <div
            class="warning"
            id="createdClaimExpiryV3"
          ></div>

          <button
            class="openAdmin"
            type="button"
          >
            이 매장 관리자 화면 열기
          </button>

          <button
            class="newAnother"
            type="button"
          >
            다른 매장 새로 만들기
          </button>

          <div class="status resultStatus"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close').onclick = closeModal;

    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('.create').onclick = createStore;

    modal.querySelectorAll('[data-copy-target]')
      .forEach(button => {
        button.onclick = () => {
          copyFromTarget(
            button.dataset.copyTarget,
            button
          );
        };
      });

    modal.querySelector('.newAnother').onclick = () => {
      resetModal();
    };
  }

  function resetModal() {
    const form = q(`#${MODAL_ID} .createForm`);
    const result = q(`#${MODAL_ID} .result`);

    form?.classList.remove('hidden');
    result?.classList.remove('show');

    const name = q('#newStoreNameV3');
    const slug = q('#newStoreSlugV3');
    const status = q(`#${MODAL_ID} .createForm .status`);
    const button = q(`#${MODAL_ID} .create`);

    if (name) name.value = '';
    if (slug) slug.value = '';
    if (status) status.textContent = '';
    if (button) button.disabled = false;

    setTimeout(() => {
      name?.focus();
    }, 100);
  }

  function openModal() {
    mountModal();
    resetModal();

    q(`#${MODAL_ID}`)?.classList.add('open');
  }

  function closeModal() {
    q(`#${MODAL_ID}`)?.classList.remove('open');
  }

  async function copyText(text) {
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}

    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      const ok = document.execCommand('copy');

      textarea.remove();

      return ok;
    } catch {
      return false;
    }
  }

  async function copyFromTarget(id, button) {
    const el = document.getElementById(id);
    if (!el) return;

    const text = el.textContent.trim();
    const original = button.textContent;

    const ok = await copyText(text);

    button.textContent = ok ? '복사됨 ✓' : '복사 실패';

    setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }

  function formatExpiry(value) {
    if (!value) {
      return '등록코드는 1회만 사용할 수 있습니다.';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '등록코드는 1회만 사용할 수 있습니다.';
    }

    const formatted = new Intl.DateTimeFormat(
      'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);

    return `등록코드는 1회용이며 ${formatted}까지 사용할 수 있습니다.`;
  }

  async function loadStores() {
    const client = ensureClient();
    if (!client) return;

    const box = q(`#${SWITCHER_ID} .stores`);

    if (box) {
      box.innerHTML =
        '<div class="loading">매장 목록 불러오는 중...</div>';
    }

    const { data, error } = await client
      .from('stores')
      .select('id,name,slug,is_active')
      .eq('is_active', true)
      .order('name');

    if (error) {
      if (box) {
        box.innerHTML =
          '<div class="loading">매장 목록을 불러오지 못했습니다.</div>';
      }
      return;
    }

    stores = Array.isArray(data) ? data : [];
    renderStores();
  }

  function renderStores() {
    const box = q(`#${SWITCHER_ID} .stores`);
    if (!box) return;

    if (!stores.length) {
      box.innerHTML =
        '<div class="loading">연결된 매장이 없습니다.</div>';
      return;
    }

    box.innerHTML = stores.map(store => {
      const current =
        store.slug === CONFIG.storeSlug;

      return `
        <button
          type="button"
          class="storeBtn ${current ? 'current' : ''}"
          data-store-slug="${esc(store.slug)}"
        >
          <span class="storeText">
            <b>${esc(store.name)}</b>
            <small>${esc(store.slug)}</small>
          </span>

          <span class="check">
            ${current ? '✓' : '›'}
          </span>
        </button>
      `;
    }).join('');

    box.querySelectorAll('[data-store-slug]')
      .forEach(button => {
        button.onclick = () => {
          const slug =
            button.dataset.storeSlug;

          if (!slug || slug === CONFIG.storeSlug) {
            return;
          }

          localStorage.setItem(
            'smartStoreAdminSlug',
            slug
          );

          location.href =
            `admin.html?store=${encodeURIComponent(slug)}`;
        };
      });
  }

  async function checkPlatformCreatePermission(button) {
    const client = ensureClient();

    if (!client || !button) return;

    const { data, error } =
      await client.rpc(
        'current_platform_capabilities'
      );

    if (
      !error &&
      data?.can_create_store === true
    ) {
      button.hidden = false;
    }
  }

  function mountManager() {
    if (document.getElementById(SWITCHER_ID)) return;

    const drawer =
      document.querySelector(
        '#adminDrawerMenuV2 .panel'
      );

    if (!drawer) return;

    const wrapper =
      document.createElement('div');

    wrapper.id = SWITCHER_ID;

    wrapper.innerHTML = `
      <div class="title">매장 전환</div>
      <div class="stores">
        <div class="loading">
          매장 목록 불러오는 중...
        </div>
      </div>
    `;

    const createButton =
      document.createElement('button');

    createButton.type = 'button';
    createButton.className =
      'adminStoreManagerButtonV3';

    createButton.textContent =
      '+ 새 매장 만들기';

    createButton.onclick = openModal;
    createButton.hidden = true;

    checkPlatformCreatePermission(
      createButton
    );

    const foot =
      drawer.querySelector('.foot');

    if (foot) {
      foot.parentNode.insertBefore(
        wrapper,
        foot
      );

      foot.parentNode.insertBefore(
        createButton,
        foot
      );
    } else {
      drawer.appendChild(wrapper);
      drawer.appendChild(createButton);
    }

    loadStores();
  }

  async function createStore() {
    const client = ensureClient();
    if (!client) return;

    const name =
      q('#newStoreNameV3')?.value.trim() || '';

    const slug =
      q('#newStoreSlugV3')?.value
        .trim()
        .toLowerCase() || '';

    const status =
      q(`#${MODAL_ID} .createForm .status`);

    const button =
      q(`#${MODAL_ID} .create`);

    if (!name) {
      status.textContent =
        '매장명을 입력해주세요.';
      return;
    }

    button.disabled = true;

    status.textContent =
      '새 매장을 만드는 중...';

    const { data, error } =
      await client.rpc(
        'create_store_for_current_user',
        {
          p_name: name,
          p_slug: slug || null
        }
      );

    if (error) {
      status.textContent =
        error.message ||
        '매장 생성에 실패했습니다.';

      button.disabled = false;
      return;
    }

    const newSlug = data?.slug;
    const claimToken = data?.claim_token;
    const claimExpiresAt =
      data?.claim_expires_at;

    if (!newSlug || !claimToken) {
      status.textContent =
        '매장은 생성됐지만 등록정보를 확인하지 못했습니다.';

      button.disabled = false;
      return;
    }

    const adminUrl =
      `${location.origin}${location.pathname
        .replace(/[^/]*$/, '')}admin.html?store=${encodeURIComponent(newSlug)}`;

    q('#createdStoreNameV3').textContent =
      data?.name || name;

    q('#createdClaimTokenV3').textContent =
      claimToken;

    q('#createdAdminUrlV3').textContent =
      adminUrl;

    q('#createdClaimExpiryV3').textContent =
      formatExpiry(claimExpiresAt);
q('#createdTrialInfoV3').textContent =
  formatTrialInfo(trialEndsAt);
    const openAdminButton =
      q(`#${MODAL_ID} .openAdmin`);

    openAdminButton.onclick = () => {
      localStorage.setItem(
        'smartStoreAdminSlug',
        newSlug
      );

      location.href =
        `admin.html?store=${encodeURIComponent(newSlug)}`;
    };

    q(`#${MODAL_ID} .createForm`)
      ?.classList.add('hidden');

    q(`#${MODAL_ID} .result`)
      ?.classList.add('show');

    loadStores();
  }

  function init() {
    addStyles();
    mountModal();

    let tries = 0;

    const timer = setInterval(() => {
      tries++;
      mountManager();

      if (
        document.getElementById(SWITCHER_ID) ||
        tries >= 40
      ) {
        clearInterval(timer);
      }
    }, 250);
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
