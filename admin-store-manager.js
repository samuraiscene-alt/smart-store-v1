/* Smart Store - multi store manager v2 */
(() => {
  if (window.__smartStoreManagerV2) return;
  window.__smartStoreManagerV2 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const STYLE_ID = 'adminStoreManagerStyleV2';
  const MODAL_ID = 'adminStoreManagerModalV2';
  const SWITCHER_ID = 'adminStoreSwitcherV2';

  let sb = null;
  let stores = [];

  const q = s => document.querySelector(s);

  function esc(v='') {
    return String(v).replace(/[&<>"']/g, ch => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[ch]));
  }

  function ensureClient() {
    if (sb) return sb;

    if (
      !window.supabase?.createClient ||
      !CONFIG.supabaseUrl ||
      !CONFIG.supabaseKey
    ) return null;

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

      .adminStoreManagerButtonV2{
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

        <label>
          <span>매장명</span>
          <input
            id="newStoreNameV2"
            maxlength="80"
            placeholder="예: JOON NAIL"
          >
        </label>

        <label>
          <span>매장 주소 ID</span>
          <input
            id="newStoreSlugV2"
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
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close').onclick = closeModal;

    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('.create').onclick = createStore;
  }

  function openModal() {
    mountModal();

    q('#newStoreNameV2').value = '';
    q('#newStoreSlugV2').value = '';
    q(`#${MODAL_ID} .status`).textContent = '';

    q(`#${MODAL_ID}`).classList.add('open');

    setTimeout(() => {
      q('#newStoreNameV2')?.focus();
    }, 100);
  }

  function closeModal() {
    q(`#${MODAL_ID}`)?.classList.remove('open');
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
      'adminStoreManagerButtonV2';

    createButton.textContent =
      '+ 새 매장 만들기';

    createButton.onclick = openModal;

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
      q('#newStoreNameV2')?.value.trim() || '';

    const slug =
      q('#newStoreSlugV2')?.value
        .trim()
        .toLowerCase() || '';

    const status =
      q(`#${MODAL_ID} .status`);

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
          p_name:name,
          p_slug:slug || null
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

    if (!newSlug) {
      status.textContent =
        '매장은 생성됐지만 주소를 확인하지 못했습니다.';
      button.disabled = false;
      return;
    }

    localStorage.setItem(
      'smartStoreAdminSlug',
      newSlug
    );

    status.textContent =
      '매장 생성 완료 ✓ 이동합니다.';

    setTimeout(() => {
      location.href =
        `admin.html?store=${encodeURIComponent(newSlug)}`;
    },700);
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
    },250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once:true }
    );
  } else {
    init();
  }
})();
