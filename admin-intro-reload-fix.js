/* Smart Store - intro editor selector + startup reload fix v2 */
(() => {
  /*
    admin-intro-editor.js의 실제 카드 ID는 #adminIntroEditorCard인데
    내부 일부 코드가 #introEditorCard를 찾는 오타가 있다.
    이 파일은 해당 selector만 안전하게 실제 ID로 연결한다.
  */
  const originalQuerySelector = Document.prototype.querySelector;

  if (!Document.prototype.__smartStoreIntroSelectorFixed) {
    Document.prototype.querySelector = function(selector) {
      if (selector === '#introEditorCard') selector = '#adminIntroEditorCard';
      return originalQuerySelector.call(this, selector);
    };
    Object.defineProperty(Document.prototype, '__smartStoreIntroSelectorFixed', {
      value: true,
      configurable: true
    });
  }

  const STATUS_ID = 'introEditorStatus';
  const RELOAD_ID = 'introEditorReload';
  const CARD_ID = 'adminIntroEditorCard';

  let stopped = false;
  let timer = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 8;

  function statusText() {
    return (document.getElementById(STATUS_ID)?.textContent || '').trim();
  }

  function stop() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function schedule(delay) {
    if (!stopped) timer = setTimeout(retry, delay);
  }

  function retry() {
    if (stopped) return;

    const card = document.getElementById(CARD_ID);
    const btn = document.getElementById(RELOAD_ID);

    if (!card || !btn) {
      schedule(350);
      return;
    }

    if (statusText().includes('불러오기 완료')) {
      stop();
      return;
    }

    if (attempts >= MAX_ATTEMPTS) {
      stop();
      return;
    }

    attempts += 1;
    btn.click();
    schedule(attempts < 3 ? 650 : 900);
  }

  function install() {
    const observer = new MutationObserver(() => {
      if (statusText().includes('불러오기 완료')) stop();
    });

    const watch = () => {
      const status = document.getElementById(STATUS_ID);
      if (status) {
        observer.observe(status, {
          childList: true,
          subtree: true,
          characterData: true
        });
        schedule(700);
      } else {
        setTimeout(watch, 250);
      }
    };

    watch();

    // 사용자가 직접 편집을 시작하면 자동 재시도는 중지한다.
    document.addEventListener('input', e => {
      if (e.target.closest?.('#' + CARD_ID)) stop();
    }, {capture: true});

    document.addEventListener('change', e => {
      if (e.target.closest?.('#' + CARD_ID)) stop();
    }, {capture: true});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, {once: true});
  } else {
    install();
  }
})();