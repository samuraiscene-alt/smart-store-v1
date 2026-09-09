/* Smart Store - admin drawer menu v1 */
(() => {
  const STYLE_ID='adminDrawerMenuStyle';
  const DRAWER_ID='adminDrawerMenu';
  const DASH_ID='adminDrawerDashboardPanel';
  const BTN_ID='adminDrawerOpen';

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const icon={
    dash:'⌂',book:'▣',customer:'♙',service:'✂︎',style:'▧',
    store:'▤',screen:'□',policy:'⚙︎',logout:'↪',search:'⌕',
    plus:'＋',notice:'◖'
  };

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      :root{
        --ad-cream:#fbf8f5;--ad-paper:#fffdfa;--ad-ink:#2f2927;
        --ad-brown:#76524d;--ad-brown2:#8d6861;--ad-muted:#958780;
        --ad-rose:#d8b8b0;--ad-soft:#f5e9e5;--ad-wait:#b64f4f;
      }
      body.adminBody.drawerOpen{overflow:hidden}
      #adminApp .adminTabs{display:none!important}
      #adminApp .adminHeader{align-items:center}
      #${BTN_ID}{
        width:46px;height:46px;flex:0 0 46px;border:1px solid #eadfda;
        border-radius:15px;background:var(--ad-soft);color:var(--ad-brown);
        display:grid;place-items:center;padding:0;font-size:25px;line-height:1;
      }
      #adminApp .adminHeader>div:first-of-type{flex:1;min-width:0}
      @media(max-width:430px){#adminApp .adminHeaderActions .secondary{display:none}}

      #${DRAWER_ID}{position:fixed;inset:0;z-index:100200;visibility:hidden;pointer-events:none}
      #${DRAWER_ID}.open{visibility:visible;pointer-events:auto}
      #${DRAWER_ID} .shade{
        position:absolute;inset:0;background:rgba(44,35,32,.30);opacity:0;
        transition:.22s;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)
      }
      #${DRAWER_ID}.open .shade{opacity:1}
      #${DRAWER_ID} .panel{
        position:absolute;left:0;top:0;bottom:0;width:min(86vw,390px);
        background:linear-gradient(180deg,#fffdfb,#faf5f1);
        border-radius:0 28px 28px 0;box-shadow:20px 0 55px rgba(60,39,35,.18);
        transform:translateX(-103%);transition:transform .25s cubic-bezier(.22,.78,.28,1);
        padding:calc(18px + env(safe-area-inset-top)) 15px calc(18px + env(safe-area-inset-bottom));
        overflow:auto;-webkit-overflow-scrolling:touch
      }
      #${DRAWER_ID}.open .panel{transform:none}
      #${DRAWER_ID} .top{display:flex;justify-content:space-between;gap:12px;padding:5px 8px 18px}
      #${DRAWER_ID} .brand small{display:block;color:var(--ad-muted);font-size:9px;font-weight:700;letter-spacing:.24em}
      #${DRAWER_ID} .brand strong{
        display:block;color:var(--ad-brown);font-family:Georgia,"Times New Roman",serif;
        font-size:35px;line-height:1;font-style:italic;font-weight:500;letter-spacing:-.04em
      }
      #${DRAWER_ID} .brand em{
        display:block;margin-top:7px;color:var(--ad-brown2);font-style:normal;
        font-size:10px;font-weight:700;letter-spacing:.28em
      }
      #${DRAWER_ID} .close{border:0;background:transparent;color:var(--ad-brown);font-size:28px;padding:4px 8px}
      #${DRAWER_ID} nav{display:grid;gap:5px}
      #${DRAWER_ID} .item{
        width:100%;border:0;background:transparent;border-radius:17px;padding:11px 10px;
        display:grid;grid-template-columns:38px 1fr 20px;gap:10px;align-items:center;text-align:left;color:var(--ad-brown)
      }
      #${DRAWER_ID} .item.active{
        background:linear-gradient(135deg,#f4e5e1,#f8efec);
        box-shadow:inset 0 0 0 1px rgba(216,184,176,.38)
      }
      #${DRAWER_ID} .ico{
        width:36px;height:36px;border-radius:12px;display:grid;place-items:center;
        color:var(--ad-brown);font-size:22px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif
      }
      #${DRAWER_ID} .item.active .ico{background:rgba(255,255,255,.60)}
      #${DRAWER_ID} .txt b{
        display:block;color:var(--ad-ink);font-size:15px;line-height:1.18;
        font-weight:650;letter-spacing:-.025em
      }
      #${DRAWER_ID} .txt small{
        display:block;margin-top:4px;color:var(--ad-muted);font-size:11px;
        line-height:1.32;font-weight:430;letter-spacing:-.01em
      }
      #${DRAWER_ID} .arr{font-size:22px;color:var(--ad-brown2)}
      #${DRAWER_ID} .pendingBadge{
        display:none;margin-left:6px;min-width:20px;height:20px;padding:0 6px;border-radius:99px;
        background:var(--ad-wait);color:#fff;font-size:10px;font-weight:900;align-items:center;justify-content:center
      }
      #${DRAWER_ID} .pendingBadge.show{display:inline-flex}
      #${DRAWER_ID} .divider{height:1px;background:#eadfda;margin:10px 8px}
      #${DRAWER_ID} .foot{
        padding:17px 12px 4px;color:#aa9992;font-family:Georgia,"Times New Roman",serif;
        font-style:italic;font-size:15px;line-height:1.25
      }

      #${DASH_ID}{display:none}
      #${DASH_ID}.active{display:block}
      #${DASH_ID} .hello{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:4px 0 16px}
      #${DASH_ID} .hello h2{margin:0;font-size:25px;letter-spacing:-.04em}
      #${DASH_ID} .hello p{margin:5px 0 0;color:var(--ad-muted);font-size:13px}
      #${DASH_ID} .date{font-size:12px;color:var(--ad-brown2);white-space:nowrap}
      #${DASH_ID} .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:22px}
      #${DASH_ID} .summary article{
        background:var(--ad-paper);border:1px solid #eadfda;border-radius:19px;padding:14px;
        box-shadow:0 8px 24px rgba(67,45,40,.04)
      }
      #${DASH_ID} .summary small{color:var(--ad-muted);font-size:11px;font-weight:650}
      #${DASH_ID} .summary b{display:block;margin-top:7px;font-size:24px;letter-spacing:-.04em}
      #${DASH_ID} .section{margin:24px 0}
      #${DASH_ID} .sectionHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
      #${DASH_ID} .sectionHead h3{margin:0;font-size:19px;letter-spacing:-.03em}
      #${DASH_ID} .sectionHead button{border:0;background:none;color:var(--ad-brown2);font-size:12px;font-weight:700}
      #${DASH_ID} .today{
        background:var(--ad-paper);border:1px solid #eadfda;border-radius:20px;padding:4px 14px
      }
      #${DASH_ID} .row{
        display:grid;grid-template-columns:54px 1fr auto;gap:10px;align-items:center;
        padding:12px 0;border-bottom:1px solid #eee3de
      }
      #${DASH_ID} .row:last-child{border-bottom:0}
      #${DASH_ID} .row time{font-size:13px;font-weight:800}
      #${DASH_ID} .row b{display:block;font-size:13px}
      #${DASH_ID} .row small{display:block;margin-top:3px;color:var(--ad-muted);font-size:11px}
      #${DASH_ID} .status{
        min-width:52px;padding:6px 9px;border-radius:999px;text-align:center;
        background:#f1e8e4;color:var(--ad-brown);font-size:11px;font-weight:800
      }
      #${DASH_ID} .status.pending{background:#f7dddd;color:var(--ad-wait)}
      #${DASH_ID} .empty{padding:20px 8px;text-align:center;color:var(--ad-muted);font-size:12px}
      #${DASH_ID} .quick{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
      #${DASH_ID} .quick button{
        min-height:72px;border:1px solid #eadfda;border-radius:18px;background:var(--ad-paper);
        color:var(--ad-brown);display:flex;align-items:center;gap:10px;padding:13px;text-align:left
      }
      #${DASH_ID} .quick span{
        width:34px;height:34px;border-radius:11px;background:var(--ad-soft);
        display:grid;place-items:center;flex:0 0 34px;font-size:21px
      }
      #${DASH_ID} .quick b{font-size:13px;color:var(--ad-ink);font-weight:650}

      .adminDrawerSubnav{display:flex;gap:7px;margin:0 0 14px;overflow:auto;padding-bottom:2px}
      .adminDrawerSubnav button{
        border:1px solid #eadfda;background:#fffdfa;color:var(--ad-muted);
        border-radius:999px;padding:9px 13px;white-space:nowrap;font-size:12px;font-weight:700
      }
      .adminDrawerSubnav button.active{background:var(--ad-brown);border-color:var(--ad-brown);color:#fff}

      .reservationStatus,.reservationSelect{color:var(--ad-brown)!important}
      .reservationItem.pendingApproval{border-color:#e3b9b9!important;background:#fff9f8!important}
      .reservationItem.pendingApproval .reservationSelect{
        color:var(--ad-wait)!important;font-weight:800!important
      }
    `;
    document.head.appendChild(s);
  }

  function today(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value||'';
    return `${g('year')}-${g('month')}-${g('day')}`;
  }

  function dateLabel(){
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'}).format(new Date());
  }

  function ensureDashboard(){
    if(document.getElementById(DASH_ID))return;
    const main=q('#adminApp main');if(!main)return;
    const p=document.createElement('section');
    p.id=DASH_ID;p.className='adminPanel';p.dataset.panel='dashboard';
    p.innerHTML=`
      <div class="hello"><div><h2>안녕하세요!</h2><p>오늘도 좋은 하루 되세요.</p></div><span id="dashDate" class="date"></span></div>
      <div class="summary">
        <article><small>오늘 예약</small><b id="dashToday">0</b></article>
        <article><small>예약 대기</small><b id="dashPending">0</b></article>
        <article><small>고객</small><b id="dashCustomers">0</b></article>
        <article><small>서비스</small><b id="dashServices">0</b></article>
      </div>
      <section class="section">
        <div class="sectionHead"><h3>오늘 예약 현황</h3><button data-go="reservations">전체 보기 ›</button></div>
        <div id="dashTodayList" class="today"></div>
      </section>
      <section class="section">
        <div class="sectionHead"><h3>빠른 작업</h3></div>
        <div class="quick">
          <button data-quick="direct"><span>${icon.book}</span><b>직접 예약</b></button>
          <button data-quick="customer"><span>${icon.search}</span><b>고객 검색</b></button>
          <button data-quick="style"><span>${icon.plus}</span><b>스타일 등록</b></button>
          <button data-quick="notice"><span>${icon.notice}</span><b>공지 수정</b></button>
        </div>
      </section>`;
    main.insertBefore(p,main.firstChild);

    p.onclick=e=>{
      const go=e.target.closest('[data-go]');
      if(go){activate(go.dataset.go);return}
      const x=e.target.closest('[data-quick]')?.dataset.quick;
      if(!x)return;
      if(x==='direct'){activate('reservations');setTimeout(()=>q('#adminDirectBookingOpen')?.click(),80)}
      if(x==='customer'){activate('customers');setTimeout(()=>q('#customerSearch')?.focus(),100)}
      if(x==='style'){activate('recommended-styles');setTimeout(()=>q('#addRecommendedStyle')?.click(),100)}
      if(x==='notice'){activate('store');setTimeout(()=>{q('#aNotice')?.scrollIntoView({behavior:'smooth',block:'center'});q('#aNotice')?.focus()},100)}
    };
  }

  function item(action,ico,title,sub,badge=''){
    return `<button class="item" type="button" data-action="${action}">
      <span class="ico">${ico}</span>
      <span class="txt"><b>${title}${badge}</b><small>${sub}</small></span>
      <span class="arr">›</span></button>`;
  }

  function ensureDrawer(){
    if(document.getElementById(DRAWER_ID))return;
    const w=document.createElement('div');w.id=DRAWER_ID;
    w.innerHTML=`
      <div class="shade" data-close></div>
      <aside class="panel">
        <div class="top">
          <div class="brand"><small>BEAUTY SALON</small><strong>S’nail</strong><em>MANAGER</em></div>
          <button class="close" type="button" data-close>×</button>
        </div>
        <nav>
          ${item('dashboard',icon.dash,'대시보드','오늘 예약과 매장 현황')}
          ${item('reservations',icon.book,'예약 관리','예약목록 · 직접예약 · 승인','<span id="drawerPending" class="pendingBadge">0</span>')}
          ${item('customers',icon.customer,'고객 관리','고객목록 · 메모 · 이용내역')}
          ${item('services',icon.service,'서비스 관리','서비스 · 가격 · 담당자')}
          ${item('recommended-styles',icon.style,'추천 스타일','사진 등록 · 편집')}
          ${item('store',icon.store,'매장 설정','기본정보 · 영업시간 · 휴무일')}
          ${item('customer-screen',icon.screen,'손님 화면 설정','상단 로고 · 인트로 편집')}
          ${item('policy',icon.policy,'예약 정책','취소정책 · 예약 방식')}
          <div class="divider"></div>
          ${item('logout',icon.logout,'로그아웃','관리자 계정에서 나가기')}
        </nav>
        <div class="foot">Good Beauty<br>Better Days</div>
      </aside>`;
    document.body.appendChild(w);

    w.onclick=e=>{
      if(e.target.closest('[data-close]')){closeDrawer();return}
      const b=e.target.closest('[data-action]');if(!b)return;
      if(b.dataset.action==='logout'){q('#logoutButton')?.click();closeDrawer();return}
      activate(b.dataset.action);closeDrawer();
    };
  }

  function ensureButton(){
    if(document.getElementById(BTN_ID))return;
    const h=q('#adminApp .adminHeader');if(!h)return;
    const b=document.createElement('button');b.id=BTN_ID;b.type='button';b.setAttribute('aria-label','메뉴 열기');b.textContent='☰';b.onclick=openDrawer;
    h.insertBefore(b,h.firstChild);
  }

  function openDrawer(){q('#'+DRAWER_ID)?.classList.add('open');document.body.classList.add('drawerOpen')}
  function closeDrawer(){q('#'+DRAWER_ID)?.classList.remove('open');document.body.classList.remove('drawerOpen')}

  function setActive(name){
    qa(`#${DRAWER_ID} [data-action]`).forEach(b=>{
      const a=b.dataset.action;
      b.classList.toggle('active',a===name||(name==='staff'&&a==='services')||(name==='schedule'&&a==='store'));
    });
  }

  function showPanel(name){
    qa('.adminPanel').forEach(p=>p.classList.toggle('active',p.dataset.panel===name));
    qa('.adminTabs button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
    if(name==='customers'&&typeof renderCustomers==='function')renderCustomers(q('#customerSearch')?.value||'');
  }

  function subnav(group){
    qa('.adminDrawerSubnav').forEach(x=>x.remove());
    const isServices=group==='services';
    const host=q(`.adminPanel[data-panel="${isServices?'services':'store'}"]`);
    const title=host?.querySelector('.panelTitle');if(!title)return;
    const bar=document.createElement('div');bar.className='adminDrawerSubnav';
    bar.innerHTML=isServices
      ?'<button class="active" data-sub="services">서비스</button><button data-sub="staff">담당자</button>'
      :'<button class="active" data-sub="store">기본정보</button><button data-sub="schedule">시간 · 휴무</button>';
    title.insertAdjacentElement('afterend',bar);
    bar.onclick=e=>{
      const b=e.target.closest('[data-sub]');if(!b)return;
      showPanel(b.dataset.sub);subnav(group);
      qa('.adminDrawerSubnav button').forEach(x=>x.classList.toggle('active',x.dataset.sub===b.dataset.sub));
    };
  }

  function activate(a){
    qa('.adminDrawerSubnav').forEach(x=>x.remove());

    if(a==='dashboard'){
      showPanel('dashboard');setActive(a);renderDashboard();window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(a==='customer-screen'){
      showPanel('store');setActive(a);
      setTimeout(()=>{(q('#adminHomeHeaderCard')||q('#adminIntroEditorCard'))?.scrollIntoView({behavior:'smooth',block:'start'})},120);
      return;
    }
    if(a==='policy'){
      showPanel('reservations');setActive(a);
      setTimeout(()=>q('#adminCustomerCancelPolicyCard')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
      return;
    }
    showPanel(a);
    if(a==='services')subnav('services');
    if(a==='store')subnav('store');
    setActive(a);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderDashboard(){
    if(typeof data==='undefined'||!q('#'+DASH_ID))return;
    const day=today();
    const rs=(data.reservations||[]).filter(r=>r.date===day&&!['취소','노쇼','예약거절'].includes(r.status)).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
    const pending=(data.reservations||[]).filter(r=>r.status==='예약대기').length;
    q('#dashDate').textContent=dateLabel();
    q('#dashToday').textContent=rs.length;
    q('#dashPending').textContent=pending;
    q('#dashPending').style.color=pending?'var(--ad-wait)':'';
    q('#dashCustomers').textContent=(data.customers||[]).filter(c=>!c.archivedAt).length;
    q('#dashServices').textContent=(data.services||[]).filter(s=>s.active!==false).length;
    q('#dashTodayList').innerHTML=rs.length?rs.map(r=>`
      <article class="row"><time>${esc(r.time)}</time>
      <div><b>${esc(r.customerName||'고객')}</b><small>${esc(r.serviceName||'')} · ${esc(r.staffName||'담당없음')}</small></div>
      <span class="status${r.status==='예약대기'?' pending':''}">${esc(r.status||'')}</span></article>`).join('')
      :'<div class="empty">오늘 등록된 예약이 없습니다.</div>';
    const badge=q('#drawerPending');
    if(badge){badge.textContent=pending;badge.classList.toggle('show',pending>0)}
  }

  function statusColors(){
    qa('.reservationStatus').forEach(el=>{
      const p=el.textContent.trim()==='예약대기';
      el.style.background=p?'#f7dddd':'#f1e8e4';
      el.style.color=p?'var(--ad-wait)':'var(--ad-brown)';
      el.style.fontWeight='800';
    });
    qa('.reservationSelect').forEach(el=>{
      const p=el.value==='예약대기';
      el.style.color=p?'var(--ad-wait)':'var(--ad-brown)';
      el.style.fontWeight=p?'800':'700';
    });
  }

  function hook(){
    if(typeof renderAll==='function'&&!window.__drawerHook){
      window.__drawerHook=true;
      const old=renderAll;
      renderAll=function(){old();setTimeout(()=>{renderDashboard();statusColors()},0)};
    }
    const app=q('#adminApp');
    if(app)new MutationObserver(()=>{renderDashboard();statusColors()}).observe(app,{subtree:true,childList:true});
  }

  function install(){
    addStyles();ensureDashboard();ensureDrawer();ensureButton();hook();
    let n=0;
    const t=setInterval(()=>{
      n++;ensureDashboard();ensureDrawer();ensureButton();renderDashboard();statusColors();
      const app=q('#adminApp');
      if(app&&!app.classList.contains('hidden')){clearInterval(t);setTimeout(()=>activate('dashboard'),120)}
      else if(n>60)clearInterval(t);
    },250);
  }

  document.readyState==='loading'
    ?document.addEventListener('DOMContentLoaded',install,{once:true})
    :install();
})();
