/* Smart Store - per-store app icon settings v1 */
(() => {
  if (window.__smartStoreAppIconSettingsV1) return;
  window.__smartStoreAppIconSettingsV1 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};
  if (
    !CONFIG.supabaseUrl ||
    !CONFIG.supabaseKey ||
    !CONFIG.storeSlug ||
    !window.supabase
  ) return;

  const sb = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  const PANEL_ID = 'adminAppIconSettingsV1';
  const STYLE_ID = 'adminAppIconSettingsStyleV1';

  let store = null;
  let customerImage = null;
  let adminImage = null;

  const state = {
    customer: {
      scale: 0.78,
      x: 0,
      y: 0,
      background: '#ffffff'
    },
    admin: {
      scale: 0.78,
      x: 0,
      y: 0,
      background: '#ffffff'
    }
  };

  const $ = (s, root = document) =>
    root.querySelector(s);

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #${PANEL_ID}{
        margin-top:14px
      }

      #${PANEL_ID} h3{
        margin:0 0 5px
      }

      #${PANEL_ID} .appIconLead{
        margin:0 0 14px;
        color:var(--muted);
        font-size:12px;
        line-height:1.5
      }

      #${PANEL_ID} .appIconGrid{
        display:grid;
        gap:14px
      }

      #${PANEL_ID} .appIconEditor{
        padding:14px;
        border:1px solid var(--line);
        border-radius:18px;
        background:#fff
      }

      #${PANEL_ID} .appIconEditor h4{
        margin:0 0 10px
      }

      #${PANEL_ID} .appIconPreviewRow{
        display:flex;
        align-items:center;
        gap:14px;
        margin:13px 0
      }

      #${PANEL_ID} .appIconPreview{
        position:relative;
        width:112px;
        height:112px;
        flex:0 0 112px;
        overflow:hidden;
        border-radius:25%;
        background:#fff;
        box-shadow:0 7px 20px rgba(0,0,0,.15)
      }

      #${PANEL_ID} canvas{
        width:100%;
        height:100%;
        display:block
      }

      #${PANEL_ID} .safeArea{
        position:absolute;
        inset:11%;
        border:1px dashed rgba(210,70,55,.8);
        border-radius:18%;
        pointer-events:none
      }

      #${PANEL_ID} .previewInfo b{
        display:block;
        margin-bottom:5px;
        font-size:13px
      }

      #${PANEL_ID} .previewInfo small{
        display:block;
        color:var(--muted);
        font-size:11px;
        line-height:1.45
      }

      #${PANEL_ID} .control{
        display:grid;
        grid-template-columns:48px 1fr 42px;
        align-items:center;
        gap:8px;
        margin-top:8px
      }

      #${PANEL_ID} .control span,
      #${PANEL_ID} .control output{
        font-size:11px;
        color:var(--muted)
      }

      #${PANEL_ID} .control output{
        text-align:right
      }

      #${PANEL_ID} input[type="range"]{
        width:100%
      }

      #${PANEL_ID} .colorRow{
        display:flex;
        align-items:center;
        gap:10px;
        margin-top:10px
      }

      #${PANEL_ID} .colorRow span{
        width:48px;
        color:var(--muted);
        font-size:11px
      }

      #${PANEL_ID} .colorRow input{
        width:54px;
        height:34px;
        padding:0;
        border:1px solid var(--line);
        border-radius:10px;
        background:#fff
      }

      #${PANEL_ID} .sameRow{
        display:flex;
        align-items:center;
        gap:9px;
        margin:13px 0 0;
        font-size:12px
      }

      #${PANEL_ID} .appIconNote{
        margin-top:12px;
        padding:11px 12px;
        border-radius:14px;
        background:var(--soft);
        color:var(--muted);
        font-size:11px;
        line-height:1.5
      }

      #${PANEL_ID} .appIconActions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
        margin-top:14px
      }

      #${PANEL_ID} .appIconStatus{
        min-height:18px;
        margin-top:9px;
        text-align:center;
        color:var(--muted);
        font-size:11px
      }

      @media(min-width:760px){
        #${PANEL_ID} .appIconGrid{
          grid-template-columns:1fr 1fr
        }
      }
    `;

    document.head.appendChild(style);
  }

  function editorHTML(kind, title) {
    return `
      <section class="appIconEditor" data-icon-kind="${kind}">
        <h4>${title}</h4>

        <input
          data-role="file"
          type="file"
          accept="image/*"
        >

        <div class="appIconPreviewRow">
          <div class="appIconPreview">
            <canvas
              data-role="canvas"
              width="512"
              height="512"
            ></canvas>

            <div class="safeArea"></div>
          </div>

          <div class="previewInfo">
            <b>홈 화면 미리보기</b>
            <small>
              중요한 글자와 로고는
              점선 안쪽에 두는 것을 권장합니다.
            </small>
          </div>
        </div>

        <label class="control">
          <span>크기</span>
          <input
            data-role="scale"
            type="range"
            min="45"
            max="115"
            step="1"
          >
          <output data-role="scaleOut"></output>
        </label>

        <label class="control">
          <span>좌우</span>
          <input
            data-role="x"
            type="range"
            min="-25"
            max="25"
            step="1"
          >
          <output data-role="xOut"></output>
        </label>

        <label class="control">
          <span>상하</span>
          <input
            data-role="y"
            type="range"
            min="-25"
            max="25"
            step="1"
          >
          <output data-role="yOut"></output>
        </label>

        <label class="colorRow">
          <span>배경</span>
          <input
            data-role="background"
            type="color"
          >
        </label>
      </section>
    `;
  }

  function mount() {
    if (document.getElementById(PANEL_ID)) return;

    const storePanel =
      document.querySelector(
        '.adminPanel[data-panel="store"]'
      );

    if (!storePanel) return;

    addStyles();

    const box = document.createElement('div');

    box.id = PANEL_ID;
    box.className = 'formCard card';

    box.innerHTML = `
      <h3>앱 이름 & 아이콘</h3>

      <p class="appIconLead">
        매장별 홈 화면 앱 이름과
        고객용·관리자용 아이콘을 설정합니다.
      </p>

      <label class="field">
        <span>앱 표시 이름</span>
        <input
          id="appDisplayNameV1"
          maxlength="30"
          placeholder="예: S'nail"
        >
      </label>

      <div class="appIconGrid">
        ${editorHTML(
          'customer',
          '고객용 앱'
        )}

        ${editorHTML(
          'admin',
          '관리자용 앱'
        )}
      </div>

      <label class="sameRow">
        <input
          id="sameAdminIconV1"
          type="checkbox"
        >
        관리자용 아이콘도 고객용과 동일하게 사용
      </label>

      <div class="appIconNote">
        저장할 때 192×192와 512×512 PNG를
        자동 생성합니다.
        아이콘 가장자리 잘림을 방지하기 위해
        기본값은 약 78% 안전영역으로 설정됩니다.
      </div>

      <div class="appIconActions">
        <button
          id="resetAppIconV1"
          class="secondary"
          type="button"
        >
          기본 위치
        </button>

        <button
          id="saveAppIconV1"
          class="primary"
          type="button"
        >
          아이콘 저장
        </button>
      </div>

      <div
        id="appIconStatusV1"
        class="appIconStatus"
      ></div>
    `;

    storePanel.appendChild(box);

    bindEditor('customer');
    bindEditor('admin');

    $('#sameAdminIconV1')
      .addEventListener(
        'change',
        handleSameIcon
      );

    $('#resetAppIconV1')
      .addEventListener(
        'click',
        resetSettings
      );

    $('#saveAppIconV1')
      .addEventListener(
        'click',
        saveSettings
      );
  }

  function editorRoot(kind) {
    return document.querySelector(
      `[data-icon-kind="${kind}"]`
    );
  }

  function bindEditor(kind) {
    const root = editorRoot(kind);
    if (!root) return;

    $('[data-role="file"]', root)
      .addEventListener(
        'change',
        event => {
          loadSelectedImage(
            kind,
            event.target.files?.[0]
          );
        }
      );

    $('[data-role="scale"]', root)
      .addEventListener(
        'input',
        event => {
          state[kind].scale =
            Number(event.target.value) / 100;

          syncControls(kind);
          drawPreview(kind);
        }
      );

    $('[data-role="x"]', root)
      .addEventListener(
        'input',
        event => {
          state[kind].x =
            Number(event.target.value);

          syncControls(kind);
          drawPreview(kind);
        }
      );

    $('[data-role="y"]', root)
      .addEventListener(
        'input',
        event => {
          state[kind].y =
            Number(event.target.value);

          syncControls(kind);
          drawPreview(kind);
        }
      );

    $('[data-role="background"]', root)
      .addEventListener(
        'input',
        event => {
          state[kind].background =
            event.target.value;

          syncControls(kind);
          drawPreview(kind);
        }
      );
  }

  function syncControls(kind) {
    const root = editorRoot(kind);
    const s = state[kind];

    if (!root) return;

    $('[data-role="scale"]', root).value =
      Math.round(s.scale * 100);

    $('[data-role="x"]', root).value =
      s.x;

    $('[data-role="y"]', root).value =
      s.y;

    $('[data-role="background"]', root).value =
      s.background;

    $('[data-role="scaleOut"]', root)
      .textContent =
      `${Math.round(s.scale * 100)}%`;

    $('[data-role="xOut"]', root)
      .textContent =
      `${s.x}`;

    $('[data-role="yOut"]', root)
      .textContent =
      `${s.y}`;
  }

  function imageFromURL(url) {
    return new Promise(
      (resolve, reject) => {
        const img = new Image();

        img.crossOrigin = 'anonymous';

        img.onload = () =>
          resolve(img);

        img.onerror = () =>
          reject(
            new Error(
              '이미지를 읽을 수 없습니다.'
            )
          );

        img.src = url;
      }
    );
  }

  async function loadSelectedImage(
    kind,
    file
  ) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus(
        '이미지 파일만 사용할 수 있습니다.',
        true
      );
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setStatus(
        '아이콘 원본은 12MB 이하로 올려주세요.',
        true
      );
      return;
    }

    const url =
      URL.createObjectURL(file);

    try {
      const img =
        await imageFromURL(url);

      if (kind === 'customer') {
        customerImage = img;
      } else {
        adminImage = img;
      }

      drawPreview(kind);

      if (
        kind === 'customer' &&
        $('#sameAdminIconV1')?.checked
      ) {
        adminImage = img;
        drawPreview('admin');
      }

      setStatus(
        '크기와 위치를 조절한 뒤 저장하세요.'
      );
    } catch (error) {
      setStatus(
        error.message,
        true
      );
    }
  }

  function currentImage(kind) {
    if (
      kind === 'admin' &&
      $('#sameAdminIconV1')?.checked
    ) {
      return customerImage || adminImage;
    }

    return kind === 'customer'
      ? customerImage
      : adminImage;
  }

  function drawCanvas(
    canvas,
    image,
    config
  ) {
    const ctx =
      canvas.getContext('2d');

    const size =
      canvas.width;

    ctx.clearRect(
      0,
      0,
      size,
      size
    );

    ctx.fillStyle =
      config.background;

    ctx.fillRect(
      0,
      0,
      size,
      size
    );

    if (!image) return;

    const fit =
      Math.min(
        size / image.naturalWidth,
        size / image.naturalHeight
      );

    const scale =
      fit * config.scale;

    const width =
      image.naturalWidth * scale;

    const height =
      image.naturalHeight * scale;

    const x =
      (size - width) / 2 +
      (config.x / 100) * size;

    const y =
      (size - height) / 2 +
      (config.y / 100) * size;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      x,
      y,
      width,
      height
    );
  }

  function drawPreview(kind) {
    const root =
      editorRoot(kind);

    if (!root) return;

    const canvas =
      $('[data-role="canvas"]', root);

    drawCanvas(
      canvas,
      currentImage(kind),
      state[kind]
    );
  }

  function resetSettings() {
    state.customer = {
      scale:0.78,
      x:0,
      y:0,
      background:'#ffffff'
    };

    state.admin = {
      scale:0.78,
      x:0,
      y:0,
      background:'#ffffff'
    };

    syncControls('customer');
    syncControls('admin');

    drawPreview('customer');
    drawPreview('admin');

    setStatus(
      '기본 안전영역으로 되돌렸습니다.'
    );
  }

  function handleSameIcon() {
    const checked =
      $('#sameAdminIconV1')?.checked;

    const adminRoot =
      editorRoot('admin');

    if (adminRoot) {
      adminRoot.style.opacity =
        checked ? '.55' : '1';
    }

    if (checked) {
      state.admin = {
        ...state.customer
      };

      syncControls('admin');
    }

    drawPreview('admin');
  }

  function canvasBlob(
    kind,
    size
  ) {
    return new Promise(
      (resolve, reject) => {
        const canvas =
          document.createElement(
            'canvas'
          );

        canvas.width = size;
        canvas.height = size;

        drawCanvas(
          canvas,
          currentImage(kind),
          state[kind]
        );

        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(
                new Error(
                  '아이콘 생성에 실패했습니다.'
                )
              );
            }
          },
          'image/png',
          1
        );
      }
    );
  }

  async function uploadIcon(
    kind,
    size,
    stamp
  ) {
    const blob =
      await canvasBlob(
        kind,
        size
      );

    const path =
      `${store.id}/app-icons/` +
      `${kind}-${size}-${stamp}.png`;

    const { error } =
      await sb.storage
        .from('store-media')
        .upload(
          path,
          blob,
          {
            contentType:'image/png',
            cacheControl:'31536000',
            upsert:false
          }
        );

    if (error) throw error;

    const { data } =
      sb.storage
        .from('store-media')
        .getPublicUrl(path);

    return data.publicUrl;
  }

  async function saveSettings() {
    if (!store?.id) return;

    if (!customerImage) {
      setStatus(
        '고객용 아이콘 이미지를 먼저 선택해주세요.',
        true
      );
      return;
    }

    const same =
      $('#sameAdminIconV1')
        ?.checked;

    if (
      !same &&
      !adminImage
    ) {
      setStatus(
        '관리자용 아이콘 이미지를 선택하거나 동일 아이콘 사용을 체크해주세요.',
        true
      );
      return;
    }

    const button =
      $('#saveAppIconV1');

    button.disabled = true;

    setStatus(
      '192·512 아이콘 생성 중...'
    );

    try {
      if (same) {
        state.admin = {
          ...state.customer
        };
      }

      const stamp =
        Date.now();

      const customer192 =
        await uploadIcon(
          'customer',
          192,
          stamp
        );

      const customer512 =
        await uploadIcon(
          'customer',
          512,
          stamp
        );

      let admin192 =
        customer192;

      let admin512 =
        customer512;

      if (!same) {
        admin192 =
          await uploadIcon(
            'admin',
            192,
            stamp
          );

        admin512 =
          await uploadIcon(
            'admin',
            512,
            stamp
          );
      }

      const appName =
        $('#appDisplayNameV1')
          ?.value
          .trim() ||
        store.name;

      const iconConfig = {
        version:1,

        customer:{
          ...state.customer,
          icon192:customer192,
          icon512:customer512
        },

        admin:{
          ...(same
            ? state.customer
            : state.admin),

          icon192:admin192,
          icon512:admin512
        },

        sameAdminIcon:
          !!same
      };

      const { error } =
        await sb
          .from('stores')
          .update({
            app_name:appName,
            customer_app_icon_url:
              customer512,
            admin_app_icon_url:
              admin512,
            app_icon_config:
              iconConfig
          })
          .eq(
            'id',
            store.id
          );

      if (error) throw error;

      store.app_name =
        appName;

      store.customer_app_icon_url =
        customer512;

      store.admin_app_icon_url =
        admin512;

      store.app_icon_config =
        iconConfig;

      setStatus(
        '앱 이름과 아이콘 저장 완료 ✓'
      );
    } catch (error) {
      console.error(
        'app icon save failed',
        error
      );

      setStatus(
        error.message ||
        '아이콘 저장에 실패했습니다.',
        true
      );
    } finally {
      button.disabled = false;
    }
  }

  function setStatus(
    text,
    error = false
  ) {
    const el =
      $('#appIconStatusV1');

    if (!el) return;

    el.textContent =
      text || '';

    el.style.color =
      error
        ? '#a34f4a'
        : '';
  }

  function normalizeConfig(
    config
  ) {
    if (
      !config ||
      typeof config !== 'object'
    ) return;

    const loadPart =
      (kind, part) => {
        if (!part) return;

        state[kind].scale =
          Number(
            part.scale ??
            state[kind].scale
          );

        state[kind].x =
          Number(
            part.x ??
            part.offsetX ??
            0
          );

        state[kind].y =
          Number(
            part.y ??
            part.offsetY ??
            0
          );

        state[kind].background =
          part.background ||
          '#ffffff';
      };

    if (
      config.customer ||
      config.admin
    ) {
      loadPart(
        'customer',
        config.customer
      );

      loadPart(
        'admin',
        config.admin
      );
    } else {
      loadPart(
        'customer',
        config
      );

      loadPart(
        'admin',
        config
      );
    }
  }

  async function loadStore() {
    const {
      data:{ session }
    } =
      await sb.auth
        .getSession();

    if (!session) return false;

    const {
      data,
      error
    } =
      await sb
        .from('stores')
        .select(
          [
            'id',
            'slug',
            'name',
            'app_name',
            'customer_app_icon_url',
            'admin_app_icon_url',
            'app_icon_config'
          ].join(',')
        )
        .eq(
          'slug',
          CONFIG.storeSlug
        )
        .maybeSingle();

    if (error) throw error;
    if (!data) return false;

    store = data;

    normalizeConfig(
      data.app_icon_config
    );

    return true;
  }

  async function loadExistingImage(
    kind,
    url
  ) {
    if (!url) return;

    try {
      const img =
        await imageFromURL(url);

      if (kind === 'customer') {
        customerImage = img;
      } else {
        adminImage = img;
      }
    } catch {}
  }

  async function hydrate() {
    try {
      const ok =
        await loadStore();

      if (!ok) return;

      $('#appDisplayNameV1').value =
        store.app_name ||
        store.name ||
        '';

      $('#sameAdminIconV1').checked =
        !!store
          .app_icon_config
          ?.sameAdminIcon;

      await Promise.all([
        loadExistingImage(
          'customer',
          store.customer_app_icon_url
        ),

        loadExistingImage(
          'admin',
          store.admin_app_icon_url
        )
      ]);

      syncControls(
        'customer'
      );

      syncControls(
        'admin'
      );

      drawPreview(
        'customer'
      );

      drawPreview(
        'admin'
      );

      handleSameIcon();

    } catch (error) {
      console.warn(
        'app icon settings load failed',
        error
      );

      setStatus(
        '앱 아이콘 설정을 불러오지 못했습니다.',
        true
      );
    }
  }

  function init() {
    let count = 0;

    const timer =
      setInterval(
        async () => {
          count++;

          mount();

          if (
            document.getElementById(
              PANEL_ID
            )
          ) {
            clearInterval(timer);
            await hydrate();
          }

          if (count >= 40) {
            clearInterval(timer);
          }
        },
        250
      );
  }

  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      init,
      { once:true }
    );
  } else {
    init();
  }
})();
