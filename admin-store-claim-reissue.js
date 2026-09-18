/* Smart Store - platform claim reissue v1 */
(() => {
  if (window.__smartStoreClaimReissueV1) return;
  window.__smartStoreClaimReissueV1 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const SWITCHER_ID = 'adminStoreSwitcherV3';
  const STYLE_ID = 'adminStoreClaimReissueStyleV1';

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

    const { data: caps, error: capsError } =
      await c.rpc('current_platform_capabilities');

    if (
      capsError ||
      caps?.is_platform_admin !== true
    ) {
      return false;
    }

    const { data, error } =
      await c.rpc('platform_store_claim_statuses');

    if (error || !Array.isArray(data)) {
      console.warn(error);
      return false;
    }

    statuses = new Map(
      data.map(item => [item.slug, item])
    );

    decorate();
    return true;
  }

  function label(status) {
    if (!status) return '상태 확인 중';

    if (status.reissue_allowed) {
      return '등록코드 재발급';
    }

    if (status.claimed || status.has_owner) {
      return '사장 등록 완료';
    }

    if (!status.claim_exists) {
      return '등록코드 없음';
    }

    return '재발급 불가';
  }

  async function reissue(slug, button) {
    const status = statuses.get(slug);

    if (!status?.reissue_allowed) return;

    const ok = confirm(
      '기존 등록코드는 즉시 무효화됩니다.\n새 등록코드를 발급할까요?'
    );

    if (!ok) return;

    const c = client();
    if (!c) return;

    button.disabled = true;
    button.textContent = '재발급 중...';

    const { data, error } =
      await c.rpc(
        'reissue_store_claim',
        { p_slug: slug }
      );

    if (error) {
      alert(
        error.message ||
        '등록코드 재발급에 실패했습니다.'
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

    if (copied) {
      alert(
        `등록코드 재발급 완료\n\n` +
        `${data?.name || slug}\n` +
        `유효기간: ${expiry}\n\n` +
        `새 등록코드가 클립보드에 복사되었습니다.`
      );
    } else {
      prompt(
        `등록코드 재발급 완료\n` +
        `유효기간: ${expiry}\n\n` +
        `아래 코드를 복사하세요.`,
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

      const status = statuses.get(slug);
      const allowed =
        status?.reissue_allowed === true;

      action.disabled = !allowed;
      action.textContent = label(status);

      action.onclick = allowed
        ? () => reissue(slug, action)
        : null;
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
