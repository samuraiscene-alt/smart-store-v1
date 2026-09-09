/* Smart Store - admin home header editor v1 */
(() => {
  const CONFIG = window.SMART_STORE_CONFIG || {};
  const CARD_ID = 'adminHomeHeaderCard';
  const STYLE_ID = 'adminHomeHeaderStyle';

  let client = null;
  let storeId = null;
  let currentLogoUrl = '';

  const q = s => document.querySelector(s);

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID} .homeHeaderPreview{
        border:1px solid var(--line);
        background:#fff;
        border-radius:18px;
        padding:18px;
        text-align:center;
        margin:10px 0 14px;
      }
      #${CARD_ID} .homeHeaderPreview img{
        display:block;
        width:auto;
        max-width:160px;
        max-height:74px;
        object-fit:contain;
        margin:0 auto;
      }
      #${CARD_ID} .homeHeaderPreview .emptyLogo{
        color:var(--muted);
        font-size:12px;
        padding:10px 0;
      }
      #${CARD_ID} .homeHeaderActions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:9px;
        margin-top:10px;
      }
      #${CARD_ID} .homeHeaderStatus{
        display:block;
        margin-top:10px;
        color:var(--muted);
        font-size:12px;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureClient(){
    if(client) return client;
    if(!window.supabase?.createClient || !CONFIG.supabaseUrl || !CONFIG.supabaseKey) return null;
    client = window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);
    return client;
  }

  function mountCard(){
    if(document.getElementById(CARD_ID)) return;
    const panel = document.querySelector('.adminPanel[data-panel="store"]');
    if(!panel) return;

    const cards = panel.querySelectorAll('.formCard.card');
    const anchor = cards[0] || panel.querySelector('.cloudStatus');

    const card = document.createElement('div');
    card.id = CARD_ID;
    card.className = 'formCard card';
    card.innerHTML = `
      <h3>손님 화면 상단</h3>
      <small class="formNote">큰 이미지 영역 없이 로고 · WELCOME · 상호 · 한줄 소개 · 예약/전화 버튼으로 표시됩니다.</small>

      <label class="field">
        <span>WELCOME 문구</span>
        <input id="homeWelcomeInput" maxlength="40" placeholder="WELCOME">
      </label>

      <div class="homeHeaderPreview" id="homeHeaderPreview">
        <div class="emptyLogo">등록된 로고가 없습니다.</div>
      </div>

      <label class="field">
        <span>상단 로고</span>
        <input id="homeLogoFile" type="file" accept="image/*">
      </label>

      <small class="formNote">상호와 한줄 소개는 바로 위 ‘매장 기본정보’의 상호 / 메인 문구와 자동으로 연결됩니다.</small>

      <div class="homeHeaderActions">
        <button id="saveHomeHeader" class="primary">문구 저장</button>
        <button id="removeHomeLogo" class="secondary">로고 삭제</button>
      </div>
      <small id="homeHeaderStatus" class="homeHeaderStatus"></small>
    `;

    if(anchor?.nextSibling){
      anchor.parentNode.insertBefore(card,anchor.nextSibling);
    }else{
      panel.appendChild(card);
    }

    bind();
  }

  function status(text){
    const el = q('#homeHeaderStatus');
    if(el) el.textContent = text || '';
  }

  function renderLogo(){
    const box = q('#homeHeaderPreview');
    if(!box) return;
    if(currentLogoUrl){
      box.innerHTML = `<img src="${currentLogoUrl}" alt="현재 상단 로고">`;
    }else{
      box.innerHTML = '<div class="emptyLogo">등록된 로고가 없습니다.</div>';
    }
  }

  async function load(){
    const sb = ensureClient();
    if(!sb) return;

    status('불러오는 중...');
    const {data,error} = await sb.rpc('public_store_payload',{p_slug:CONFIG.storeSlug});
    if(error){
      status('불러오기 실패');
      console.error('[admin home header]',error);
      return;
    }

    const store = data?.store || {};
    storeId = store.id || null;
    currentLogoUrl = store.home_logo_url || '';
    const welcome = q('#homeWelcomeInput');
    if(welcome) welcome.value = store.home_welcome_label || 'WELCOME';
    renderLogo();
    status('');
  }

  async function saveWelcome(){
    const sb = ensureClient();
    if(!sb || !storeId) return;

    const value = (q('#homeWelcomeInput')?.value || '').trim() || 'WELCOME';
    status('저장 중...');
    const {error} = await sb.from('stores')
      .update({home_welcome_label:value})
      .eq('id',storeId);

    if(error){
      alert(error.message);
      status('저장 실패');
      return;
    }
    status('저장 완료 ✓');
  }

  async function uploadLogo(file){
    const sb = ensureClient();
    if(!sb || !storeId || !file) return;

    if(file.size > 8*1024*1024){
      alert('8MB 이하 이미지 파일을 사용해주세요.');
      return;
    }

    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${storeId}/home-logo-${Date.now()}.${ext}`;

    status('로고 업로드 중...');
    const {error:upErr} = await sb.storage
      .from('store-media')
      .upload(path,file,{upsert:false,contentType:file.type || undefined});

    if(upErr){
      alert(upErr.message);
      status('업로드 실패');
      return;
    }

    const {data:urlData} = sb.storage.from('store-media').getPublicUrl(path);
    const url = urlData?.publicUrl || '';

    const {error} = await sb.from('stores')
      .update({home_logo_url:url})
      .eq('id',storeId);

    if(error){
      alert(error.message);
      status('저장 실패');
      return;
    }

    currentLogoUrl = url;
    renderLogo();
    status('로고 저장 완료 ✓');
  }

  async function removeLogo(){
    const sb = ensureClient();
    if(!sb || !storeId) return;
    if(!confirm('손님 화면 상단 로고를 삭제할까요?')) return;

    status('삭제 중...');
    const {error} = await sb.from('stores')
      .update({home_logo_url:''})
      .eq('id',storeId);

    if(error){
      alert(error.message);
      status('삭제 실패');
      return;
    }

    currentLogoUrl = '';
    renderLogo();
    status('로고 삭제 완료 ✓');
  }

  function bind(){
    const save = q('#saveHomeHeader');
    const file = q('#homeLogoFile');
    const remove = q('#removeHomeLogo');

    if(save) save.onclick = saveWelcome;
    if(file) file.onchange = e => uploadLogo(e.target.files?.[0]);
    if(remove) remove.onclick = removeLogo;
  }

  async function init(){
    addStyles();
    mountCard();

    // admin.js가 로그인 후 관리자 화면을 여는 시간을 고려해 카드와 데이터를 다시 확인한다.
    let tries = 0;
    const timer = setInterval(async()=>{
      tries++;
      mountCard();

      if(!q('#adminApp')?.classList.contains('hidden')){
        clearInterval(timer);
        await load();
      }else if(tries >= 40){
        clearInterval(timer);
      }
    },250);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
