/* Smart Store - customer intro runtime v3: advanced text effects */
(() => {
  const CONFIG = window.SMART_STORE_CONFIG || {};
  const CACHE_KEY = `smartStoreCloudCacheV1:${encodeURIComponent(CONFIG.storeSlug||'default')}`;
 const INTRO_SEEN_KEY = `introSeen:${encodeURIComponent(CONFIG.storeSlug||'default')}`;
  const READY_CLASS = 'ss-app-ready';
  const ANIMATIONS = [
    'none','fade','fade-in-out','slide-left','slide-right','slide-up','zoom',
    'smoke-out','ink-bleed','water-flow'
  ];

  const DEFAULT_CONFIG = {
    image:{fit:'contain',x:0,y:0,zoom:1},
    logo:{enabled:false,x:50,y:18,width:34},
    texts:[
      {text:'',x:50,y:62,size:18,color:'#ffffff',align:'center',animation:'fade',delay:0.2,duration:1.2,intensity:60},
      {text:'',x:50,y:70,size:36,color:'#ffffff',align:'center',animation:'fade-in-out',delay:0.4,duration:1.8,intensity:60},
      {text:'',x:50,y:78,size:16,color:'#ffffff',align:'center',animation:'slide-up',delay:0.7,duration:1.2,intensity:60}
    ],
    displaySeconds:4,
    showSkip:true
  };

  const clone = v => JSON.parse(JSON.stringify(v));
  const clamp = (n,min,max) => Math.min(max,Math.max(min,Number(n)||0));

  let closeTimer = null;
  let failSafeTimer = null;

  function markAppReady(){
    document.documentElement.classList.add(READY_CLASS);
    if(failSafeTimer){
      clearTimeout(failSafeTimer);
      failSafeTimer = null;
    }
  }

  function mergeConfig(raw){
    const next = clone(DEFAULT_CONFIG);
    if(raw && typeof raw === 'object'){
      if(raw.image && typeof raw.image === 'object') next.image = {...next.image,...raw.image};
      if(raw.logo && typeof raw.logo === 'object') next.logo = {...next.logo,...raw.logo};
      if(Array.isArray(raw.texts)) next.texts = next.texts.map((x,i)=>({...x,...(raw.texts[i]||{})}));
      if(raw.displaySeconds != null) next.displaySeconds = raw.displaySeconds;
      if(raw.showSkip != null) next.showSkip = raw.showSkip;
    }

    next.image.fit = next.image.fit === 'cover' ? 'cover' : 'contain';
    next.image.x = clamp(next.image.x,-150,150);
    next.image.y = clamp(next.image.y,-150,150);
    next.image.zoom = clamp(next.image.zoom,0.5,4) || 1;

    next.logo.x = clamp(next.logo.x,0,100);
    next.logo.y = clamp(next.logo.y,0,100);
    next.logo.width = clamp(next.logo.width,8,80) || 34;
    next.logo.enabled = !!next.logo.enabled;

    next.texts = next.texts.map(t=>({
      text:String(t.text||''),
      x:clamp(t.x,0,100),
      y:clamp(t.y,0,100),
      size:clamp(t.size,10,72)||18,
      color:/^#[0-9a-f]{6}$/i.test(String(t.color||'')) ? String(t.color) : '#ffffff',
      align:['left','center','right'].includes(t.align) ? t.align : 'center',
      animation:ANIMATIONS.includes(t.animation) ? t.animation : 'fade',
      delay:clamp(t.delay,0,5),
      duration:clamp(t.duration,0.4,5)||1.2,
      intensity:clamp(t.intensity??60,0,100)
    }));

    next.displaySeconds = [3,4,5,6,8].includes(Number(next.displaySeconds))
      ? Number(next.displaySeconds) : 4;
    next.showSkip = next.showSkip !== false;
    return next;
  }

  function addStyles(){
    if(document.getElementById('customerIntroRuntimeStyle')) return;

    const style = document.createElement('style');
    style.id = 'customerIntroRuntimeStyle';
    style.textContent = `
      #intro{position:fixed!important;inset:0!important;overflow:hidden!important;background:#211c1a!important}
      #intro .introShade,#intro .introCopy,#intro #introVideo{display:none!important}

      #intro #introImage{
        display:none;
        position:absolute!important;
        left:50%!important;
        top:50%!important;
        max-width:none!important;
        max-height:none!important;
        width:auto;
        height:auto;
        object-fit:unset!important;
        transform-origin:50% 50%!important;
        z-index:1!important;
      }

      #introDynamicLayers{position:absolute;inset:0;z-index:3;pointer-events:none}

      #introDynamicLayers .customerIntroLogo{
        position:absolute;
        transform:translate(-50%,-50%);
        height:auto;
        max-width:none;
        z-index:3;
      }

      #introDynamicLayers .customerIntroText{
        position:absolute;
        transform:translate(-50%,-50%);
        white-space:pre-wrap;
        line-height:1.15;
        font-weight:800;
        text-shadow:0 2px 10px rgba(0,0,0,.28);
        max-width:90%;
        padding:4px;
        z-index:4;
        will-change:transform,opacity,filter;
      }

      #intro #skipIntro{
        z-index:10!important;
        position:absolute!important;
      }

      @keyframes customerIntroFade{
        0%{opacity:0}
        100%{opacity:1}
      }

      @keyframes customerIntroFadeInOut{
        0%,100%{opacity:0}
        25%,75%{opacity:1}
      }

      @keyframes customerIntroSlideLeft{
        0%{opacity:0;transform:translate(-65%,-50%)}
        100%{opacity:1;transform:translate(-50%,-50%)}
      }

      @keyframes customerIntroSlideRight{
        0%{opacity:0;transform:translate(-35%,-50%)}
        100%{opacity:1;transform:translate(-50%,-50%)}
      }

      @keyframes customerIntroSlideUp{
        0%{opacity:0;transform:translate(-50%,-30%)}
        100%{opacity:1;transform:translate(-50%,-50%)}
      }

      @keyframes customerIntroZoom{
        0%{opacity:0;transform:translate(-50%,-50%) scale(.86)}
        100%{opacity:1;transform:translate(-50%,-50%) scale(1)}
      }

      @keyframes customerIntroSmokeOut{
        0%,35%{
          opacity:1;
          filter:blur(0);
          transform:translate(-50%,-50%) scale(1);
        }
        100%{
          opacity:0;
          filter:blur(var(--fx-blur));
          transform:translate(-50%,calc(-50% - var(--fx-move))) scale(var(--fx-scale));
        }
      }

      @keyframes customerIntroInkBleed{
        0%{
          opacity:0;
          filter:blur(var(--fx-blur));
          text-shadow:0 0 var(--fx-shadow) currentColor;
          transform:translate(-50%,-50%) scale(.92);
        }
        55%{
          opacity:1;
          filter:blur(1px);
          text-shadow:0 0 3px currentColor;
          transform:translate(-50%,-50%) scale(1.03);
        }
        100%{
          opacity:1;
          filter:blur(0);
          text-shadow:0 2px 10px rgba(0,0,0,.28);
          transform:translate(-50%,-50%) scale(1);
        }
      }

      @keyframes customerIntroWaterFlow{
        0%,35%{
          opacity:1;
          filter:blur(0);
          transform:translate(-50%,-50%) scaleY(1);
        }
        100%{
          opacity:0;
          filter:blur(var(--fx-blur));
          transform:translate(-50%,calc(-50% + var(--fx-move))) scaleY(var(--fx-stretch));
        }
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

  async function fetchStore(){
    const fallback = cachedStore();

    if(!window.supabase?.createClient ||
       !CONFIG.supabaseUrl ||
       !CONFIG.supabaseKey ||
       !CONFIG.storeSlug){
      return fallback;
    }

    try{
      const client = window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);
      const {data,error} = await client.rpc('public_store_payload',{p_slug:CONFIG.storeSlug});
      if(error) throw error;
      return data?.store || fallback;
    }catch(err){
      console.warn('[customer intro] fresh store fetch failed, using cache',err);
      return fallback;
    }
  }

  function closeCustomerIntro(){
    if(closeTimer){
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    try{ sessionStorage.setItem(INTRO_SEEN_KEY,'1'); }catch{}

    const intro = document.getElementById('intro');
    if(intro){
      intro.classList.add('hidden');
      intro.setAttribute('aria-hidden','true');
    }

    markAppReady();
  }

  function positionImage(img,container,imageCfg){
    if(!img.naturalWidth || !img.naturalHeight) return;

    const rect = container.getBoundingClientRect();
    if(!rect.width || !rect.height) return;

    const contain = Math.min(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const cover = Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const base = imageCfg.fit === 'cover' ? cover : contain;
    const scale = base * imageCfg.zoom;
    const ox = (imageCfg.x/100) * rect.width;
    const oy = (imageCfg.y/100) * rect.height;

    img.style.width = `${img.naturalWidth}px`;
    img.style.height = `${img.naturalHeight}px`;
    img.style.transform =
      `translate(-50%,-50%) translate3d(${ox}px,${oy}px,0) scale(${scale})`;
  }

  function setFxVars(el,t){
    const s = clamp(t.intensity??60,0,100)/100;
    el.style.setProperty('--fx-blur',`${(5+s*15).toFixed(1)}px`);
    el.style.setProperty('--fx-move',`${(10+s*34).toFixed(1)}px`);
    el.style.setProperty('--fx-scale',`${(1+s*0.18).toFixed(3)}`);
    el.style.setProperty('--fx-shadow',`${(5+s*24).toFixed(1)}px`);
    el.style.setProperty('--fx-stretch',`${(1+s*0.48).toFixed(3)}`);
  }

  async function customerSetupIntro(){
    const intro = document.getElementById('intro');

    if(!intro){
      markAppReady();
      return;
    }

    if(sessionStorage.getItem(INTRO_SEEN_KEY)){
      markAppReady();
      return;
    }

    const store = await fetchStore();
    const mode = store?.intro_mode || 'none';
    const media = store?.intro_media_url || '';

    if(mode !== 'image' || !media){
      markAppReady();
      return;
    }

    const cfg = mergeConfig(store?.intro_editor_config);
    const logoUrl = store?.intro_logo_url || '';

    addStyles();

    const legacyCopy = intro.querySelector('.introCopy');
    const legacyShade = intro.querySelector('.introShade');
    const video = document.getElementById('introVideo');

    if(legacyCopy) legacyCopy.style.display = 'none';
    if(legacyShade) legacyShade.style.display = 'none';

    if(video){
      try{video.pause();}catch{}
      video.style.display = 'none';
      video.removeAttribute('src');
    }

    let layers = document.getElementById('introDynamicLayers');
    if(!layers){
      layers = document.createElement('div');
      layers.id = 'introDynamicLayers';
      intro.appendChild(layers);
    }
    layers.innerHTML = '';

    const img = document.getElementById('introImage');
    if(img){
      img.style.display = 'block';
      img.onload = ()=>positionImage(img,intro,cfg.image);
      img.src = media;
      if(img.complete) positionImage(img,intro,cfg.image);
    }

    if(cfg.logo.enabled && logoUrl){
      const logo = document.createElement('img');
      logo.className = 'customerIntroLogo';
      logo.alt = '';
      logo.src = logoUrl;
      logo.style.left = `${cfg.logo.x}%`;
      logo.style.top = `${cfg.logo.y}%`;
      logo.style.width = `${cfg.logo.width}%`;
      layers.appendChild(logo);
    }

    const animationNames = {
      fade:'customerIntroFade',
      'fade-in-out':'customerIntroFadeInOut',
      'slide-left':'customerIntroSlideLeft',
      'slide-right':'customerIntroSlideRight',
      'slide-up':'customerIntroSlideUp',
      zoom:'customerIntroZoom',
      'smoke-out':'customerIntroSmokeOut',
      'ink-bleed':'customerIntroInkBleed',
      'water-flow':'customerIntroWaterFlow'
    };

    cfg.texts.forEach(t=>{
      if(!t.text) return;

      const el = document.createElement('div');
      el.className = 'customerIntroText';
      el.textContent = t.text;
      el.style.left = `${t.x}%`;
      el.style.top = `${t.y}%`;
      el.style.fontSize = `${t.size}px`;
      el.style.color = t.color;
      el.style.textAlign = t.align;

      setFxVars(el,t);

      if(t.animation !== 'none' && animationNames[t.animation]){
        el.style.animation =
          `${animationNames[t.animation]} ${t.duration}s ease ${t.delay}s both`;
      }

      layers.appendChild(el);
    });

    const skip = document.getElementById('skipIntro');
    if(skip){
      skip.style.display = cfg.showSkip ? '' : 'none';
      skip.onclick = closeCustomerIntro;
    }

    intro.classList.remove('hidden');
    intro.setAttribute('aria-hidden','false');

    if(closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(closeCustomerIntro,cfg.displaySeconds*1000);

    window.addEventListener('resize',()=>{
      if(img?.complete) positionImage(img,intro,cfg.image);
    });
  }

  // 홈 화면을 인트로 결정 전까지 숨기는 기존 V2 동작 유지.
  failSafeTimer = setTimeout(markAppReady,8000);

  window.setupIntro = customerSetupIntro;
  window.closeIntro = closeCustomerIntro;
})();
