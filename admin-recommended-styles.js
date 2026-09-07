/* Smart Store - admin recommended styles manager */
(() => {
  const STYLE_ID='adminRecommendedStylesStyle';
  const PANEL_NAME='recommended-styles';
  const PANEL_ID='adminRecommendedStylesPanel';
  const LIST_ID='adminRecommendedStyles';
  const MODAL_ID='recommendedStyleModal';

  let rows=[];
  let editingId=null;
  let editingImageUrl='';
  let busy=false;
  let previewObjectUrl='';
  let imageView={fit:'contain',x:0,y:0,zoom:1};
  let touchState=null;

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const escText=(v='')=>String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${PANEL_ID} .recommendedStyleIntro{margin:8px 0 14px;color:#8e817b;font-size:13px;line-height:1.5}
      .recommendedStyleRow{display:grid;grid-template-columns:82px 1fr auto;gap:13px;align-items:center}
      .recommendedStyleThumb{width:82px;height:82px;border-radius:16px;overflow:hidden;background:#efe3df;border:1px solid #eadfda}
      .recommendedStyleThumb img{width:100%;height:100%;object-fit:cover;display:block}
      .recommendedStyleRowMain{min-width:0}
      .recommendedStyleRowMain h3{margin:0 0 5px;font-size:15px}
      .recommendedStyleRowMain p{margin:2px 0;color:#8e817b;font-size:12px;line-height:1.45}
      .recommendedStyleBadge{display:inline-flex;align-items:center;margin-top:6px;padding:5px 8px;border-radius:999px;background:#f3ebe7;color:#6d4f4c;font-size:11px;font-weight:800}
      .recommendedStyleBadge.off{background:#eee;color:#8d8d8d}
      #${MODAL_ID}{z-index:100020}
      #${MODAL_ID} .recommendedStyleBox{width:min(94vw,470px);max-height:90vh;overflow:auto}
      .recommendedStylePreview{width:100%;aspect-ratio:5/3;height:auto;margin:12px 0 10px;border-radius:20px;overflow:hidden;border:1px solid #eadfda;background:#efe3df;display:grid;place-items:center;color:#fff;font-weight:900;position:relative;touch-action:none;user-select:none}
      .recommendedStylePreview img{position:absolute;left:50%;top:50%;width:auto;height:auto;max-width:none;max-height:none;display:block;pointer-events:none;will-change:transform}
      .recommendedStyleAdjustHelp{margin:0 0 10px;color:#8e817b;font-size:12px;line-height:1.45;text-align:center}
      .recommendedStyleFitButtons{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 9px}
      .recommendedStyleFitButtons button,.recommendedStyleZoomButtons button{border:1px solid #eadfda;background:#fff;color:#6d4f4c;border-radius:14px;padding:11px 8px;font-weight:800}
      .recommendedStyleFitButtons button.active{background:#6d4f4c;color:#fff;border-color:#6d4f4c}
      .recommendedStyleZoomButtons{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:0 0 14px}
      .recommendedStyleZoomValue{min-width:72px;text-align:center;color:#6d4f4c;font-size:13px;font-weight:900}
      .recommendedStyleToggle{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:13px 0;padding:14px 15px;border:1px solid #eadfda;border-radius:16px;background:#fff}
      .recommendedStyleToggle span{font-size:13px;font-weight:800}
      .recommendedStyleToggle input{width:23px;height:23px;accent-color:#6d4f4c}
      .recommendedStyleModalActions{display:grid;grid-template-columns:.8fr 1.2fr;gap:9px;margin-top:18px}
      .recommendedStyleDelete.hiddenButton{visibility:hidden}
      @media(max-width:520px){.recommendedStyleRow{grid-template-columns:72px 1fr auto}.recommendedStyleThumb{width:72px;height:72px}}
    `;
    document.head.appendChild(style);
  }

  function installUi(){
    addStyles();
    const tabs=q('.adminTabs');
    if(tabs && !tabs.querySelector(`[data-tab="${PANEL_NAME}"]`)){
      const btn=document.createElement('button');
      btn.type='button';
      btn.dataset.tab=PANEL_NAME;
      btn.textContent='추천스타일';
      const servicesTab=tabs.querySelector('[data-tab="services"]');
      if(servicesTab?.nextSibling)tabs.insertBefore(btn,servicesTab.nextSibling);
      else tabs.appendChild(btn);
      btn.addEventListener('click',async()=>{
        qa('.adminTabs button').forEach(x=>x.classList.toggle('active',x===btn));
        qa('.adminPanel').forEach(p=>p.classList.toggle('active',p.dataset.panel===PANEL_NAME));
        await loadRows();
      });
    }

    if(!document.getElementById(PANEL_ID)){
      const main=q('.adminShell main');
      if(main){
        const panel=document.createElement('section');
        panel.id=PANEL_ID;
        panel.className='adminPanel';
        panel.dataset.panel=PANEL_NAME;
        panel.innerHTML=`
          <div class="panelTitle">
            <div><p class="eyebrow">RECOMMENDED STYLES</p><h2>추천 스타일 관리</h2></div>
            <button id="addRecommendedStyle" class="primary mini" type="button">＋ 추가</button>
          </div>
          <p class="recommendedStyleIntro">손님 화면의 추천 스타일 사진과 문구를 관리합니다. 서비스와 연결하면 “이 스타일로 예약”을 눌렀을 때 해당 서비스가 자동 선택됩니다.</p>
          <div id="${LIST_ID}" class="adminList"></div>
        `;
        const staffPanel=main.querySelector('[data-panel="staff"]');
        if(staffPanel)main.insertBefore(panel,staffPanel); else main.appendChild(panel);
        q('#addRecommendedStyle')?.addEventListener('click',()=>openModal());
      }
    }
    ensureModal();
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID))return;
    const wrap=document.createElement('div');
    wrap.id=MODAL_ID;
    wrap.className='modalBackdrop hidden';
    wrap.innerHTML=`
      <section class="confirmBox recommendedStyleBox">
        <div class="sheetTop">
          <div><p class="eyebrow">RECOMMENDED STYLE</p><h3 id="recommendedStyleModalTitle">추천 스타일 추가</h3></div>
          <button id="recommendedStyleClose" class="iconBtn" type="button">✕</button>
        </div>
        <div id="recommendedStylePreview" class="recommendedStylePreview">사진 미리보기</div>
        <p class="recommendedStyleAdjustHelp">사진을 손가락으로 이동 · 두 손가락으로 확대/축소</p>
        <div class="recommendedStyleFitButtons">
          <button id="recommendedStyleFitContain" type="button">전체 보기</button>
          <button id="recommendedStyleFitCover" type="button">화면 채우기</button>
        </div>
        <div class="recommendedStyleZoomButtons">
          <button id="recommendedStyleZoomOut" type="button">− 축소</button>
          <span id="recommendedStyleZoomValue" class="recommendedStyleZoomValue">100%</span>
          <button id="recommendedStyleZoomIn" type="button">＋ 확대</button>
        </div>
        <label class="field"><span>스타일 사진</span><input id="recommendedStyleImage" type="file" accept="image/*" /></label>
        <label class="field"><span>스타일명</span><input id="recommendedStyleTitle" placeholder="예: Soft Pink" /></label>
        <label class="field"><span>설명</span><textarea id="recommendedStyleDescription" rows="3" placeholder="짧은 스타일 설명"></textarea></label>
        <label class="field"><span>연결 서비스</span><select id="recommendedStyleService"></select></label>
        <label class="field"><span>표시 가격 (선택)</span><input id="recommendedStylePrice" type="number" inputmode="numeric" min="0" placeholder="비워두면 연결 서비스 가격 사용" /></label>
        <label class="field"><span>표시 순서</span><input id="recommendedStyleOrder" type="number" inputmode="numeric" min="0" value="1" /></label>
        <label class="recommendedStyleToggle"><span>손님 화면에 표시</span><input id="recommendedStyleVisible" type="checkbox" checked /></label>
        <div class="recommendedStyleModalActions">
          <button id="recommendedStyleDelete" class="danger recommendedStyleDelete" type="button">삭제</button>
          <button id="recommendedStyleSave" class="primary" type="button">저장</button>
        </div>
      </section>`;
    document.body.appendChild(wrap);
    q('#recommendedStyleClose').addEventListener('click',closeModal);
    q('#recommendedStyleSave').addEventListener('click',saveCurrent);
    q('#recommendedStyleDelete').addEventListener('click',deleteCurrent);
    q('#recommendedStyleImage').addEventListener('change',previewFile);
    q('#recommendedStyleFitContain').addEventListener('click',()=>setFit('contain'));
    q('#recommendedStyleFitCover').addEventListener('click',()=>setFit('cover'));
    q('#recommendedStyleZoomOut').addEventListener('click',()=>setZoom(imageView.zoom-0.1));
    q('#recommendedStyleZoomIn').addEventListener('click',()=>setZoom(imageView.zoom+0.1));
    installPreviewGestures();
  }


  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

  function setFit(fit){
    imageView.fit=fit==='cover'?'cover':'contain';
    imageView.zoom=1;
    imageView.x=0;
    imageView.y=0;
    updatePreviewView();
  }

  function setZoom(value){
    imageView.zoom=clamp(Number(value)||1,0.5,4);
    updatePreviewView();
  }

  function updatePreviewView(){
    const preview=q('#recommendedStylePreview');
    const img=preview?.querySelector('img');

    q('#recommendedStyleFitContain')?.classList.toggle('active',imageView.fit==='contain');
    q('#recommendedStyleFitCover')?.classList.toggle('active',imageView.fit==='cover');

    const zoomText=q('#recommendedStyleZoomValue');
    if(zoomText)zoomText.textContent=`${Math.round(imageView.zoom*100)}%`;

    if(!img || !img.naturalWidth || !img.naturalHeight)return;

    const rect=preview.getBoundingClientRect();
    if(!rect.width || !rect.height)return;

    const containScale=Math.min(
      rect.width/img.naturalWidth,
      rect.height/img.naturalHeight
    );
    const coverScale=Math.max(
      rect.width/img.naturalWidth,
      rect.height/img.naturalHeight
    );
    const fitScale=imageView.fit==='cover'?coverScale:containScale;
    const actualScale=fitScale*imageView.zoom;

    const offsetX=(imageView.x/100)*rect.width;
    const offsetY=(imageView.y/100)*rect.height;

    img.style.width=`${img.naturalWidth}px`;
    img.style.height=`${img.naturalHeight}px`;
    img.style.transform=
      `translate(-50%,-50%) translate3d(${offsetX}px,${offsetY}px,0) scale(${actualScale})`;
    img.style.transformOrigin='50% 50%';
  }

  function showPreviewImage(url){
    const preview=q('#recommendedStylePreview');
    if(!preview)return;

    if(!url){
      preview.innerHTML='사진 미리보기';
      updatePreviewView();
      return;
    }

    const img=document.createElement('img');
    img.alt='';
    img.onload=updatePreviewView;
    img.src=url;
    preview.innerHTML='';
    preview.appendChild(img);

    if(img.complete)updatePreviewView();
  }

  function distance(a,b){
    return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  }

  function installPreviewGestures(){
    const preview=q('#recommendedStylePreview');
    if(!preview || preview.dataset.gestureReady==='1')return;
    preview.dataset.gestureReady='1';

    preview.addEventListener('touchstart',e=>{
      if(!preview.querySelector('img'))return;

      if(e.touches.length>=2){
        touchState={
          mode:'pinch',
          distance:distance(e.touches[0],e.touches[1]),
          zoom:imageView.zoom
        };
      }else if(e.touches.length===1){
        touchState={
          mode:'drag',
          x:e.touches[0].clientX,
          y:e.touches[0].clientY,
          baseX:imageView.x,
          baseY:imageView.y
        };
      }

      e.preventDefault();
    },{passive:false});

    preview.addEventListener('touchmove',e=>{
      if(!touchState || !preview.querySelector('img'))return;

      if(e.touches.length>=2){
        if(touchState.mode!=='pinch'){
          touchState={
            mode:'pinch',
            distance:distance(e.touches[0],e.touches[1]),
            zoom:imageView.zoom
          };
        }

        const d=distance(e.touches[0],e.touches[1]);
        if(touchState.distance>0){
          imageView.zoom=clamp(
            touchState.zoom*(d/touchState.distance),
            0.5,
            4
          );
          updatePreviewView();
        }

        e.preventDefault();
        return;
      }

      if(e.touches.length===1){
        if(touchState.mode!=='drag'){
          touchState={
            mode:'drag',
            x:e.touches[0].clientX,
            y:e.touches[0].clientY,
            baseX:imageView.x,
            baseY:imageView.y
          };
        }

        const rect=preview.getBoundingClientRect();
        const dx=e.touches[0].clientX-touchState.x;
        const dy=e.touches[0].clientY-touchState.y;

        imageView.x=clamp(
          touchState.baseX+(dx/Math.max(1,rect.width))*100,
          -150,
          150
        );
        imageView.y=clamp(
          touchState.baseY+(dy/Math.max(1,rect.height))*100,
          -150,
          150
        );

        updatePreviewView();
        e.preventDefault();
      }
    },{passive:false});

    const end=()=>{touchState=null;};
    preview.addEventListener('touchend',end,{passive:true});
    preview.addEventListener('touchcancel',end,{passive:true});

    window.addEventListener('resize',updatePreviewView);
  }

  async function waitForStore(){
    for(let i=0;i<40;i++){
      if(typeof storeId!=='undefined' && storeId)return storeId;
      await new Promise(r=>setTimeout(r,150));
    }
    return null;
  }

  function serviceOptions(selected=''){
    const services=(typeof data!=='undefined' && Array.isArray(data.services))?data.services:[];
    return `<option value="">연결 안 함</option>${services.map(s=>`<option value="${escText(s.id)}" ${s.id===selected?'selected':''}>${escText(s.name)} · ${Number(s.price||0).toLocaleString('ko-KR')}원</option>`).join('')}`;
  }

  function displayPrice(row){
    if(row.price!==null && row.price!==undefined && row.price!=='')return Number(row.price).toLocaleString('ko-KR')+'원';
    const svc=(typeof data!=='undefined' && Array.isArray(data.services))?data.services.find(s=>s.id===row.service_id):null;
    return svc?Number(svc.price||0).toLocaleString('ko-KR')+'원':'가격 미설정';
  }

  async function loadRows(){
    const id=await waitForStore();
    if(!id)return;
    const list=q('#'+LIST_ID);
    if(list)list.innerHTML='<p class="formNote">불러오는 중...</p>';
    const {data:result,error}=await sb.from('recommended_styles').select('*').eq('store_id',id).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
    if(error){if(list)list.innerHTML=`<p class="formNote">${escText(error.message)}</p>`;return}
    rows=result||[];
    renderRows();
  }

  function renderRows(){
    const list=q('#'+LIST_ID);
    if(!list)return;
    if(!rows.length){list.innerHTML='<div class="formCard card"><p class="formNote">등록된 추천 스타일이 없습니다. 위의 “＋ 추가”를 눌러 사진을 등록해주세요.</p></div>';return}
    const services=(typeof data!=='undefined' && Array.isArray(data.services))?data.services:[];
    list.innerHTML=rows.map(row=>{
      const svc=services.find(s=>s.id===row.service_id);
      return `<article class="adminItem recommendedStyleRow">
        <div class="recommendedStyleThumb">${row.image_url?`<img src="${escText(row.image_url)}" alt="" style="object-fit:${row.image_fit==='cover'?'cover':'contain'};object-position:${50+clamp(Number(row.image_position_x??0),-45,45)}% ${50+clamp(Number(row.image_position_y??0),-45,45)}%;transform:scale(${Number(row.image_zoom??1)});transform-origin:50% 50%">`:''}</div>
        <div class="recommendedStyleRowMain">
          <h3>${escText(row.title)}</h3>
          <p>${escText(row.description||'설명 없음')}</p>
          <p>${svc?`서비스 · ${escText(svc.name)} · `:''}${escText(displayPrice(row))}</p>
          <span class="recommendedStyleBadge ${row.visible?'':'off'}">${row.visible?'표시중':'숨김'} · 순서 ${Number(row.sort_order||0)}</span>
        </div>
        <button type="button" data-edit-recommended-style="${escText(row.id)}">편집</button>
      </article>`;
    }).join('');
    qa('[data-edit-recommended-style]').forEach(btn=>btn.addEventListener('click',()=>{
      const row=rows.find(x=>x.id===btn.dataset.editRecommendedStyle);
      if(row)openModal(row);
    }));
  }

  function openModal(row=null){
    editingId=row?.id||null;
    editingImageUrl=row?.image_url||'';
    q('#recommendedStyleModalTitle').textContent=row?'추천 스타일 편집':'추천 스타일 추가';
    q('#recommendedStyleTitle').value=row?.title||'';
    q('#recommendedStyleDescription').value=row?.description||'';
    q('#recommendedStyleService').innerHTML=serviceOptions(row?.service_id||'');
    q('#recommendedStylePrice').value=(row?.price===null||row?.price===undefined)?'':String(row.price);
    q('#recommendedStyleOrder').value=String(row?.sort_order??(rows.length+1));
    q('#recommendedStyleVisible').checked=row?.visible!==false;
    q('#recommendedStyleImage').value='';
    imageView={
      fit:row?.image_fit==='cover'?'cover':'contain',
      x:clamp(Number(row?.image_position_x??0),-150,150),
      y:clamp(Number(row?.image_position_y??0),-150,150),
      zoom:clamp(Number(row?.image_zoom??1),0.5,4)
    };
    showPreviewImage(editingImageUrl);
    q('#recommendedStyleDelete').classList.toggle('hiddenButton',!row);
    q('#'+MODAL_ID).classList.remove('hidden');
  }

  function closeModal(){
    if(busy)return;
    q('#'+MODAL_ID)?.classList.add('hidden');
    editingId=null;
    editingImageUrl='';
    if(previewObjectUrl){
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl='';
    }
  }

  function previewFile(){
    const file=q('#recommendedStyleImage').files?.[0];
    if(!file)return;
    if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl=URL.createObjectURL(file);
    imageView={fit:'contain',x:0,y:0,zoom:1};
    showPreviewImage(previewObjectUrl);
  }

  async function uploadImage(file){
    const id=await waitForStore();
    if(!id)throw new Error('매장 연결을 확인해주세요.');
    if(file.size>12*1024*1024)throw new Error('사진은 12MB 이하로 사용해주세요.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const uid=(crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);
    const path=`${id}/recommended-style-${uid}.${ext}`;
    const {error}=await sb.storage.from('store-media').upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(error)throw error;
    return sb.storage.from('store-media').getPublicUrl(path).data.publicUrl;
  }

  function storagePathFromUrl(url=''){
    const marker='/storage/v1/object/public/store-media/';
    const idx=String(url).indexOf(marker);
    if(idx<0)return '';
    return decodeURIComponent(String(url).slice(idx+marker.length));
  }

  async function removeImage(url=''){
    const path=storagePathFromUrl(url);
    if(!path)return;
    await sb.storage.from('store-media').remove([path]);
  }

  async function saveCurrent(){
    if(busy)return;
    const title=q('#recommendedStyleTitle').value.trim();
    if(!title){alert('스타일명을 입력해주세요.');return}
    const file=q('#recommendedStyleImage').files?.[0]||null;
    const serviceId=q('#recommendedStyleService').value||null;
    const priceRaw=q('#recommendedStylePrice').value.trim();
    const price=priceRaw===''?null:Math.max(0,Number(priceRaw||0));
    const sortOrder=Math.max(0,Number(q('#recommendedStyleOrder').value||0));
    busy=true;
    q('#recommendedStyleSave').disabled=true;
    q('#recommendedStyleSave').textContent='저장 중...';
    try{
      let imageUrl=editingImageUrl;
      if(file){
        const old=imageUrl;
        imageUrl=await uploadImage(file);
        if(old && old!==imageUrl)removeImage(old).catch(()=>{});
      }
      const payload={
        title,
        description:q('#recommendedStyleDescription').value.trim(),
        image_url:imageUrl||'',
        service_id:serviceId,
        price,
        visible:q('#recommendedStyleVisible').checked,
        sort_order:sortOrder,
        image_fit:imageView.fit,
        image_position_x:Number(imageView.x.toFixed(2)),
        image_position_y:Number(imageView.y.toFixed(2)),
        image_zoom:Number(imageView.zoom.toFixed(3)),
        updated_at:new Date().toISOString()
      };
      if(editingId){
        const {error}=await sb.from('recommended_styles').update(payload).eq('id',editingId);
        if(error)throw error;
      }else{
        const id=await waitForStore();
        if(!id)throw new Error('매장 연결을 확인해주세요.');
        const {error}=await sb.from('recommended_styles').insert({...payload,store_id:id});
        if(error)throw error;
      }
      q('#'+MODAL_ID).classList.add('hidden');
      editingId=null;
      editingImageUrl='';
      await loadRows();
    }catch(err){alert(err?.message||'추천 스타일 저장에 실패했습니다.');}
    finally{busy=false;q('#recommendedStyleSave').disabled=false;q('#recommendedStyleSave').textContent='저장';}
  }

  async function deleteCurrent(){
    if(!editingId || busy)return;
    const row=rows.find(x=>x.id===editingId);
    if(!row)return;
    if(!window.confirm(`“${row.title}” 추천 스타일을 삭제하시겠습니까?`))return;
    busy=true;
    try{
      const {error}=await sb.from('recommended_styles').delete().eq('id',editingId);
      if(error)throw error;
      if(row.image_url)removeImage(row.image_url).catch(()=>{});
      q('#'+MODAL_ID).classList.add('hidden');
      editingId=null;
      editingImageUrl='';
      await loadRows();
    }catch(err){alert(err?.message||'삭제에 실패했습니다.');}
    finally{busy=false;}
  }

  function install(){
    installUi();
    let tries=0;
    const timer=setInterval(()=>{installUi();tries+=1;if(tries>=30)clearInterval(timer);},500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
