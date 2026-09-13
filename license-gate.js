/* Smart Store - license access gate */
(() => {
  if (window.__smartStoreLicenseGate) return;
  window.__smartStoreLicenseGate = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};

  const isAdminPage =
    location.pathname.endsWith('/admin.html') ||
    location.pathname.endsWith('admin.html');

  const OVERLAY_ID = 'smartStoreLicenseGateOverlay';
  const BANNER_ID = 'smartStoreLicenseGateBanner';

  let sb = null;

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
      cancelled: '해지',
      missing: '라이선스 없음'
    })[status] || '이용 제한';
  }

  function removeGate() {
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(BANNER_ID)?.remove();
  }

  function customerMessage(status) {
    if (status === 'cancelled') {
      return '현재 이 매장의 Smart Store 서비스가 종료되어 신규 예약을 받을 수 없습니다.';
    }

    if (status === 'overdue') {
      return '현재 매장 서비스 이용 상태를 확인 중이어서 신규 예약이 제한되어 있습니다.';
    }

    return '현재 이 매장의 온라인 예약 서비스가 일시 중지되어 신규 예약을 받을 수 없습니다.';
  }

  function showCustomerGate(state) {
    removeGate();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;

    overlay.innerHTML = `
      <div class="licenseGateCard">
        <div class="licenseGateMark">!</div>

        <p class="licenseGateLabel">
          SMART STORE
        </p>

        <h2>
          예약 서비스 이용 중지
        </h2>

        <p class="licenseGateText">
          ${customerMessage(state.status)}
        </p>

        <div class="licenseGateStatus">
          현재 상태 · ${statusLabel(state.status)}
        </div>

        <button
          type="button"
          class="licenseGateExisting"
        >
          기존 예약 확인 · 취소
        </button>

        <p class="licenseGateHelp">
          기존 예약 확인과 취소는 계속 이용할 수 있습니다.
        </p>
      </div>
    `;

    const style = document.createElement('style');

    style.textContent = `
      #${OVERLAY_ID}{
        position:fixed;
        inset:0;
        z-index:999999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:
          max(24px,env(safe-area-inset-top))
          20px
          max(24px,env(safe-area-inset-bottom));
        box-sizing:border-box;
        background:rgba(247,243,239,.97);
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
      }

      #${OVERLAY_ID} .licenseGateCard{
        width:min(100%,390px);
        padding:30px 24px;
        box-sizing:border-box;
        border:1px solid #eadfda;
        border-radius:28px;
        background:#fffdfa;
        box-shadow:0 20px 60px rgba(60,39,35,.10);
        text-align:center;
      }

      #${OVERLAY_ID} .licenseGateMark{
        width:52px;
        height:52px;
        margin:0 auto 18px;
        display:grid;
        place-items:center;
        border-radius:50%;
        background:#f3e5e1;
        color:#76524d;
        font-size:24px;
        font-weight:900;
      }

      #${OVERLAY_ID} .licenseGateLabel{
        margin:0 0 8px;
        color:#aa9992;
        font-size:10px;
        font-weight:800;
        letter-spacing:.18em;
      }

      #${OVERLAY_ID} h2{
        margin:0;
        color:#302a28;
        font-size:24px;
        letter-spacing:-.04em;
      }

      #${OVERLAY_ID} .licenseGateText{
        margin:16px 0 0;
        color:#766964;
        font-size:14px;
        line-height:1.7;
      }

      #${OVERLAY_ID} .licenseGateStatus{
        margin:18px 0;
        padding:10px 12px;
        border-radius:14px;
        background:#f7efec;
        color:#76524d;
        font-size:12px;
        font-weight:800;
      }

      #${OVERLAY_ID} .licenseGateExisting{
        width:100%;
        padding:14px;
        border:0;
        border-radius:16px;
        background:#76524d;
        color:white;
        font-size:14px;
        font-weight:800;
      }

      #${OVERLAY_ID} .licenseGateHelp{
        margin:12px 0 0;
        color:#aa9992;
        font-size:11px;
      }
    `;

    overlay.appendChild(style);
    document.body.appendChild(overlay);

    overlay
      .querySelector('.licenseGateExisting')
      .onclick = () => {
        overlay.remove();
      };
  }

  function showAdminGate(state) {
    removeGate();

    const banner = document.createElement('div');
    banner.id = BANNER_ID;

    banner.innerHTML = `
      <div>
        <b>
          라이선스 ${statusLabel(state.status)}
        </b>

        <span>
          조회는 가능하지만 예약 및 매장 운영 변경은 제한됩니다.
        </span>
      </div>

      <button type="button">
        라이선스 관리
      </button>
    `;

    const style = document.createElement('style');

    style.textContent = `
      #${BANNER_ID}{
        position:fixed;
        left:12px;
        right:12px;
        bottom:calc(12px + env(safe-area-inset-bottom));
        z-index:100700;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:13px 14px;
        box-sizing:border-box;
        border:1px solid #dfc4bc;
        border-radius:17px;
        background:#fff8f6;
        box-shadow:0 10px 30px rgba(60,39,35,.12);
      }

      #${BANNER_ID} div{
        min-width:0;
      }

      #${BANNER_ID} b{
        display:block;
        color:#76524d;
        font-size:13px;
      }

      #${BANNER_ID} span{
        display:block;
        margin-top:3px;
        color:#94867f;
        font-size:10px;
        line-height:1.35;
      }

      #${BANNER_ID} button{
        flex:0 0 auto;
        padding:9px 11px;
        border:0;
        border-radius:12px;
        background:#76524d;
        color:#fff;
        font-size:11px;
        font-weight:800;
      }
    `;

    banner.appendChild(style);

    banner.querySelector('button').onclick = () => {
      const licenseButton =
        document.getElementById(
          'smartStoreLicenseManagerButton'
        );

      if (licenseButton) {
        licenseButton.click();
      } else {
        alert(
          '라이선스 변경은 플랫폼 운영자에게 문의해주세요.'
        );
      }
    };

    document.body.appendChild(banner);
  }

  async function checkLicense() {
    const client = ensureClient();

    if (!client || !CONFIG.storeSlug) {
      return;
    }

    const { data, error } =
      await client.rpc(
        'public_store_license_state',
        {
          p_slug: CONFIG.storeSlug
        }
      );

    // 네트워크 오류 시 화면을 잠그지 않는다.
    // 서버의 실제 쓰기 차단은 별도로 유지된다.
    if (error || !data) {
      return;
    }

    window.SMART_STORE_LICENSE_STATE = data;

    if (data.usable === true) {
      removeGate();
      return;
    }

    if (isAdminPage) {
      showAdminGate(data);
    } else {
      showCustomerGate(data);
    }
  }

  function init() {
    checkLicense();

    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) {
          checkLicense();
        }
      }
    );
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
