/* Smart Store - trial notice */
(() => {
  if (window.__smartStoreTrialNotice) return;
  window.__smartStoreTrialNotice = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  const BANNER_ID = 'smartStoreTrialBanner';
  const WELCOME_ID = 'smartStoreTrialWelcome';
  const SEEN_PREFIX = 'smartStoreTrialWelcomeSeen:';

  let sb = null;

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

  function formatDate(value) {
    if (!value) return '-';

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  }

  function daysLeft(value) {
    if (!value) return null;

    const end = new Date(value).getTime();
    if (!Number.isFinite(end)) return null;

    const diff = end - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function addStyles() {
    if (document.getElementById('smartStoreTrialNoticeStyle')) return;

    const style = document.createElement('style');
    style.id = 'smartStoreTrialNoticeStyle';

    style.textContent = `
      #${BANNER_ID}{
        margin:16px 0;
        padding:15px 16px;
        border:1px solid #eadfda;
        border-radius:18px;
        background:#fff8f4;
        color:#302a28;
      }

      #${BANNER_ID} .trialTop{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }

      #${BANNER_ID} .trialTitle{
        font-size:14px;
        font-weight:900;
        color:#76524d;
      }

      #${BANNER_ID} .trialBadge{
        flex:0 0 auto;
        padding:6px 9px;
        border-radius:999px;
        background:#f5e9e5;
        color:#76524d;
        font-size:11px;
        font-weight:800;
      }

      #${BANNER_ID} .trialBody{
        margin-top:8px;
        color:#756963;
        font-size:12px;
        line-height:1.6;
      }

      #${WELCOME_ID}{
        position:fixed;
        inset:0;
        z-index:100800;
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
        background:rgba(40,32,29,.38);
        backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);
      }

      #${WELCOME_ID}.open{
        display:flex;
      }

      #${WELCOME_ID} .box{
        width:min(100%,420px);
        padding:24px;
        border-radius:26px;
        background:#fffdfa;
        border:1px solid #eadfda;
        box-shadow:0 20px 60px rgba(60,39,35,.22);
      }

      #${WELCOME_ID} .eyebrow{
        margin:0 0 8px;
        color:#b37b73;
        font-size:11px;
        font-weight:900;
        letter-spacing:.12em;
      }

      #${WELCOME_ID} h2{
        margin:0;
        color:#302a28;
        font-size:24px;
        letter-spacing:-.04em;
      }

      #${WELCOME_ID} .desc{
        margin-top:12px;
        color:#756963;
        font-size:13px;
        line-height:1.7;
      }

      #${WELCOME_ID} .info{
        margin-top:18px;
        padding:15px;
        border-radius:16px;
        background:#f8eeeb;
        color:#76524d;
        font-size:13px;
        line-height:1.7;
      }

      #${WELCOME_ID} button{
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
    `;

    document.head.appendChild(style);
  }

  function mountBanner(summary) {
    document.getElementById(BANNER_ID)?.remove();

    if (!summary || summary.status !== 'trial') return;

    const target =
      document.querySelector('.adminSummary') ||
      document.querySelector('#adminApp');

    if (!target) return;

    const left = daysLeft(summary.trial_ends_at);

    const el = document.createElement('section');
    el.id = BANNER_ID;

    el.innerHTML = `
      <div class="trialTop">
        <div class="trialTitle">14일 무료 체험 중</div>
        <div class="trialBadge">
          ${left === null ? '체험 중' : `${left}일 남음`}
        </div>
      </div>

      <div class="trialBody">
        체험 종료일: <b>${formatDate(summary.trial_ends_at)}</b><br>
        체험 종료 후에는 라이선스 활성화가 필요합니다.
      </div>
    `;

    target.insertAdjacentElement('afterend', el);
  }

  function mountWelcome(summary) {
    if (!summary || summary.status !== 'trial') return;

    const key =
      `${SEEN_PREFIX}${CONFIG.storeSlug || 'default'}`;

    if (localStorage.getItem(key) === '1') return;

    let modal = document.getElementById(WELCOME_ID);

    if (!modal) {
      modal = document.createElement('div');
      modal.id = WELCOME_ID;

      modal.innerHTML = `
        <div class="box">
          <p class="eyebrow">WELCOME TO SMART STORE</p>
          <h2>14일 무료 체험이 시작되었습니다</h2>

          <div class="desc">
            체험 기간 동안 Smart Store의 주요 기능을 사용할 수 있습니다.
          </div>

          <div class="info">
            체험 종료일:
            <b id="smartStoreTrialWelcomeEnd"></b><br>
            체험 종료 후에는 라이선스 활성화가 필요합니다.
          </div>

          <button type="button">
            확인
          </button>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('button').onclick = () => {
        localStorage.setItem(key, '1');
        modal.classList.remove('open');
      };
    }

    const end =
      modal.querySelector('#smartStoreTrialWelcomeEnd');

    if (end) {
      end.textContent =
        formatDate(summary.trial_ends_at);
    }

    modal.classList.add('open');
  }

  async function loadTrialState() {
    const client = ensureClient();
    if (!client) return;

    const { data, error } =
      await client.rpc(
        'current_store_license_summary',
        {
          p_slug: CONFIG.storeSlug
        }
      );

    if (error || !data) return;

    mountBanner(data);
    mountWelcome(data);
  }

  function init() {
    addStyles();

    let tries = 0;

    const timer = setInterval(async () => {
      tries++;

      const app =
        document.getElementById('adminApp');

      if (
        app &&
        !app.classList.contains('hidden')
      ) {
        clearInterval(timer);
        await loadTrialState();
        return;
      }

      if (tries >= 80) {
        clearInterval(timer);
      }
    }, 250);

    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) {
          loadTrialState();
        }
      }
    );
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
