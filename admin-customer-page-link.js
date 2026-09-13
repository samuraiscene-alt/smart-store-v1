/* Smart Store - open current store customer page in Safari */
(() => {
  const CONFIG = window.SMART_STORE_CONFIG;
  if (!CONFIG?.storeSlug) return;

  const DRAWER_ID = 'adminDrawerMenuV2';
  const ITEM_ID = 'adminCustomerPageLink';

  const svg = `
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="13" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  `;

  function customerUrl() {
    const url = new URL('index.html', location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('store', CONFIG.storeSlug);
    return url.toString();
  }

  function openCustomerPage() {
    const url = customerUrl();

    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer external';

    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function install() {
    if (document.getElementById(ITEM_ID)) return true;

    const drawer =
      document.getElementById(DRAWER_ID);

    const nav =
      drawer?.querySelector('nav');

    if (!nav) return false;

    const logout =
      nav.querySelector('[data-action="logout"]');

    if (!logout) return false;

    const divider =
      logout.previousElementSibling;

    const button =
      document.createElement('button');

    button.id = ITEM_ID;
    button.type = 'button';
    button.className = 'item';

    button.innerHTML = `
      <span class="ico">${svg}</span>
      <span class="txt">
        <b>고객 페이지 보기</b>
        <small>현재 매장 고객 화면을 Safari로 열기</small>
      </span>
      <span class="arr">›</span>
    `;

    button.addEventListener(
      'click',
      openCustomerPage
    );

    if (
      divider &&
      divider.classList.contains('divider')
    ) {
      nav.insertBefore(
        button,
        divider
      );
    } else {
      nav.insertBefore(
        button,
        logout
      );
    }

    return true;
  }

  if (install()) return;

  const timer =
    setInterval(() => {
      if (install()) {
        clearInterval(timer);
      }
    }, 150);

  setTimeout(
    () => clearInterval(timer),
    10000
  );
})();
