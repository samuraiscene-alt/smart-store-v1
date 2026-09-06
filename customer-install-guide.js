/* Smart Store - customer PWA install guide */
(() => {
  const STYLE_ID = 'smartStoreInstallGuideStyle';
  const MODAL_ID = 'smartStoreInstallGuideModal';

  const isIOS = () => {
    const ua = navigator.userAgent || '';
    return /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{z-index:100010}
      #${MODAL_ID} .installGuideBox{width:min(92vw,430px);text-align:left}
      #${MODAL_ID} .installGuideHead{text-align:center;margin-bottom:16px}
      #${MODAL_ID} .installGuideIcon{width:54px;height:54px;margin:0 auto 10px;border-radius:50%;display:grid;place-items:center;background:var(--soft);color:var(--accent);font-size:25px}
      #${MODAL_ID} h3{margin:0;text-align:center}
      #${MODAL_ID} .installLead{margin:8px 0 0;color:var(--muted);font-size:13px;line-height:1.55;text-align:center}
      #${MODAL_ID} .installSteps{display:grid;gap:10px;margin:18px 0 0}
      #${MODAL_ID} .installStep{display:grid;grid-template-columns:34px 1fr;gap:11px;align-items:start;padding:13px 14px;border-radius:16px;background:#f9f3f0}
      #${MODAL_ID} .installNo{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:white;color:var(--accent);font-weight:800;font-size:13px;box-shadow:0 3px 10px rgba(67,45,40,.08)}
      #${MODAL_ID} .installStep b{display:block;font-size:14px;margin:1px 0 4px}
      #${MODAL_ID} .installStep p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      #${MODAL_ID} .installTip{margin:12px 0 0;padding:11px 12px;border-radius:14px;border:1px solid var(--line);color:var(--muted);font-size:11px;line-height:1.5}
      #${MODAL_ID} .installGuideActions{display:grid;grid-template-columns:1fr;gap:8px;margin-top:16px}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;
    addStyles();
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'modalBackdrop hidden';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <section class="confirmBox installGuideBox">
        <div class="installGuideHead">
          <div class="installGuideIcon">🔔</div>
          <h3>예약 알림 받기</h3>
          <p class="installLead">아이폰에서는 매장을 홈 화면에 추가하면<br>예약 확정·변경·취소·리마인드 알림을 받을 수 있습니다.</p>
        </div>
        <div class="installSteps">
          <div class="installStep"><span class="installNo">1</span><div><b>Safari 공유 버튼 누르기</b><p>화면 아래의 공유 버튼(□↑)을 눌러주세요.</p></div></div>
          <div class="installStep"><span class="installNo">2</span><div><b>‘홈 화면에 추가’ 선택</b><p>공유 메뉴를 내려 ‘홈 화면에 추가’를 선택해주세요.</p></div></div>
          <div class="installStep"><span class="installNo">3</span><div><b>홈 화면 아이콘으로 다시 열기</b><p>추가된 매장 아이콘을 열고 ‘예약 알림 받기’를 다시 눌러 알림을 허용해주세요.</p></div></div>
        </div>
        <div class="installTip">카카오톡·인스타그램 안에서 열었다면 먼저 Safari에서 이 페이지를 열어주세요. 홈 화면 추가는 한 번만 하면 됩니다.</div>
        <div class="installGuideActions"><button id="smartStoreInstallGuideClose" class="primary" type="button">확인</button></div>
      </section>`;
    document.body.appendChild(modal);
    document.getElementById('smartStoreInstallGuideClose')?.addEventListener('click', closeGuide);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeGuide(); });
  }

  function openGuide() {
    ensureModal();
    document.getElementById(MODAL_ID)?.classList.remove('hidden');
  }

  function closeGuide() {
    document.getElementById(MODAL_ID)?.classList.add('hidden');
  }

  function interceptInstallRequiredPushButton() {
    document.addEventListener('click', (e) => {
      const button = e.target.closest?.('#bookingPushEnable');
      if (!button) return;
      if (isIOS() && !isStandalone()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        openGuide();
      }
    }, true);
  }

  function init() {
    ensureModal();
    interceptInstallRequiredPushButton();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  window.SmartStoreInstallGuide = Object.freeze({ open: openGuide, close: closeGuide, isStandalone });
})();
