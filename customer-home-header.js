/* Smart Store - customer compact home header v1 */
(() => {
  const CONFIG = window.SMART_STORE_CONFIG || {};
  const CACHE_KEY = 'smartStoreCloudCacheV1';
  const STYLE_ID = 'customerHomeHeaderStyle';

  function addStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .hero.compactHomeHero{
        overflow:visible;
        background:rgba(255,253,250,.94);
      }
      .hero.compactHomeHero .heroMedia{
        display:none!important;
      }
      .hero.compactHomeHero .heroBody{
        padding:26px 22px 22px;
        text-align:center;
      }
      .hero.compactHomeHero .homeLogoWrap{
        min-height:0;
        display:flex;
        align-items:center;
        justify-content:center;
        margin:0 auto 14px;
      }
      .hero.compactHomeHero .homeLogo{
        display:block;
        width:auto;
        max-width:168px;
        max-height:78px;
        object-fit:contain;
      }
      .hero.compactHomeHero .homeLogo.hiddenLogo{
        display:none;
      }
      .hero.compactHomeHero .heroBodyCopy{
        display:block;
      }
      .hero.compactHomeHero .heroBodyCopy .eyebrow{
        margin-bottom:7px;
        font-size:10px;
        letter-spacing:.2em;
      }
      .hero.compactHomeHero h1{
        font-size:31px;
        line-height:1.08;
      }
      .hero.compactHomeHero #storeTagline{
        margin-top:8px;
        line-height:1.45;
      }
      .hero.compactHomeHero .heroActions{
        margin-top:18px;
      }
      @media(max-width:380px){
        .hero.compactHomeHero .heroBody{padding:22px 18px 18px}
        .hero.compactHomeHero .homeLogo{max-width:146px;max-height:66px}
        .hero.compactHomeHero h1{font-size:28px}
      }
    `;
    document.head.appendChild(style);
  }

  function cachedStore(){
    try{
      return JSON.parse(localStorage.getItem(CACHE_KEY)||'null')?.store || null;
    }catch{
      return null;
    }
  }

  async function freshStore(){
    const fallback = cachedStore();
    if(!window.supabase?.createClient ||
       !CONFIG.supabaseUrl ||
       !CONFIG.supabaseKey ||
       !CONFIG.storeSlug){
      return fallback;
    }
    try{
      const client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
      const {data,error} = await client.rpc('public_store_payload',{p_slug:CONFIG.storeSlug});
      if(error) throw error;
      return data?.store || fallback;
    }catch(err){
      console.warn('[home header]',err);
      return fallback;
    }
  }

  function ensureLayout(){
    const hero = document.querySelector('.hero');
    const body = hero?.querySelector('.heroBody');
    if(!hero || !body) return null;

    hero.classList.add('compactHomeHero');

    let copy = body.querySelector('.heroBodyCopy');
    if(!copy){
      const first = [...body.children].find(x=>!x.classList.contains('heroActions'));
      if(first){
        first.classList.add('heroBodyCopy');
        copy = first;
      }
    }

    let welcome = copy?.querySelector('.eyebrow');
    if(welcome && !welcome.id) welcome.id = 'homeWelcomeLabel';

    let wrap = body.querySelector('.homeLogoWrap');
    if(!wrap){
      wrap = document.createElement('div');
      wrap.className = 'homeLogoWrap';
      wrap.innerHTML = '<img id="homeLogo" class="homeLogo hiddenLogo" alt="매장 로고">';
      body.insertBefore(wrap, copy || body.firstChild);
    }

    return {
      hero,
      body,
      copy,
      welcome: document.getElementById('homeWelcomeLabel') || welcome,
      logo: document.getElementById('homeLogo')
    };
  }

  function applyStore(store){
    const ui = ensureLayout();
    if(!ui || !store) return;

    if(ui.welcome){
      ui.welcome.textContent = String(store.home_welcome_label || 'WELCOME');
    }

    const name = document.getElementById('storeName');
    const tagline = document.getElementById('storeTagline');
    if(name && store.name) name.textContent = store.name;
    if(tagline && store.tagline != null) tagline.textContent = store.tagline || '';

    const logoUrl = String(store.home_logo_url || '');
    if(ui.logo){
      if(logoUrl){
        ui.logo.src = logoUrl;
        ui.logo.classList.remove('hiddenLogo');
      }else{
        ui.logo.removeAttribute('src');
        ui.logo.classList.add('hiddenLogo');
      }
    }
  }

  async function init(){
    addStyles();
    ensureLayout();

    const cached = cachedStore();
    if(cached) applyStore(cached);

    const store = await freshStore();
    if(store) applyStore(store);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
