/* Smart Store - admin intro photo + text effect editor v2 */
(() => {
  const STYLE_ID='adminIntroEditorStyle';
  const CARD_ID='adminIntroEditorCard';
  const PREVIEW_ID='adminIntroPreview';
  const CONFIG=window.SMART_STORE_CONFIG||{};
  const client=window.supabase?.createClient?.(CONFIG.supabaseUrl,CONFIG.supabaseKey);
  const STORE_SLUG=CONFIG.storeSlug||'';

  const DEFAULT_CONFIG={
    image:{fit:'contain',x:0,y:0,zoom:1},
    logo:{enabled:false,x:50,y:18,width:34},
    texts:[
      {text:'',x:50,y:62,size:18,color:'#ffffff',align:'center',animation:'fade',delay:0.2,duration:1.2},
      {text:'',x:50,y:70,size:36,color:'#ffffff',align:'center',animation:'fade-in-out',delay:0.4,duration:1.8},
      {text:'',x:50,y:78,size:16,color:'#ffffff',align:'center',animation:'slide-up',delay:0.7,duration:1.2}
    ],
    displaySeconds:4,
    showSkip:true
  };

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  const deepClone=v=>JSON.parse(JSON.stringify(v));

  let config=deepClone(DEFAULT_CONFIG);
  let imageUrl='';
  let logoUrl='';
  let imageObjectUrl='';
  let logoObjectUrl='';
  let selected='image';
  let touchState=null;
  let busy=false;
  let storeIdCache=null;
  let loadSeq=0;

  function withTimeout(promise,ms=12000,label='요청'){
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label} 시간이 초과되었습니다.`)),ms)})
    ]).finally(()=>clearTimeout(timer));
  }

  function mergeConfig(raw){
    const next=deepClone(DEFAULT_CONFIG);
    if(raw && typeof raw==='object'){
      if(raw.image && typeof raw.image==='object')next.image={...next.image,...raw.image};
      if(raw.logo && typeof raw.logo==='object')next.logo={...next.logo,...raw.logo};
      if(Array.isArray(raw.texts))next.texts=next.texts.map((x,i)=>({...x,...(raw.texts[i]||{})}));
      if(raw.displaySeconds!=null)next.displaySeconds=raw.displaySeconds;
      if(raw.showSkip!=null)next.showSkip=raw.showSkip;
    }
    next.image.fit=next.image.fit==='cover'?'cover':'contain';
    next.image.x=clamp(next.image.x,-150,150);
    next.image.y=clamp(next.image.y,-150,150);
    next.image.zoom=clamp(next.image.zoom,0.5,4)||1;
    next.logo.x=clamp(next.logo.x,0,100);
    next.logo.y=clamp(next.logo.y,0,100);
    next.logo.width=clamp(next.logo.width,8,80)||34;
    next.logo.enabled=!!next.logo.enabled;
    next.texts=next.texts.map(t=>({
      text:String(t.text||''),
      x:clamp(t.x,0,100),
      y:clamp(t.y,0,100),
      size:clamp(t.size,10,72)||18,
      color:/^#[0-9a-f]{6}$/i.test(String(t.color||''))?String(t.color):'#ffffff',
      align:['left','center','right'].includes(t.align)?t.align:'center',
      animation:['none','fade','fade-in-out','slide-left','slide-right','slide-up','zoom'].includes(t.animation)?t.animation:'fade',
      delay:clamp(t.delay,0,5),
      duration:clamp(t.duration,0.4,5)||1.2
    }));
    next.displaySeconds=[3,4,5,6,8].includes(Number(next.displaySeconds))?Number(next.displaySeconds):4;
    next.showSkip=next.showSkip!==false;
    return next;
  }

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${CARD_ID}{margin-top:14px}
      .introEditorHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
      .introEditorHead h3{margin:0 0 4px}.introEditorHead p{margin:0;color:#8e817b;font-size:12px;line-height:1.5}
      .introEditorMode{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 14px}
      .introEditorMode button,.introEditorTools button,.introLayerSelect button,.introTextAlign button{border:1px solid #eadfda;background:#fff;color:#6d4f4c;border-radius:14px;padding:11px 9px;font-weight:800}
      .introEditorMode button.active,.introEditorTools button.active,.introLayerSelect button.active,.introTextAlign button.active{background:#6d4f4c;color:#fff;border-color:#6d4f4c}
      .introPreviewWrap{display:flex;justify-content:center;margin:10px 0 12px}
      #${PREVIEW_ID}{width:min(100%,300px);aspect-ratio:9/16;position:relative;overflow:hidden;border-radius:24px;background:#211c1a;border:1px solid #d9ccc6;touch-action:none;user-select:none;box-shadow:0 10px 28px rgba(48,34,31,.12)}
      .introPreviewImage{position:absolute;left:50%;top:50%;max-width:none;max-height:none;width:auto;height:auto;pointer-events:none;will-change:transform}
      .introPreviewLogo{position:absolute;transform:translate(-50%,-50%);height:auto;max-width:none;z-index:3;touch-action:none;user-select:none}
      .introPreviewText{position:absolute;transform:translate(-50%,-50%);z-index:4;white-space:pre-wrap;line-height:1.15;font-weight:800;text-shadow:0 2px 10px rgba(0,0,0,.28);touch-action:none;user-select:none;max-width:90%;padding:4px}
      .introPreviewLogo.selected,.introPreviewText.selected{outline:2px solid rgba(255,255,255,.95);outline-offset:4px;border-radius:6px}
      .introPreviewSkip{position:absolute;right:10px;top:10px;z-index:6;border:1px solid rgba(255,255,255,.55);color:#fff;background:rgba(0,0,0,.22);padding:7px 10px;border-radius:999px;font-size:10px}
      .introPreviewEmpty{position:absolute;inset:0;display:grid;place-items:center;color:#bfb2ac;font-size:12px;text-align:center;padding:20px}
      .introEditorHelp{text-align:center;color:#8e817b;font-size:12px;line-height:1.5;margin:4px 0 12px}
      .introEditorTools{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:9px 0}
      .introZoomTools{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:8px 0 14px}.introZoomValue{text-align:center;min-width:70px;font-weight:900;color:#6d4f4c;font-size:13px}
      .introLayerSelect{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:15px 0 10px;overflow:auto}.introLayerSelect button{font-size:11px;padding:10px 4px;white-space:nowrap}
      .introPanel{display:none;border-top:1px solid #eadfda;padding-top:12px}.introPanel.active{display:block}
      .introTextAlign{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
      .introRangeRow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;margin:9px 0}.introRangeRow input[type="range"]{width:100%}.introRangeValue{min-width:54px;text-align:right;color:#6d4f4c;font-weight:900;font-size:12px}
      .introEditorToggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0}.introEditorToggle input{width:23px;height:23px;accent-color:#6d4f4c}
      .introEditorActions{display:grid;grid-template-columns:.8fr 1.2fr;gap:9px;margin-top:16px}
      .introEditorFileNote{color:#8e817b;font-size:11px;line-height:1.45;margin-top:-3px}
      .introEditorStatus{min-height:18px;color:#8e817b;font-size:12px;margin-top:8px;font-weight:700}
      .introEditorStatus.error{color:#a94f4f}.introEditorStatus.ok{color:#4f8061}
      .introEditorPlay{width:100%;margin-top:8px}
      @keyframes introFade{0%{opacity:0}100%{opacity:1}}
      @keyframes introFadeInOut{0%,100%{opacity:0}25%,75%{opacity:1}}
      @keyframes introSlideLeft{0%{opacity:0;transform:translate(-65%,-50%)}100%{opacity:1;transform:translate(-50%,-50%)}}
      @keyframes introSlideRight{0%{opacity:0;transform:translate(-35%,-50%)}100%{opacity:1;transform:translate(-50%,-50%)}}
      @keyframes introSlideUp{0%{opacity:0;transform:translate(-50%,-30%)}100%{opacity:1;transform:translate(-50%,-50%)}}
      @keyframes introZoom{0%{opacity:0;transform:translate(-50%,-50%) scale(.86)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      @media(max-width:390px){#${PREVIEW_ID}{width:min(100%,270px)}.introLayerSelect{grid-template-columns:repeat(5,minmax(58px,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function editorMarkup(){
    return `
      <div class="introEditorHead">
        <div><h3>인트로 편집</h3><p>사진과 로고, 글씨 효과를 실제 손님 화면 비율로 맞춥니다.</p></div>
        <button id="introEditorSave" class="primary mini" type="button">저장</button>
      </div>
      <div class="introEditorMode">
        <button id="introEditorOff" type="button">사용 안 함</button>
        <button id="introEditorOn" type="button">사진 인트로</button>
      </div>
      <div class="introPreviewWrap"><div id="${PREVIEW_ID}"></div></div>
      <p class="introEditorHelp">미리보기 요소를 누른 뒤 손가락으로 이동하세요. 사진 선택 시 두 손가락 확대/축소가 됩니다.</p>
      <button id="introEditorPlay" class="secondary introEditorPlay" type="button">▶ 글씨 효과 미리보기</button>
      <div class="introLayerSelect">
        <button type="button" data-intro-select="image">사진</button>
        <button type="button" data-intro-select="logo">로고</button>
        <button type="button" data-intro-select="text0">글씨 1</button>
        <button type="button" data-intro-select="text1">글씨 2</button>
        <button type="button" data-intro-select="text2">글씨 3</button>
      </div>

      <div id="introPanelImage" class="introPanel">
        <label class="field"><span>인트로 사진</span><input id="introEditorImageFile" type="file" accept="image/*" /></label>
        <p class="introEditorFileNote">사진만 사용합니다. 최대 2MB.</p>
        <div class="introEditorTools"><button id="introFitContain" type="button">전체 보기</button><button id="introFitCover" type="button">화면 채우기</button></div>
        <div class="introZoomTools"><button id="introZoomOut" type="button">− 축소</button><span id="introZoomValue" class="introZoomValue">100%</span><button id="introZoomIn" type="button">＋ 확대</button></div>
        <button id="introImageReset" class="secondary full" type="button">사진 위치 초기화</button>
      </div>

      <div id="introPanelLogo" class="introPanel">
        <label class="field"><span>로고 이미지</span><input id="introEditorLogoFile" type="file" accept="image/*" /></label>
        <p class="introEditorFileNote">투명 PNG 권장 · 최대 2MB.</p>
        <label class="introEditorToggle"><span><b>로고 표시</b></span><input id="introLogoEnabled" type="checkbox" /></label>
        <div class="introRangeRow"><input id="introLogoWidth" type="range" min="8" max="80" step="1"><span id="introLogoWidthValue" class="introRangeValue"></span></div>
        <button id="introLogoReset" class="secondary full" type="button">로고 위치 초기화</button>
      </div>

      ${[0,1,2].map(i=>`
        <div id="introPanelText${i}" class="introPanel">
          <label class="field"><span>글씨 ${i+1}</span><input id="introText${i}" maxlength="80" placeholder="표시할 문구 입력" /></label>
          <label class="field"><span>글씨 색상</span><input id="introTextColor${i}" type="color" /></label>
          <div class="introRangeRow"><input id="introTextSize${i}" type="range" min="10" max="72" step="1"><span id="introTextSizeValue${i}" class="introRangeValue"></span></div>
          <div class="field"><span>정렬</span><div id="introTextAlign${i}" class="introTextAlign"><button data-align="left" type="button">왼쪽</button><button data-align="center" type="button">가운데</button><button data-align="right" type="button">오른쪽</button></div></div>
          <label class="field"><span>등장 효과</span><select id="introTextAnimation${i}"><option value="none">효과 없음</option><option value="fade">페이드 인</option><option value="fade-in-out">페이드 인 → 아웃</option><option value="slide-left">왼쪽에서 살짝</option><option value="slide-right">오른쪽에서 살짝</option><option value="slide-up">아래에서 위로</option><option value="zoom">살짝 확대</option></select></label>
          <div class="introRangeRow"><input id="introTextDelay${i}" type="range" min="0" max="5" step="0.1"><span id="introTextDelayValue${i}" class="introRangeValue"></span></div>
          <div class="introRangeRow"><input id="introTextDuration${i}" type="range" min="0.4" max="5" step="0.1"><span id="introTextDurationValue${i}" class="introRangeValue"></span></div>
          <button id="introTextReset${i}" class="secondary full" type="button">글씨 위치 초기화</button>
        </div>`).join('')}

      <div class="field"><span>인트로 표시시간</span><select id="introDisplaySeconds"><option value="3">3초</option><option value="4">4초</option><option value="5">5초</option><option value="6">6초</option><option value="8">8초</option></select></div>
      <label class="introEditorToggle"><span><b>건너뛰기 버튼 표시</b></span><input id="introShowSkip" type="checkbox" /></label>
      <div class="introEditorActions"><button id="introEditorReload" class="secondary" type="button">되돌리기</button><button id="introEditorSaveBottom" class="primary" type="button">저장</button></div>
      <p id="introEditorStatus" class="introEditorStatus"></p>
    `;
  }

  function setStatus(text='',kind=''){
    const el=q('#introEditorStatus');
    if(!el)return;
    el.textContent=text;
    el.classList.toggle('error',kind==='error');
    el.classList.toggle('ok',kind==='ok');
  }

  function installUi(){
    addStyles();
    if(document.getElementById(CARD_ID))return true;
    const legacy=q('#introMode')?.closest('.formCard');
    if(!legacy)return false;
    legacy.style.display='none';
    const card=document.createElement('div');
    card.id=CARD_ID;
    card.className='formCard card';
    card.innerHTML=editorMarkup();
    legacy.insertAdjacentElement('afterend',card);
    bindUi();
    return true;
  }

  function setSelected(key){
    selected=key;
    qa('[data-intro-select]').forEach(b=>b.classList.toggle('active',b.dataset.introSelect===key));
    qa('.introPanel').forEach(p=>p.classList.remove('active'));
    const panel=key==='image'?q('#introPanelImage'):key==='logo'?q('#introPanelLogo'):q(`#introPanelText${Number(key.replace('text',''))}`);
    panel?.classList.add('active');
    renderPreview();
  }

  function bindUi(){
    q('#introEditorSave')?.addEventListener('click',save);
    q('#introEditorSaveBottom')?.addEventListener('click',save);
    q('#introEditorReload')?.addEventListener('click',load);
    q('#introEditorOff')?.addEventListener('click',()=>setMode(false));
    q('#introEditorOn')?.addEventListener('click',()=>setMode(true));
    q('#introEditorPlay')?.addEventListener('click',playAnimations);
    qa('[data-intro-select]').forEach(b=>b.addEventListener('click',()=>setSelected(b.dataset.introSelect)));
    q('#introEditorImageFile')?.addEventListener('change',previewImageFile);
    q('#introEditorLogoFile')?.addEventListener('change',previewLogoFile);
    q('#introFitContain')?.addEventListener('click',()=>{config.image={fit:'contain',x:0,y:0,zoom:1};syncControls();renderPreview();});
    q('#introFitCover')?.addEventListener('click',()=>{config.image={fit:'cover',x:0,y:0,zoom:1};syncControls();renderPreview();});
    q('#introZoomOut')?.addEventListener('click',()=>{config.image.zoom=clamp(config.image.zoom-0.1,0.5,4);syncControls();renderPreview();});
    q('#introZoomIn')?.addEventListener('click',()=>{config.image.zoom=clamp(config.image.zoom+0.1,0.5,4);syncControls();renderPreview();});
    q('#introImageReset')?.addEventListener('click',()=>{config.image.x=0;config.image.y=0;config.image.zoom=1;syncControls();renderPreview();});
    q('#introLogoEnabled')?.addEventListener('change',e=>{config.logo.enabled=e.target.checked;renderPreview();});
    q('#introLogoWidth')?.addEventListener('input',e=>{config.logo.width=Number(e.target.value);syncControls();renderPreview();});
    q('#introLogoReset')?.addEventListener('click',()=>{config.logo.x=50;config.logo.y=18;config.logo.width=34;syncControls();renderPreview();});
    q('#introDisplaySeconds')?.addEventListener('change',e=>config.displaySeconds=Number(e.target.value));
    q('#introShowSkip')?.addEventListener('change',e=>{config.showSkip=e.target.checked;renderPreview();});

    [0,1,2].forEach(i=>{
      q(`#introText${i}`)?.addEventListener('input',e=>{config.texts[i].text=e.target.value;renderPreview();});
      q(`#introTextColor${i}`)?.addEventListener('input',e=>{config.texts[i].color=e.target.value;renderPreview();});
      q(`#introTextSize${i}`)?.addEventListener('input',e=>{config.texts[i].size=Number(e.target.value);syncControls();renderPreview();});
      q(`#introTextAnimation${i}`)?.addEventListener('change',e=>config.texts[i].animation=e.target.value);
      q(`#introTextDelay${i}`)?.addEventListener('input',e=>{config.texts[i].delay=Number(e.target.value);syncControls();});
      q(`#introTextDuration${i}`)?.addEventListener('input',e=>{config.texts[i].duration=Number(e.target.value);syncControls();});
      q(`#introTextAlign${i}`)?.addEventListener('click',e=>{const b=e.target.closest('[data-align]');if(!b)return;config.texts[i].align=b.dataset.align;syncControls();renderPreview();});
      q(`#introTextReset${i}`)?.addEventListener('click',()=>{const d=DEFAULT_CONFIG.texts[i];config.texts[i].x=d.x;config.texts[i].y=d.y;syncControls();renderPreview();});
    });

    installGestures();
    setSelected('image');
  }

  async function ensureClient(){
    if(!client)throw new Error('Supabase 연결 정보를 찾을 수 없습니다.');
    const {data,error}=await withTimeout(client.auth.getSession(),8000,'로그인 확인');
    if(error)throw error;
    if(!data?.session)throw new Error('관리자 로그인이 만료되었습니다. 다시 로그인해주세요.');
  }

  async function getStoreId(force=false){
    if(storeIdCache && !force)return storeIdCache;
    if(!STORE_SLUG)throw new Error('매장 slug 설정을 찾을 수 없습니다.');
    const {data,error}=await withTimeout(client.rpc('public_store_payload',{p_slug:STORE_SLUG}),10000,'매장 확인');
    if(error)throw error;
    const id=data?.store?.id;
    if(!id)throw new Error('매장을 찾을 수 없습니다.');
    storeIdCache=id;
    return id;
  }

  async function load(){
    const seq=++loadSeq;
    setStatus('인트로 설정 불러오는 중...');
    try{
      await ensureClient();
      const id=await getStoreId();
      const {data:row,error}=await withTimeout(
        client.from('stores').select('intro_mode,intro_media_url,intro_logo_url,intro_editor_config').eq('id',id).single(),
        10000,'인트로 불러오기'
      );
      if(error)throw error;
      if(seq!==loadSeq)return;
      imageUrl=row?.intro_media_url||'';
      logoUrl=row?.intro_logo_url||'';
      config=mergeConfig(row?.intro_editor_config);
      q('#introEditorCard').dataset.enabled=row?.intro_mode==='image'?'1':'0';
      clearObjectFiles();
      syncControls();
      renderPreview();
      setStatus('불러오기 완료 ✓','ok');
      setTimeout(()=>{if(seq===loadSeq)setStatus('');},1000);
    }catch(err){
      console.error('[intro editor load]',err);
      setStatus(err?.message||'불러오기 실패','error');
    }
  }

  function setMode(enabled){
    const card=q('#introEditorCard');
    if(card)card.dataset.enabled=enabled?'1':'0';
    syncControls();
  }

  function syncControls(){
    const enabled=q('#introEditorCard')?.dataset.enabled==='1';
    q('#introEditorOn')?.classList.toggle('active',enabled);
    q('#introEditorOff')?.classList.toggle('active',!enabled);
    q('#introFitContain')?.classList.toggle('active',config.image.fit==='contain');
    q('#introFitCover')?.classList.toggle('active',config.image.fit==='cover');
    if(q('#introZoomValue'))q('#introZoomValue').textContent=`${Math.round(config.image.zoom*100)}%`;
    if(q('#introLogoEnabled'))q('#introLogoEnabled').checked=config.logo.enabled;
    if(q('#introLogoWidth'))q('#introLogoWidth').value=String(config.logo.width);
    if(q('#introLogoWidthValue'))q('#introLogoWidthValue').textContent=`${Math.round(config.logo.width)}%`;
    if(q('#introDisplaySeconds'))q('#introDisplaySeconds').value=String(config.displaySeconds);
    if(q('#introShowSkip'))q('#introShowSkip').checked=config.showSkip;

    [0,1,2].forEach(i=>{
      const t=config.texts[i];
      if(q(`#introText${i}`))q(`#introText${i}`).value=t.text;
      if(q(`#introTextColor${i}`))q(`#introTextColor${i}`).value=t.color;
      if(q(`#introTextSize${i}`))q(`#introTextSize${i}`).value=String(t.size);
      if(q(`#introTextSizeValue${i}`))q(`#introTextSizeValue${i}`).textContent=`${Math.round(t.size)}px`;
      if(q(`#introTextAnimation${i}`))q(`#introTextAnimation${i}`).value=t.animation;
      if(q(`#introTextDelay${i}`))q(`#introTextDelay${i}`).value=String(t.delay);
      if(q(`#introTextDelayValue${i}`))q(`#introTextDelayValue${i}`).textContent=`${Number(t.delay).toFixed(1)}초 뒤`;
      if(q(`#introTextDuration${i}`))q(`#introTextDuration${i}`).value=String(t.duration);
      if(q(`#introTextDurationValue${i}`))q(`#introTextDurationValue${i}`).textContent=`${Number(t.duration).toFixed(1)}초`;
      qa(`#introTextAlign${i} [data-align]`).forEach(b=>b.classList.toggle('active',b.dataset.align===t.align));
    });
  }

  function imageSource(){return imageObjectUrl||imageUrl;}
  function logoSource(){return logoObjectUrl||logoUrl;}

  function renderPreview(){
    const preview=q('#'+PREVIEW_ID);
    if(!preview)return;
    preview.innerHTML='';

    const src=imageSource();
    if(src){
      const img=document.createElement('img');
      img.className='introPreviewImage';
      img.alt='';
      img.onload=()=>positionBackground(img,preview);
      img.src=src;
      preview.appendChild(img);
      if(img.complete)positionBackground(img,preview);
    }else{
      const empty=document.createElement('div');
      empty.className='introPreviewEmpty';
      empty.textContent='인트로 사진을 선택해주세요.';
      preview.appendChild(empty);
    }

    const lsrc=logoSource();
    if(config.logo.enabled && lsrc){
      const logo=document.createElement('img');
      logo.className='introPreviewLogo'+(selected==='logo'?' selected':'');
      logo.dataset.introOverlay='logo';
      logo.alt='';
      logo.src=lsrc;
      logo.style.left=`${config.logo.x}%`;
      logo.style.top=`${config.logo.y}%`;
      logo.style.width=`${config.logo.width}%`;
      preview.appendChild(logo);
    }

    config.texts.forEach((t,i)=>{
      if(!t.text)return;
      const el=document.createElement('div');
      el.className='introPreviewText'+(selected===`text${i}`?' selected':'');
      el.dataset.introOverlay=`text${i}`;
      el.textContent=t.text;
      el.style.left=`${t.x}%`;
      el.style.top=`${t.y}%`;
      el.style.fontSize=`${t.size}px`;
      el.style.color=t.color;
      el.style.textAlign=t.align;
      el.style.transform='translate(-50%,-50%)';
      preview.appendChild(el);
    });

    if(config.showSkip){
      const skip=document.createElement('div');
      skip.className='introPreviewSkip';
      skip.textContent='건너뛰기';
      preview.appendChild(skip);
    }
  }

  function positionBackground(img,preview){
    if(!img.naturalWidth||!img.naturalHeight)return;
    const rect=preview.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const contain=Math.min(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const cover=Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const base=config.image.fit==='cover'?cover:contain;
    const scale=base*config.image.zoom;
    const ox=(config.image.x/100)*rect.width;
    const oy=(config.image.y/100)*rect.height;
    img.style.width=`${img.naturalWidth}px`;
    img.style.height=`${img.naturalHeight}px`;
    img.style.transform=`translate(-50%,-50%) translate3d(${ox}px,${oy}px,0) scale(${scale})`;
    img.style.transformOrigin='50% 50%';
  }

  function playAnimations(){
    renderPreview();
    config.texts.forEach((t,i)=>{
      const el=q(`[data-intro-overlay="text${i}"]`);
      if(!el||t.animation==='none')return;
      const names={fade:'introFade','fade-in-out':'introFadeInOut','slide-left':'introSlideLeft','slide-right':'introSlideRight','slide-up':'introSlideUp',zoom:'introZoom'};
      el.style.animation='none';
      void el.offsetWidth;
      el.style.animation=`${names[t.animation]} ${t.duration}s ease ${t.delay}s both`;
    });
  }

  function distance(a,b){return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);}

  function installGestures(){
    const preview=q('#'+PREVIEW_ID);
    if(!preview||preview.dataset.ready==='1')return;
    preview.dataset.ready='1';

    preview.addEventListener('touchstart',e=>{
      const overlay=e.target.closest?.('[data-intro-overlay]');
      if(overlay){
        const key=overlay.dataset.introOverlay;
        setSelected(key);
        const point=e.touches[0];
        const base=key==='logo'?config.logo:config.texts[Number(key.replace('text',''))];
        touchState={mode:'overlay',key,x:point.clientX,y:point.clientY,baseX:base.x,baseY:base.y};
        e.preventDefault();
        return;
      }

      setSelected('image');
      if(!imageSource())return;
      if(e.touches.length>=2){
        touchState={mode:'pinch',distance:distance(e.touches[0],e.touches[1]),zoom:config.image.zoom};
      }else if(e.touches.length===1){
        touchState={mode:'image-drag',x:e.touches[0].clientX,y:e.touches[0].clientY,baseX:config.image.x,baseY:config.image.y};
      }
      e.preventDefault();
    },{passive:false});

    preview.addEventListener('touchmove',e=>{
      if(!touchState)return;
      const rect=preview.getBoundingClientRect();

      if(touchState.mode==='overlay'&&e.touches.length){
        const target=touchState.key==='logo'?config.logo:config.texts[Number(touchState.key.replace('text',''))];
        target.x=clamp(touchState.baseX+((e.touches[0].clientX-touchState.x)/rect.width)*100,0,100);
        target.y=clamp(touchState.baseY+((e.touches[0].clientY-touchState.y)/rect.height)*100,0,100);
        renderPreview();
        e.preventDefault();
        return;
      }

      if(e.touches.length>=2){
        if(touchState.mode!=='pinch')touchState={mode:'pinch',distance:distance(e.touches[0],e.touches[1]),zoom:config.image.zoom};
        const d=distance(e.touches[0],e.touches[1]);
        if(touchState.distance>0)config.image.zoom=clamp(touchState.zoom*(d/touchState.distance),0.5,4);
        syncControls();
        renderPreview();
        e.preventDefault();
        return;
      }

      if(e.touches.length===1){
        if(touchState.mode!=='image-drag')touchState={mode:'image-drag',x:e.touches[0].clientX,y:e.touches[0].clientY,baseX:config.image.x,baseY:config.image.y};
        config.image.x=clamp(touchState.baseX+((e.touches[0].clientX-touchState.x)/rect.width)*100,-150,150);
        config.image.y=clamp(touchState.baseY+((e.touches[0].clientY-touchState.y)/rect.height)*100,-150,150);
        renderPreview();
        e.preventDefault();
      }
    },{passive:false});

    const end=()=>{touchState=null;};
    preview.addEventListener('touchend',end);
    preview.addEventListener('touchcancel',end);
    window.addEventListener('resize',renderPreview);
  }

  function previewImageFile(){
    const f=q('#introEditorImageFile')?.files?.[0];
    if(!f)return;
    if(f.size>2*1024*1024){alert('인트로 사진은 2MB 이하로 사용해주세요.');q('#introEditorImageFile').value='';return;}
    if(!f.type.startsWith('image/')){alert('사진 파일만 사용할 수 있습니다.');return;}
    if(imageObjectUrl)URL.revokeObjectURL(imageObjectUrl);
    imageObjectUrl=URL.createObjectURL(f);
    config.image={fit:'contain',x:0,y:0,zoom:1};
    setMode(true);
    syncControls();
    renderPreview();
  }

  function previewLogoFile(){
    const f=q('#introEditorLogoFile')?.files?.[0];
    if(!f)return;
    if(f.size>2*1024*1024){alert('로고 이미지는 2MB 이하로 사용해주세요.');q('#introEditorLogoFile').value='';return;}
    if(!f.type.startsWith('image/')){alert('사진 파일만 사용할 수 있습니다.');return;}
    if(logoObjectUrl)URL.revokeObjectURL(logoObjectUrl);
    logoObjectUrl=URL.createObjectURL(f);
    config.logo.enabled=true;
    syncControls();
    renderPreview();
  }

  async function upload(file,prefix){
    const id=await getStoreId();
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const uid=crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path=`${id}/${prefix}-${uid}.${ext}`;
    const {error}=await withTimeout(
      client.storage.from('store-media').upload(path,file,{upsert:false,contentType:file.type||undefined}),
      20000,'파일 업로드'
    );
    if(error)throw error;
    return {url:client.storage.from('store-media').getPublicUrl(path).data.publicUrl,path};
  }

  function storagePath(url=''){
    const marker='/storage/v1/object/public/store-media/';
    const idx=String(url).indexOf(marker);
    return idx<0?'':decodeURIComponent(String(url).slice(idx+marker.length));
  }

  async function removeByUrl(url=''){
    const p=storagePath(url);
    if(!p)return;
    await client.storage.from('store-media').remove([p]);
  }

  function setBusy(flag){
    busy=flag;
    qa('#introEditorSave,#introEditorSaveBottom').forEach(b=>{
      b.disabled=flag;
      b.textContent=flag?'저장 중...':'저장';
    });
  }

  async function save(){
    if(busy)return;
    setStatus('저장 준비 중...');
    setBusy(true);

    let uploadedImage=null;
    let uploadedLogo=null;
    try{
      await ensureClient();
      const id=await getStoreId();
      const enabled=q('#introEditorCard')?.dataset.enabled==='1';
      const imageFile=q('#introEditorImageFile')?.files?.[0]||null;
      const logoFile=q('#introEditorLogoFile')?.files?.[0]||null;

      if(enabled&&!imageFile&&!imageUrl)throw new Error('사진 인트로를 사용하려면 인트로 사진을 선택해주세요.');

      let nextImage=imageUrl;
      let nextLogo=logoUrl;
      setStatus('저장 중...');

      if(imageFile){
        uploadedImage=await upload(imageFile,'intro');
        nextImage=uploadedImage.url;
      }
      if(logoFile){
        uploadedLogo=await upload(logoFile,'intro-logo');
        nextLogo=uploadedLogo.url;
      }

      const payload={
        intro_mode:enabled?'image':'none',
        intro_media_url:nextImage||'',
        intro_logo_url:nextLogo||'',
        intro_editor_config:mergeConfig(config)
      };

      const {error}=await withTimeout(
        client.from('stores').update(payload).eq('id',id),
        12000,'설정 저장'
      );
      if(error)throw error;

      const oldImage=imageUrl;
      const oldLogo=logoUrl;
      imageUrl=nextImage;
      logoUrl=nextLogo;
      config=mergeConfig(config);

      q('#introEditorImageFile').value='';
      q('#introEditorLogoFile').value='';
      clearObjectUrlsOnly();

      if(uploadedImage && oldImage && oldImage!==imageUrl)removeByUrl(oldImage).catch(()=>{});
      if(uploadedLogo && oldLogo && oldLogo!==logoUrl)removeByUrl(oldLogo).catch(()=>{});

      syncControls();
      renderPreview();
      setStatus('저장 완료 ✓','ok');
      setTimeout(()=>setStatus(''),1600);
    }catch(err){
      console.error('[intro editor save]',err);
      if(uploadedImage?.url)removeByUrl(uploadedImage.url).catch(()=>{});
      if(uploadedLogo?.url)removeByUrl(uploadedLogo.url).catch(()=>{});
      setStatus(err?.message||'인트로 저장에 실패했습니다.','error');
      alert(err?.message||'인트로 저장에 실패했습니다.');
    }finally{
      setBusy(false);
    }
  }

  function clearObjectUrlsOnly(){
    if(imageObjectUrl){URL.revokeObjectURL(imageObjectUrl);imageObjectUrl='';}
    if(logoObjectUrl){URL.revokeObjectURL(logoObjectUrl);logoObjectUrl='';}
  }

  function clearObjectFiles(){
    clearObjectUrlsOnly();
    if(q('#introEditorImageFile'))q('#introEditorImageFile').value='';
    if(q('#introEditorLogoFile'))q('#introEditorLogoFile').value='';
  }

  async function install(){
    if(!client){
      console.error('[intro editor] Supabase client creation failed');
      return;
    }
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(installUi()){
        clearInterval(timer);
        load();
      }else if(tries>=80){
        clearInterval(timer);
      }
    },200);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();