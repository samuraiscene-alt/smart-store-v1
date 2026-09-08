/* Smart Store - customer recommended styles */
(() => {
  const STYLE_ID='customerRecommendedStylesStyle';
  const TRACK_ID='galleryTrack';
  const VIEWER_ID='recommendedStyleViewer';
  let viewerOpen=false;

  const q=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${TRACK_ID} .dynamicRecommendedStyle{
        position:relative;
        height:auto;
        aspect-ratio:5/3;
        overflow:hidden;
        background:#efe3df;
        padding:0;
      }
      #${TRACK_ID} .dynamicRecommendedStyle::after{
        content:"";
        position:absolute;
        inset:0;
        background:linear-gradient(180deg,rgba(0,0,0,.02) 30%,rgba(0,0,0,.58) 100%);
        pointer-events:none;
        z-index:2;
      }
      #${TRACK_ID} .dynamicRecommendedStyleImage{
        position:absolute;
        left:50%;
        top:50%;
        width:auto;
        height:auto;
        max-width:none;
        max-height:none;
        display:block;
        pointer-events:none;
        will-change:transform;
        z-index:1;
      }
      #${TRACK_ID} .dynamicRecommendedStyleContent{
        position:absolute;
        left:18px;
        right:18px;
        bottom:16px;
        z-index:3;
        display:grid;
        gap:5px;
        color:#fff;
      }
      #${TRACK_ID} .dynamicRecommendedStyleTitle{
        margin:0;
        font-size:21px;
        line-height:1.15;
        font-weight:900;
        color:#fff;
      }
      #${TRACK_ID} .dynamicRecommendedStyleDesc{
        margin:0;
        font-size:12px;
        line-height:1.4;
        color:rgba(255,255,255,.88);
        overflow:hidden;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
      }
      #${TRACK_ID} .dynamicRecommendedStyleMeta{
        margin:0 0 3px;
        font-size:12px;
        line-height:1.35;
        font-weight:800;
        color:#fff;
      }
      #${TRACK_ID} .dynamicRecommendedStyle button{
        justify-self:start;
        margin-top:5px;
        border:1px solid rgba(255,255,255,.72);
        background:rgba(255,255,255,.90);
        color:#4f3d39;
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
      }
      #${TRACK_ID} .dynamicRecommendedStyle{cursor:pointer;}
      #${TRACK_ID} .recommendedStyleEmpty{min-width:82%;padding:22px 18px;}
      #${VIEWER_ID}{position:fixed;z-index:100050;overflow:hidden;background:#111;opacity:0;transform:scale(.97);transition:left .34s cubic-bezier(.22,.78,.18,1),top .34s cubic-bezier(.22,.78,.18,1),width .34s cubic-bezier(.22,.78,.18,1),height .34s cubic-bezier(.22,.78,.18,1),border-radius .34s ease,opacity .18s ease,transform .22s ease;touch-action:manipulation;}
      #${VIEWER_ID}.active{left:0!important;top:0!important;width:100vw!important;height:100dvh!important;border-radius:0!important;opacity:1;transform:scale(1);}
      #${VIEWER_ID} .recommendedViewerBlur{position:absolute;inset:-32px;background-size:cover;background-position:center;filter:blur(30px) brightness(.52);transform:scale(1.08);}
      #${VIEWER_ID} .recommendedViewerShade{position:absolute;inset:0;background:rgba(0,0,0,.22);}
      #${VIEWER_ID} .recommendedViewerMain{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) 14px calc(126px + env(safe-area-inset-bottom));}
      #${VIEWER_ID} .recommendedViewerMain img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:16px;box-shadow:0 14px 36px rgba(0,0,0,.30);}
      #${VIEWER_ID} .recommendedViewerBottom{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:34px 20px calc(16px + env(safe-area-inset-bottom));color:#fff;background:linear-gradient(180deg,transparent,rgba(0,0,0,.78) 30%,rgba(0,0,0,.90));}
      #${VIEWER_ID} .recommendedViewerBottom h3{margin:0 0 5px;font-size:22px;line-height:1.15;color:#fff;}
      #${VIEWER_ID} .recommendedViewerBottom p{margin:2px 0;font-size:13px;line-height:1.4;color:rgba(255,255,255,.9);}
      #${VIEWER_ID} .recommendedViewerBottom button{margin-top:12px;width:100%;min-height:48px;border:0;border-radius:15px;font-weight:900;background:#fff;color:#4f3d39;}
      #${VIEWER_ID} .recommendedViewerHint{position:absolute;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:5;padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.36);color:#fff;font-size:11px;font-weight:800;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:none;}
      body.recommendedViewerOpen{overflow:hidden!important;}
    `;
    document.head.appendChild(style);
  }

  function applyImageView(card,img,row){
    if(!card || !img || !img.naturalWidth || !img.naturalHeight)return;

    const rect=card.getBoundingClientRect();
    if(!rect.width || !rect.height)return;

    const fit=row.image_fit==='cover'?'cover':'contain';
    const x=clamp(Number(row.image_position_x??0),-150,150);
    const y=clamp(Number(row.image_position_y??0),-150,150);
    const zoom=clamp(Number(row.image_zoom??1),0.5,4);

    const containScale=Math.min(
      rect.width/img.naturalWidth,
      rect.height/img.naturalHeight
    );
    const coverScale=Math.max(
      rect.width/img.naturalWidth,
      rect.height/img.naturalHeight
    );
    const fitScale=fit==='cover'?coverScale:containScale;
    const actualScale=fitScale*zoom;

    const offsetX=(x/100)*rect.width;
    const offsetY=(y/100)*rect.height;

    img.style.width=`${img.naturalWidth}px`;
    img.style.height=`${img.naturalHeight}px`;
    img.style.transform=
      `translate(-50%,-50%) translate3d(${offsetX}px,${offsetY}px,0) scale(${actualScale})`;
    img.style.transformOrigin='50% 50%';
  }

  function bookStyle(row){
    try{
      if(typeof openBooking==='function'){
        openBooking(row.service_id?{serviceId:row.service_id}:{});
      }
    }catch(err){console.error(err)}
  }

  function displayPriceFor(row){
    if(row.price!==null && row.price!==undefined)return Number(row.price);
    if(row.service_price!==null && row.service_price!==undefined)return Number(row.service_price);
    return null;
  }

  function openViewer(card,row){
    if(viewerOpen || !row.image_url)return;
    viewerOpen=true;

    const rect=card.getBoundingClientRect();
    const viewer=document.createElement('div');
    viewer.id=VIEWER_ID;
    viewer.style.left=`${rect.left}px`;
    viewer.style.top=`${rect.top}px`;
    viewer.style.width=`${rect.width}px`;
    viewer.style.height=`${rect.height}px`;
    viewer.style.borderRadius=getComputedStyle(card).borderRadius||'22px';

    const p=displayPriceFor(row);
    viewer.innerHTML=`
      <div class="recommendedViewerBlur"></div>
      <div class="recommendedViewerShade"></div>
      <div class="recommendedViewerMain"><img alt="${esc(row.title||'추천 스타일')}"></div>
      <div class="recommendedViewerHint">사진을 탭하면 돌아갑니다</div>
      <div class="recommendedViewerBottom">
        <h3>${esc(row.title||'추천 스타일')}</h3>
        ${row.description?`<p>${esc(row.description)}</p>`:''}
        ${(row.service_name||p!==null)?`<p>${row.service_name?esc(row.service_name):''}${row.service_name&&p!==null?' · ':''}${p!==null?money(p):''}</p>`:''}
        <button type="button">이 스타일로 예약</button>
      </div>`;

    const blur=viewer.querySelector('.recommendedViewerBlur');
    blur.style.backgroundImage=`url("${String(row.image_url).replace(/"/g,'%22')}")`;
    viewer.querySelector('.recommendedViewerMain img').src=row.image_url;

    const btn=viewer.querySelector('button');
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      closeViewer(viewer,card,()=>bookStyle(row));
    });
    viewer.addEventListener('click',e=>{
      if(e.target.closest('button'))return;
      closeViewer(viewer,card);
    });

    document.body.appendChild(viewer);
    document.body.classList.add('recommendedViewerOpen');

    requestAnimationFrame(()=>{
      viewer.style.transform='scale(.965)';
      requestAnimationFrame(()=>{
        viewer.classList.add('active');
        viewer.style.transform='scale(1)';
      });
    });
  }

  function closeViewer(viewer,card,after){
    if(!viewer || viewer.dataset.closing==='1')return;
    viewer.dataset.closing='1';
    const rect=card.getBoundingClientRect();
    viewer.classList.remove('active');
    viewer.style.left=`${rect.left}px`;
    viewer.style.top=`${rect.top}px`;
    viewer.style.width=`${rect.width}px`;
    viewer.style.height=`${rect.height}px`;
    viewer.style.borderRadius=getComputedStyle(card).borderRadius||'22px';
    viewer.style.transform='scale(.985)';
    setTimeout(()=>{
      viewer.remove();
      document.body.classList.remove('recommendedViewerOpen');
      viewerOpen=false;
      if(typeof after==='function')after();
    },360);
  }

  function makeCard(row){
    const card=document.createElement('article');
    card.className='galleryCard dynamicRecommendedStyle';

    if(row.image_url){
      const img=document.createElement('img');
      img.className='dynamicRecommendedStyleImage';
      img.alt=row.title||'추천 스타일';
      img.onload=()=>applyImageView(card,img,row);
      img.src=row.image_url;
      card.appendChild(img);
      if(img.complete)requestAnimationFrame(()=>applyImageView(card,img,row));
    }

    const displayPrice=
      row.price!==null && row.price!==undefined
        ? Number(row.price)
        : (row.service_price!==null && row.service_price!==undefined
            ? Number(row.service_price)
            : null);

    const content=document.createElement('div');
    content.className='dynamicRecommendedStyleContent';
    content.innerHTML=`
      <h3 class="dynamicRecommendedStyleTitle">${esc(row.title||'추천 스타일')}</h3>
      ${row.description?`<p class="dynamicRecommendedStyleDesc">${esc(row.description)}</p>`:''}
      ${(row.service_name||displayPrice!==null)
        ? `<p class="dynamicRecommendedStyleMeta">${row.service_name?esc(row.service_name):''}${row.service_name&&displayPrice!==null?' · ':''}${displayPrice!==null?money(displayPrice):''}</p>`
        : ''}
      <button type="button">이 스타일로 예약</button>
    `;

    const button=content.querySelector('button');
    button.addEventListener('click',e=>{
      e.stopPropagation();
      bookStyle(row);
    });

    card.addEventListener('click',e=>{
      if(e.target.closest('button'))return;
      openViewer(card,row);
    });

    card.appendChild(content);
    return card;
  }

  window.addEventListener('resize',()=>{
    const track=q('#'+TRACK_ID);
    if(!track)return;
    track.querySelectorAll('.dynamicRecommendedStyle').forEach(card=>{
      const img=card.querySelector('.dynamicRecommendedStyleImage');
      const idx=[...track.children].indexOf(card);
      if(img && window.__smartStoreRecommendedRows?.[idx]){
        applyImageView(card,img,window.__smartStoreRecommendedRows[idx]);
      }
    });
  });

  async function init(){
    const cfg=window.SMART_STORE_CONFIG;
    if(!cfg)return;
    const client=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey);
    if(!client)return;

    try{
      const {data:rows,error}=await client.rpc('public_recommended_styles',{
        p_slug:cfg.storeSlug
      });
      if(error)throw error;

      window.__smartStoreRecommendedRows=Array.isArray(rows)?rows:[];

      addStyles();
      const track=q('#'+TRACK_ID);
      if(!track)return;

      if(!window.__smartStoreRecommendedRows.length){
        track.innerHTML='<div class="hintBox recommendedStyleEmpty">등록된 추천 스타일이 없습니다.</div>';
        return;
      }

      track.innerHTML='';
      window.__smartStoreRecommendedRows.forEach(row=>track.appendChild(makeCard(row)));
    }catch(err){
      console.error('recommended styles load failed',err);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();