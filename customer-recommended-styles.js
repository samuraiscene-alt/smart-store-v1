/* Smart Store - customer recommended styles + fixed viewer photo gestures v3 */
(() => {
  const STYLE_ID='customerRecommendedStylesStyle';
  const TRACK_ID='galleryTrack';
  const VIEWER_ID='recommendedStyleViewer';
  const FLY_ID='recommendedStyleFlyingPhoto';

  let viewerOpen=false;
  let rows=[];
  let activeViewer=null;
  let activeCard=null;
  let activeRow=null;
  let photoView={zoom:1,x:0,y:0};
  let touchState=null;
  let mouseState=null;

  const q=s=>document.querySelector(s);
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
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
        cursor:pointer;
      }
      #${TRACK_ID} .dynamicRecommendedStyle::after{
        content:"";
        position:absolute;
        inset:0;
        z-index:2;
        pointer-events:none;
        background:linear-gradient(180deg,rgba(0,0,0,.02) 30%,rgba(0,0,0,.58) 100%);
      }
      #${TRACK_ID} .dynamicRecommendedStyleImage{
        position:absolute;
        left:50%;
        top:50%;
        z-index:1;
        width:auto;
        height:auto;
        max-width:none;
        max-height:none;
        display:block;
        pointer-events:none;
        will-change:transform;
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
        background:rgba(255,255,255,.92);
        color:#4f3d39;
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
      }
      #${TRACK_ID} .recommendedStyleEmpty{
        min-width:82%;
        padding:22px 18px;
      }

      #${VIEWER_ID}{
        position:fixed;
        inset:0;
        z-index:100050;
        overflow:hidden;
        background:transparent;
        opacity:1;
      }
      #${VIEWER_ID} .recommendedViewerBlur{
        position:absolute;
        inset:-34px;
        background-size:cover;
        background-position:center;
        filter:blur(30px) brightness(.50);
        transform:scale(1.08);
        opacity:1;
      }
      #${VIEWER_ID} .recommendedViewerShade{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.28);
        opacity:1;
      }
      #${VIEWER_ID} .recommendedViewerPhotoStage{
        position:absolute;
        left:0;
        right:0;
        top:max(58px,calc(18px + env(safe-area-inset-top)));
        bottom:calc(146px + env(safe-area-inset-bottom));
        overflow:hidden;
        display:flex;
        align-items:center;
        justify-content:center;
        touch-action:none;
        user-select:none;
        -webkit-user-select:none;
      }
      #${VIEWER_ID} .recommendedViewerPhoto{
        display:block;
        max-width:calc(100% - 28px);
        max-height:100%;
        width:auto;
        height:auto;
        object-fit:contain;
        border-radius:16px;
        box-shadow:0 14px 36px rgba(0,0,0,.30);
        opacity:0;
        transform:translate3d(0,0,0) scale(1);
        transform-origin:50% 50%;
        will-change:transform,opacity;
        transition:opacity .12s ease;
        -webkit-user-drag:none;
      }
      #${VIEWER_ID}.photoReady .recommendedViewerPhoto{
        opacity:1;
      }
      #${VIEWER_ID} .recommendedViewerBottom{
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        z-index:6;
        padding:34px 20px calc(16px + env(safe-area-inset-bottom));
        color:#fff;
        background:linear-gradient(180deg,transparent,rgba(0,0,0,.78) 30%,rgba(0,0,0,.91));
        opacity:0;
        transform:translateY(10px);
        transition:opacity .22s ease .05s,transform .22s ease .05s;
      }
      #${VIEWER_ID}.uiReady .recommendedViewerBottom{
        opacity:1;
        transform:none;
      }
      #${VIEWER_ID} .recommendedViewerBottom h3{
        margin:0 0 5px;
        font-size:22px;
        line-height:1.15;
        color:#fff;
      }
      #${VIEWER_ID} .recommendedViewerBottom p{
        margin:2px 0;
        font-size:13px;
        line-height:1.4;
        color:rgba(255,255,255,.90);
      }
      #${VIEWER_ID} .recommendedViewerBottom button{
        margin-top:12px;
        width:100%;
        min-height:48px;
        border:0;
        border-radius:15px;
        font-weight:900;
        background:#fff;
        color:#4f3d39;
      }

      #${FLY_ID}{
        position:fixed;
        z-index:100080;
        overflow:hidden;
        pointer-events:none;
        background:#efe3df;
        box-shadow:0 12px 34px rgba(0,0,0,.28);
        will-change:left,top,width,height,transform,border-radius,opacity;
      }
      #${FLY_ID} img{
        width:100%;
        height:100%;
        display:block;
        object-fit:cover;
        pointer-events:none;
      }

      body.recommendedViewerOpen{
        overflow:hidden!important;
      }

      @media (prefers-reduced-motion: reduce){
        #${VIEWER_ID} *,
        #${FLY_ID}{
          animation-duration:.01ms!important;
          transition-duration:.01ms!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function applyCardImageView(card,img,row){
    if(!card || !img || !img.naturalWidth || !img.naturalHeight)return;

    const rect=card.getBoundingClientRect();
    if(!rect.width || !rect.height)return;

    const fit=row.image_fit==='cover'?'cover':'contain';
    const x=clamp(Number(row.image_position_x??0),-150,150);
    const y=clamp(Number(row.image_position_y??0),-150,150);
    const zoom=clamp(Number(row.image_zoom??1),0.5,4);

    const containScale=Math.min(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
    const coverScale=Math.max(rect.width/img.naturalWidth,rect.height/img.naturalHeight);
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

  function displayPriceFor(row){
    if(row.price!==null && row.price!==undefined)return Number(row.price);
    if(row.service_price!==null && row.service_price!==undefined)return Number(row.service_price);
    return null;
  }

  function bookStyle(row){
    try{
      if(typeof window.openBooking==='function'){
        window.openBooking(row.service_id?{serviceId:row.service_id}:{});
        return;
      }
      if(typeof openBooking==='function'){
        openBooking(row.service_id?{serviceId:row.service_id}:{});
      }
    }catch(err){
      console.error(err);
    }
  }

  function fitContainRect(stage,img){
    const sr=stage.getBoundingClientRect();
    const nw=img.naturalWidth||1;
    const nh=img.naturalHeight||1;
    const scale=Math.min(sr.width/nw,sr.height/nh);
    const width=nw*scale;
    const height=nh*scale;
    return {
      left:sr.left+(sr.width-width)/2,
      top:sr.top+(sr.height-height)/2,
      width,
      height
    };
  }

  function makeFlyingPhoto(rect,url,borderRadius='20px',fit='cover'){
    q('#'+FLY_ID)?.remove();

    const fly=document.createElement('div');
    fly.id=FLY_ID;
    fly.style.left=`${rect.left}px`;
    fly.style.top=`${rect.top}px`;
    fly.style.width=`${rect.width}px`;
    fly.style.height=`${rect.height}px`;
    fly.style.borderRadius=borderRadius;
    fly.innerHTML='<img alt="">';
    const img=fly.querySelector('img');
    img.src=url;
    img.style.objectFit=fit;

    document.body.appendChild(fly);
    return fly;
  }

  function setFlyRect(fly,rect){
    fly.style.left=`${rect.left}px`;
    fly.style.top=`${rect.top}px`;
    fly.style.width=`${rect.width}px`;
    fly.style.height=`${rect.height}px`;
  }

  function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
  }

  async function dramaticOpen(card,row,viewer,photo){
    const cardRect=card.getBoundingClientRect();
    const radius=getComputedStyle(card).borderRadius||'22px';

    const fly=makeFlyingPhoto(cardRect,row.image_url,radius,'cover');

    try{
      await fly.animate(
        [
          {transform:'translateX(0) scale(1)'},
          {transform:'translateX(-4px) scale(.975)'},
          {transform:'translateX(4px) scale(.948)'},
          {transform:'translateX(-2px) scale(.955)'}
        ],
        {
          duration:150,
          easing:'cubic-bezier(.35,.01,.28,1)',
          fill:'forwards'
        }
      ).finished;
    }catch{}

    const stage=viewer.querySelector('.recommendedViewerPhotoStage');
    const target=fitContainRect(stage,photo);

    fly.style.transition=
      'left .38s cubic-bezier(.16,.84,.18,1),'+
      'top .38s cubic-bezier(.16,.84,.18,1),'+
      'width .38s cubic-bezier(.16,.84,.18,1),'+
      'height .38s cubic-bezier(.16,.84,.18,1),'+
      'border-radius .38s ease,'+
      'transform .38s cubic-bezier(.16,.84,.18,1)';
    fly.style.transform='scale(1)';
    fly.style.borderRadius='16px';
    setFlyRect(fly,target);

    await wait(390);

    viewer.classList.add('photoReady','uiReady');
    fly.style.transition='opacity .10s ease';
    fly.style.opacity='0';
    await wait(110);
    fly.remove();
  }

  function getPhotoMetrics(viewer){
    const stage=viewer?.querySelector('.recommendedViewerPhotoStage');
    const photo=viewer?.querySelector('.recommendedViewerPhoto');
    if(!stage || !photo)return null;

    return {
      stage,
      photo,
      stageRect:stage.getBoundingClientRect(),
      baseWidth:photo.offsetWidth,
      baseHeight:photo.offsetHeight
    };
  }

  function clampPhotoPan(viewer){
    const m=getPhotoMetrics(viewer);
    if(!m)return;

    photoView.zoom=clamp(Number(photoView.zoom||1),1,4);

    if(photoView.zoom<=1.0001){
      photoView.zoom=1;
      photoView.x=0;
      photoView.y=0;
      return;
    }

    const scaledWidth=m.baseWidth*photoView.zoom;
    const scaledHeight=m.baseHeight*photoView.zoom;

    // 사진이 프레임보다 작은 축은 항상 가운데 고정.
    // 큰 축은 프레임 가장자리까지만 이동 가능해 빈 공간이 생기지 않는다.
    const maxX=Math.max(0,(scaledWidth-m.stageRect.width)/2);
    const maxY=Math.max(0,(scaledHeight-m.stageRect.height)/2);

    photoView.x=clamp(Number(photoView.x||0),-maxX,maxX);
    photoView.y=clamp(Number(photoView.y||0),-maxY,maxY);
  }

  function applyPhotoTransform(viewer,animate=false){
    const photo=viewer?.querySelector('.recommendedViewerPhoto');
    if(!photo)return;

    clampPhotoPan(viewer);

    photo.style.transition=animate
      ? 'transform .20s cubic-bezier(.22,.75,.18,1),opacity .12s ease'
      : 'opacity .12s ease';

    photo.style.transform=
      `translate3d(${photoView.x}px,${photoView.y}px,0) scale(${photoView.zoom})`;
  }

  function resetPhoto(viewer,animate=true){
    photoView={zoom:1,x:0,y:0};
    applyPhotoTransform(viewer,animate);
  }

  function zoomAround(viewer,nextZoom,clientX,clientY,animate=false){
    const m=getPhotoMetrics(viewer);
    if(!m)return;

    const oldZoom=Math.max(1,Number(photoView.zoom||1));
    const newZoom=clamp(Number(nextZoom||1),1,4);

    if(newZoom<=1.0001){
      resetPhoto(viewer,animate);
      return;
    }

    const cx=m.stageRect.left+m.stageRect.width/2;
    const cy=m.stageRect.top+m.stageRect.height/2;
    const anchorX=Number.isFinite(clientX)?clientX:cx;
    const anchorY=Number.isFinite(clientY)?clientY:cy;
    const localX=anchorX-cx;
    const localY=anchorY-cy;

    // 확대 전 손가락 아래 있던 사진 지점을 확대 후에도 같은 위치에 둔다.
    const worldX=(localX-photoView.x)/oldZoom;
    const worldY=(localY-photoView.y)/oldZoom;

    photoView.zoom=newZoom;
    photoView.x=localX-worldX*newZoom;
    photoView.y=localY-worldY*newZoom;

    // 프레임 경계에 닿으면 그 방향 이동은 여기서 멈추고 안쪽으로만 확대된다.
    applyPhotoTransform(viewer,animate);
  }

  function togglePhotoZoom(viewer,clientX,clientY){
    if(photoView.zoom>1.05){
      resetPhoto(viewer,true);
      return;
    }
    zoomAround(viewer,2,clientX,clientY,true);
  }

  function touchDistance(a,b){
    return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
  }

  function touchMidpoint(a,b){
    return {
      x:(a.clientX+b.clientX)/2,
      y:(a.clientY+b.clientY)/2
    };
  }

  function makePinchState(viewer,a,b){
    const m=getPhotoMetrics(viewer);
    if(!m)return null;

    const mid=touchMidpoint(a,b);
    const cx=m.stageRect.left+m.stageRect.width/2;
    const cy=m.stageRect.top+m.stageRect.height/2;
    const localX=mid.x-cx;
    const localY=mid.y-cy;
    const z=Math.max(1,photoView.zoom);

    return {
      mode:'pinch',
      distance:Math.max(1,touchDistance(a,b)),
      zoom:z,
      worldX:(localX-photoView.x)/z,
      worldY:(localY-photoView.y)/z,
      moved:true
    };
  }

  function installPhotoGestures(viewer){
    const stage=viewer.querySelector('.recommendedViewerPhotoStage');
    const photo=viewer.querySelector('.recommendedViewerPhoto');
    if(!stage || !photo)return;

    stage.addEventListener('touchstart',e=>{
      if(e.touches.length>=2){
        touchState=makePinchState(viewer,e.touches[0],e.touches[1]);
      }else if(e.touches.length===1){
        touchState={
          mode:'drag',
          startX:e.touches[0].clientX,
          startY:e.touches[0].clientY,
          lastX:e.touches[0].clientX,
          lastY:e.touches[0].clientY,
          baseX:photoView.x,
          baseY:photoView.y,
          moved:false,
          startedAt:Date.now(),
          onPhoto:e.target===photo
        };
      }
      e.preventDefault();
    },{passive:false});

    stage.addEventListener('touchmove',e=>{
      if(!touchState)return;

      if(e.touches.length>=2){
        if(touchState.mode!=='pinch'){
          touchState=makePinchState(viewer,e.touches[0],e.touches[1]);
          if(!touchState)return;
        }

        const m=getPhotoMetrics(viewer);
        if(!m)return;

        const mid=touchMidpoint(e.touches[0],e.touches[1]);
        const cx=m.stageRect.left+m.stageRect.width/2;
        const cy=m.stageRect.top+m.stageRect.height/2;
        const localX=mid.x-cx;
        const localY=mid.y-cy;
        const nextZoom=clamp(
          touchState.zoom*(touchDistance(e.touches[0],e.touches[1])/touchState.distance),
          1,
          4
        );

        photoView.zoom=nextZoom;
        photoView.x=localX-touchState.worldX*nextZoom;
        photoView.y=localY-touchState.worldY*nextZoom;
        applyPhotoTransform(viewer,false);

        touchState.moved=true;
        e.preventDefault();
        return;
      }

      if(e.touches.length===1){
        if(touchState.mode!=='drag'){
          touchState={
            mode:'drag',
            startX:e.touches[0].clientX,
            startY:e.touches[0].clientY,
            lastX:e.touches[0].clientX,
            lastY:e.touches[0].clientY,
            baseX:photoView.x,
            baseY:photoView.y,
            moved:false,
            startedAt:Date.now(),
            onPhoto:e.target===photo
          };
        }

        const x=e.touches[0].clientX;
        const y=e.touches[0].clientY;
        const dx=x-touchState.startX;
        const dy=y-touchState.startY;

        touchState.lastX=x;
        touchState.lastY=y;
        if(Math.hypot(dx,dy)>6)touchState.moved=true;

        // 기본 크기(zoom 1)에서는 사진 자체를 움직이지 않는다.
        if(photoView.zoom>1.0001 && touchState.onPhoto){
          photoView.x=touchState.baseX+dx;
          photoView.y=touchState.baseY+dy;
          applyPhotoTransform(viewer,false);
        }

        e.preventDefault();
      }
    },{passive:false});

    stage.addEventListener('touchend',e=>{
      if(!touchState)return;

      // 핀치 후 한 손가락이 남으면 새 드래그 기준을 잡는다.
      if(touchState.mode==='pinch' && e.touches.length===1){
        touchState={
          mode:'drag',
          startX:e.touches[0].clientX,
          startY:e.touches[0].clientY,
          lastX:e.touches[0].clientX,
          lastY:e.touches[0].clientY,
          baseX:photoView.x,
          baseY:photoView.y,
          moved:true,
          startedAt:Date.now(),
          onPhoto:true
        };
        e.preventDefault();
        return;
      }

      if(e.touches.length===0){
        const state=touchState;
        touchState=null;

        if(state.mode==='drag' && !state.moved && Date.now()-state.startedAt<420){
          if(state.onPhoto){
            togglePhotoZoom(viewer,state.lastX,state.lastY);
          }else{
            // X 없이도 상세 뷰어를 닫을 수 있도록 사진 바깥의 블러 영역을 탭하면 닫힌다.
            closeViewer();
          }
        }
      }

      e.preventDefault();
    },{passive:false});

    stage.addEventListener('touchcancel',()=>{
      touchState=null;
    },{passive:true});

    // 데스크톱/마우스 보조 동작
    stage.addEventListener('click',e=>{
      if('ontouchstart' in window)return;
      if(e.target===photo){
        togglePhotoZoom(viewer,e.clientX,e.clientY);
      }else{
        closeViewer();
      }
      e.preventDefault();
    });

    stage.addEventListener('mousedown',e=>{
      if(e.button!==0 || e.target!==photo)return;
      mouseState={
        startX:e.clientX,
        startY:e.clientY,
        baseX:photoView.x,
        baseY:photoView.y,
        moved:false
      };
      e.preventDefault();
    });

    stage.addEventListener('mousemove',e=>{
      if(!mouseState || photoView.zoom<=1.0001)return;
      const dx=e.clientX-mouseState.startX;
      const dy=e.clientY-mouseState.startY;
      if(Math.hypot(dx,dy)>5)mouseState.moved=true;
      photoView.x=mouseState.baseX+dx;
      photoView.y=mouseState.baseY+dy;
      applyPhotoTransform(viewer,false);
    });

    stage.addEventListener('mouseup',()=>{
      mouseState=null;
    });

    stage.addEventListener('mouseleave',()=>{
      mouseState=null;
    });
  }

  async function closeViewer(after){
    const viewer=activeViewer;
    const card=activeCard;
    const row=activeRow;

    if(!viewer || !card || !row || viewer.dataset.closing==='1')return;
    viewer.dataset.closing='1';

    resetPhoto(viewer,true);
    await wait(190);

    const photo=viewer.querySelector('.recommendedViewerPhoto');
    const stage=viewer.querySelector('.recommendedViewerPhotoStage');
    const targetStart=fitContainRect(stage,photo);
    const cardRect=card.getBoundingClientRect();

    photo.style.opacity='0';
    viewer.classList.remove('uiReady');

    const fly=makeFlyingPhoto(targetStart,row.image_url,'16px','contain');
    fly.style.transition=
      'left .34s cubic-bezier(.28,.02,.22,1),'+
      'top .34s cubic-bezier(.28,.02,.22,1),'+
      'width .34s cubic-bezier(.28,.02,.22,1),'+
      'height .34s cubic-bezier(.28,.02,.22,1),'+
      'border-radius .34s ease,'+
      'transform .34s cubic-bezier(.28,.02,.22,1),'+
      'opacity .34s ease';

    requestAnimationFrame(()=>{
      setFlyRect(fly,cardRect);
      fly.style.borderRadius=getComputedStyle(card).borderRadius||'22px';
      fly.style.transform='scale(.985)';
    });

    await wait(350);
    fly.style.opacity='0';
    await wait(70);

    fly.remove();
    viewer.remove();
    document.body.classList.remove('recommendedViewerOpen');

    viewerOpen=false;
    activeViewer=null;
    activeCard=null;
    activeRow=null;
    photoView={zoom:1,x:0,y:0};
    touchState=null;
    mouseState=null;

    if(typeof after==='function')after();
  }

  function openViewer(card,row){
    if(viewerOpen || !row.image_url)return;
    viewerOpen=true;
    activeCard=card;
    activeRow=row;
    photoView={zoom:1,x:0,y:0};

    const p=displayPriceFor(row);
    const viewer=document.createElement('div');
    viewer.id=VIEWER_ID;
    viewer.innerHTML=`
      <div class="recommendedViewerBlur"></div>
      <div class="recommendedViewerShade"></div>

      <div class="recommendedViewerPhotoStage">
        <img class="recommendedViewerPhoto" alt="${esc(row.title||'추천 스타일')}">
      </div>


      <div class="recommendedViewerBottom">
        <h3>${esc(row.title||'추천 스타일')}</h3>
        ${row.description?`<p>${esc(row.description)}</p>`:''}
        ${(row.service_name||p!==null)
          ? `<p>${row.service_name?esc(row.service_name):''}${row.service_name&&p!==null?' · ':''}${p!==null?money(p):''}</p>`
          : ''}
        <button class="recommendedViewerBook" type="button">이 스타일로 예약</button>
      </div>
    `;

    const blur=viewer.querySelector('.recommendedViewerBlur');
    blur.style.backgroundImage=`url("${String(row.image_url).replace(/"/g,'%22')}")`;

    const photo=viewer.querySelector('.recommendedViewerPhoto');
    photo.src=row.image_url;

    viewer.querySelector('.recommendedViewerBook').addEventListener('click',e=>{
      e.stopPropagation();
      closeViewer(()=>bookStyle(row));
    });

    viewer.addEventListener('click',e=>{
      if(e.target.classList.contains('recommendedViewerBlur') ||
         e.target.classList.contains('recommendedViewerShade')){
        closeViewer();
      }
    });

    document.body.appendChild(viewer);
    document.body.classList.add('recommendedViewerOpen');
    activeViewer=viewer;

    installPhotoGestures(viewer);

    const start=()=>{
      requestAnimationFrame(()=>dramaticOpen(card,row,viewer,photo));
    };

    if(photo.complete && photo.naturalWidth){
      start();
    }else{
      photo.addEventListener('load',start,{once:true});
    }
  }

  function makeCard(row){
    const card=document.createElement('article');
    card.className='galleryCard dynamicRecommendedStyle';

    if(row.image_url){
      const img=document.createElement('img');
      img.className='dynamicRecommendedStyleImage';
      img.alt=row.title||'추천 스타일';
      img.onload=()=>applyCardImageView(card,img,row);
      img.src=row.image_url;
      card.appendChild(img);

      if(img.complete){
        requestAnimationFrame(()=>applyCardImageView(card,img,row));
      }
    }

    const displayPrice=displayPriceFor(row);

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

    content.querySelector('button').addEventListener('click',e=>{
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

  function refreshCardImages(){
    const track=q('#'+TRACK_ID);
    if(!track)return;

    [...track.querySelectorAll('.dynamicRecommendedStyle')].forEach((card,i)=>{
      const img=card.querySelector('.dynamicRecommendedStyleImage');
      if(img && rows[i])applyCardImageView(card,img,rows[i]);
    });
  }

  window.addEventListener('resize',()=>{
    refreshCardImages();
    if(activeViewer){
      resetPhoto(activeViewer,false);
    }
  });

  async function init(){
    const cfg=window.SMART_STORE_CONFIG;
    if(!cfg)return;

    const client=window.supabase?.createClient?.(cfg.supabaseUrl,cfg.supabaseKey);
    if(!client)return;

    try{
      const {data,error}=await client.rpc('public_recommended_styles',{
        p_slug:cfg.storeSlug
      });
      if(error)throw error;

      rows=Array.isArray(data)?data:[];
      window.__smartStoreRecommendedRows=rows;

      addStyles();

      const track=q('#'+TRACK_ID);
      if(!track)return;

      if(!rows.length){
        track.innerHTML='<div class="hintBox recommendedStyleEmpty">등록된 추천 스타일이 없습니다.</div>';
        return;
      }

      track.innerHTML='';
      rows.forEach(row=>track.appendChild(makeCard(row)));
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