/* Smart Store - multi store manager v1 */
(() => {
  if (window.__smartStoreManagerV1) return;
  window.__smartStoreManagerV1 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const STYLE_ID = 'adminStoreManagerStyleV1';
  const MODAL_ID = 'adminStoreManagerModalV1';

  let sb = null;

  const q = s => document.querySelector(s);

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

      .adminStoreManagerButtonV1{
        width:100%;
        padding:13px 14px;
        border:1px solid #eadfda;
        border-radius:16px;
        background:#fffdfa;
        color:#76524d;
        font-size:14px;
        font-weight:800;
        text-align:left;
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
            id="newStoreNameV1"
            maxlength="80"
            placeholder="예: JOON NAIL"
          >
        </label>

        <label>
          <span>매장 주소 ID</span>
          <input
            id="newStoreSlugV1"
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

    q('#newStoreNameV1').value = '';
    q('#newStoreSlugV1').value = '';
    q(`#${MODAL_ID} .status`).textContent = '';

    q(`#${MODAL_ID}`).classList.add('open');

    setTimeout(() => {
      q('#newStoreNameV1')?.focus();
    }, 100);
  }

  function closeModal() {
    q(`#${MODAL_ID}`)?.classList.remove('open');
  }

  async function createStore() {
    const client = ensureClient();
    if (!client) return;

    const name =
      q('#newStoreNameV1')?.value.trim() || '';

    const slug =
      q('#newStoreSlugV1')?.value
        .trim()
        .toLowerCase() || '';

    const status =
      q(`#${MODAL_ID} .status`);

    const button =
      q(`#${MODAL_ID} .create`);

    if (!name) {
      status.textContent = '매장명을 입력해주세요.';
      return;
    }

    button.disabled = true;
    status.textContent = '새 매장을 만드는 중...';

    const { data, error } = await client.rpc(
      'create_store_for_current_user',
      {
        p_name: name,
        p_slug: slug || null
      }
    );

    if (error) {
      status.textContent =
        error.message || '매장 생성에 실패했습니다.';
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
    }, 700);
  }

  function mountButton() {
    if (
      document.querySelector(
        '.adminStoreManagerButtonV1'
      )
    ) return;

    const drawer =
      document.querySelector(
        '#adminDrawerMenuV2 .panel'
      );

    if (!drawer) return;

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className =
      'adminStoreManagerButtonV1';

    button.textContent =
      '+ 새 매장 만들기';

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
  }

  function init() {
    addStyles();
    mountModal();

    let tries = 0;

    const timer = setInterval(() => {
      tries++;
      mountButton();

      if (
        document.querySelector(
          '.adminStoreManagerButtonV1'
        ) ||
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
      { once:true }
    );
  } else {
    init();
  }
})();
