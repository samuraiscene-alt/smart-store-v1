/* Smart Store - organization store admin claim manager v2 */
(() => {
  if (window.__smartStoreClaimManagerV2) return;
  window.__smartStoreClaimManagerV2 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const SWITCHER_ID = 'adminStoreSwitcherV3';
  const STYLE_ID = 'adminStoreClaimManagerStyleV2';

  let sb = null;
  let statuses = new Map();
  let observer = null;

  function client() {
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
      #${SWITCHER_ID} .claimStoreRow{
        display:grid;
        grid-template-columns:minmax(0,1fr) auto;
        gap:7px;
        align-items:stretch;
      }

      #${SWITCHER_ID} .claimReissueBtn{
        min-width:104px;
        padding:9px 10px;
        border:1px solid #d8b8b0;
        border-radius:14px;
        background:#f8eeeb;
        color:#76524d;
        font-size:11px;
        font-weight:900;
        line-height:1.25;
      }

      #${SWITCHER_ID} .claimReissueBtn.replace{
        border-color:#cda39a;
        background:#f4e2de;
      }

      #${SWITCHER_ID} .claimReissueBtn:disabled{
        border-color:#eadfda;
        background:#f5f1ef;
        color:#ab9f99;
        opacity:1;
      }
    `;

    document.head.appendChild(style);
  }

  async function copyText(text) {
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

  function formatExpiry(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '7일 동안 사용할 수 있습니다.';
    }

    return new Intl.DateTimeFormat(
      'ko-KR',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);
  }

  async function loadStatuses() {
    const c = client();
    if (!c) return false;

    const { data, error } =
      await c.rpc(
        'organization_store_claim_statuses'
      );

    if (error || !Array.isArray(data)) {
      console.warn(error);
      return false;
    }

    statuses = new Map(
      data.map(item => [item.slug, item])
    );

    decorate();
    return statuses.size > 0;
  }

  function label(status) {
    if (!status) return '';

    if (status.has_admin === true) {
      return '관리자 교체';
    }

    if (
      status.claim_exists === true &&
      status.claimed !== true
    ) {
      return '등록코드 재발급';
    }

    return '등록코드 발급';
  }

  async function issue(slug, button) {
    const status = statuses.get(slug);
    if (!status) return;

    const replacing =
      status.has_admin === true;

    const message = replacing
      ? (
        '기존 지점 관리자 권한이 즉시 해제됩니다.\n' +
        '이 작업은 되돌릴 수 없습니다.\n\n' +
        '새 관리자용 등록코드를 발급할까요?'
      )
      : (
        '기존 등록코드가 있다면 즉시 무효화됩니다.\n' +
        '새 1회용 등록코드를 발급할까요?'
      );

    if (!confirm(message)) return;

    const c = client();
    if (!c) return;

    button.disabled = true;
    button.textContent =
      replacing ? '교체 중...' : '발급 중...';

    const { data, error } =
      await c.rpc(
        'reissue_store_claim',
        { p_slug: slug }
      );

    if (error) {
      alert(
        error.message ||
        '등록코드 발급에 실패했습니다.'
      );

      await loadStatuses();
      return;
    }

    const token = data?.claim_token;
    const expiry =
      formatExpiry(data?.claim_expires_at);

    if (!token) {
      alert('새 등록코드를 확인하지 못했습니다.');
      await loadStatuses();
      return;
    }

    const copied = await copyText(token);
    const title = data?.replaced_admin
      ? '관리자 교체 준비 완료'
      : '등록코드 발급 완료';

    if (copied) {
      alert(
        `${title}\n\n` +
        `${data?.name || slug}\n` +
        `유효기간: ${expiry}\n\n` +
        '새 등록코드가 클립보드에 복사되었습니다.'
      );
    } else {
      prompt(
        `${title}\n` +
        `유효기간: ${expiry}\n\n` +
        '아래 코드를 복사하세요.',
        token
      );
    }

    await loadStatuses();
  }

  function decorate() {
    const box =
      document.querySelector(
        `#${SWITCHER_ID} .stores`
      );

    if (!box) return;

    box.querySelectorAll(
      '.storeBtn[data-store-slug]'
    ).forEach(storeButton => {
      const slug =
        storeButton.dataset.storeSlug;

      if (!slug) return;

      const status = statuses.get(slug);

      if (!status) return;

      let row = storeButton.parentElement;

      if (
        !row?.classList.contains(
          'claimStoreRow'
        )
      ) {
        row =
          document.createElement('div');

        row.className = 'claimStoreRow';

        storeButton.parentNode.insertBefore(
          row,
          storeButton
        );

        row.appendChild(storeButton);
      }

      let action =
        row.querySelector(
          '.claimReissueBtn'
        );

      if (!action) {
        action =
          document.createElement('button');

        action.type = 'button';
        action.className =
          'claimReissueBtn';

        row.appendChild(action);
      }

      const replacing =
        status.has_admin === true;

      action.disabled = false;
      action.classList.toggle(
        'replace',
        replacing
      );
      action.textContent = label(status);
      action.onclick =
        () => issue(slug, action);
    });
  }

  function watch() {
    const box =
      document.querySelector(
        `#${SWITCHER_ID} .stores`
      );

    if (!box) return false;

    if (!observer) {
      observer =
        new MutationObserver(() => {
          decorate();
        });

      observer.observe(
        box,
        {
          childList: true,
          subtree: true
        }
      );
    }

    decorate();
    return true;
  }

  async function init() {
    addStyles();

    const allowed =
      await loadStatuses();

    if (!allowed) return;

    let tries = 0;

    const timer = setInterval(() => {
      tries++;

      if (
        watch() ||
        tries >= 120
      ) {
        clearInterval(timer);
      }
    }, 250);
  }

  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
