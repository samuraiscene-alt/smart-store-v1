/* Smart Store - admin drawer menu v2.1: hide legacy summary */
(() => {
  const STYLE_ID='adminDrawerMenuStyleV2';
  const DRAWER_ID='adminDrawerMenuV2';
  const DASH_ID='adminDrawerDashboardV2';
  const OPEN_ID='adminDrawerOpenV2';

  const q=s=>document.querySelector(s);
  const qa=s=>[...document.querySelectorAll(s)];
  const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  const svg={
    menu:'<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5M9.5 20v-5h5v5"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7 3v5M17 3v5M3.5 10h17"/></svg>',
    users:'<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M2.5 21v-2.2A5.8 5.8 0 0 1 8.3 13h1.4a5.8 5.8 0 0 1 5.8 5.8V21"/><path d="M16 4.5a3.5 3.5 0 0 1 0 5.8M17.2 13.5a5.2 5.2 0 0 1 4.3 5.1V21"/></svg>',
    scissors:'<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.5 8.5 11 11M8.5 15.5 19.5 4.5"/></svg>',
    image:'<svg viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="2"/><circle cx="9" cy="9" r="1.5"/><path d="m5.5 18 5-5 3.2 3.2 2.3-2.3 4.5 4.1"/></svg>',
    store:'<svg viewBox="0 0 24 24"><path d="M4 9h16l-1.5-5h-13L4 9Z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></svg>',
    screen:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    gear:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.5 1a8 8 0 0 0-1.8-1L14.2 3h-4.4l-.4 3A8 8 0 0 0 7.6 7L5.1 6l-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.5-1a8 8 0 0 0 1.8 1l.4 3h4.4l.4-3a8 8 0 0 0 1.8-1l2.5 1 2-3.4-2-1.6a7 7 0 0 0 .1-1Z"/></svg>',
    logout:'<svg viewBox="0 0 24 24"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4M18 12H8"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    notice:'<svg viewBox="0 0 24 24"><path d="M4 13V8l12-4v13L4 13Z"/><path d="M8 14v5a2 2 0 0 0 2 2h1v-6M18 7v7"/></svg>',
    chev:'<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>'
  };

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      :root{--adm-card:#fffdfa;--adm-text:#302a28;--adm-brown:#76524d;--adm-brown2:#8d6861;--adm-muted:#94867f;--adm-soft:#f5e9e5;--adm-line:#eadfda;--adm-wait:#b64b4b}
      body.adminBody.admDrawerOpen{overflow:hidden}
      #adminApp .adminTabs{display:none!important}
      #adminApp .adminSummary{display:none!important}
      #adminApp .adminHeader{display:flex;align-items:center;gap:10px}
      #${OPEN_ID}{width:46px;height:46px;flex:0 0 46px;padding:0;border:1px solid var(--adm-line);border-radius:15px;background:var(--adm-soft);color:var(--adm-brown);display:grid;place-items:center}
      #${OPEN_ID} svg,#${DRAWER_ID} svg,#${DASH_ID} svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      #adminApp .adminHeader>div:first-of-type{flex:1;min-width:0}
      #${DRAWER_ID}{position:fixed;inset:0;z-index:100200;visibility:hidden;pointer-events:none}
      #${DRAWER_ID}.open{visibility:visible;pointer-events:auto}
      #${DRAWER_ID} .shade{position:absolute;inset:0;background:rgba(45,36,33,.28);opacity:0;transition:opacity .22s;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
      #${DRAWER_ID}.open .shade{opacity:1}
      #${DRAWER_ID} .panel{position:absolute;left:0;top:0;bottom:0;width:min(86vw,390px);padding:calc(18px + env(safe-area-inset-top)) 15px calc(18px + env(safe-area-inset-bottom));background:linear-gradient(180deg,#fffdfb,#faf5f1);border-radius:0 28px 28px 0;box-shadow:20px 0 55px rgba(60,39,35,.18);overflow:auto;-webkit-overflow-scrolling:touch;transform:translateX(-102%);transition:transform .24s cubic-bezier(.22,.78,.28,1)}
      #${DRAWER_ID}.open .panel{transform:none}
      #${DRAWER_ID} .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:5px 8px 18px}
      #${DRAWER_ID} .brand small{display:block;color:var(--adm-muted);font-size:9px;font-weight:700;letter-spacing:.24em}
      #${DRAWER_ID} .brand strong{display:block;margin-top:2px;color:var(--adm-brown);font-family:Georgia,"Times New Roman",serif;font-size:35px;line-height:1;font-style:italic;font-weight:500;letter-spacing:-.04em}
      #${DRAWER_ID} .brand em{display:block;margin-top:7px;color:var(--adm-brown2);font-style:normal;font-size:10px;font-weight:700;letter-spacing:.28em}
      #${DRAWER_ID} .close{width:40px;height:40px;padding:0;border:0;background:transparent;color:var(--adm-brown);display:grid;place-items:center}
      #${DRAWER_ID} nav{display:grid;gap:5px}
      #${DRAWER_ID} .item{width:100%;padding:11px 10px;border:0;border-radius:17px;background:transparent;color:var(--adm-brown);display:grid;grid-template-columns:38px 1fr 20px;gap:10px;align-items:center;text-align:left}
      #${DRAWER_ID} .item.active{background:linear-gradient(135deg,#f4e5e1,#f8efec);box-shadow:inset 0 0 0 1px rgba(216,184,176,.38)}
      #${DRAWER_ID} .ico{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:var(--adm-brown)}
      #${DRAWER_ID} .item.active .ico{background:rgba(255,255,255,.62)}
      #${DRAWER_ID} .txt b{display:block;color:var(--adm-text);font-size:15px;line-height:1.2;font-weight:650;letter-spacing:-.025em}
      #${DRAWER_ID} .txt small{display:block;margin-top:4px;color:var(--adm-muted);font-size:11px;line-height:1.35;font-weight:430}
      #${DRAWER_ID} .arr{color:var(--adm-brown2);display:grid;place-items:center}
      #${DRAWER_ID} .pending{display:none;margin-left:6px;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--adm-wait);color:#fff;font-size:10px;font-weight:900;align-items:center;justify-content:center}
      #${DRAWER_ID} .pending.show{display:inline-flex}
      #${DRAWER_ID} .divider{height:1px;background:var(--adm-line);margin:10px 8px}
      #${DRAWER_ID} .foot{padding:17px 12px 4px;color:#aa9992;font-family:Georgia,"Times New Roman",serif;font-size:15px;font-style:italic;line-height:1.25}
      #${DASH_ID}{display:none}
      #${DASH_ID}.active{display:block}
      #${DASH_ID} .hello{display:flex;justify-content:space-between;align-items:end;gap:14px;margin:4px 0 16px}
      #${DASH_ID} .hello h2{margin:0;color:var(--adm-text);font-size:25px;letter-spacing:-.04em}
      #${DASH_ID} .hello p{margin:5px 0 0;color:var(--adm-muted);font-size:13px}
      #${DASH_ID} .date{color:var(--adm-brown2);font-size:12px;white-space:nowrap}
      #${DASH_ID} .summary{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:22px}
      #${DASH_ID} .summary article{padding:14px;border:1px solid var(--adm-line);border-radius:19px;background:var(--adm-card);box-shadow:0 8px 24px rgba(67,45,40,.04)}
      #${DASH_ID} .summary small{color:var(--adm-muted);font-size:11px;font-weight:650}
      #${DASH_ID} .summary b{display:block;margin-top:7px;color:var(--adm-text);font-size:24px;letter-spacing:-.04em}
      #${DASH_ID} .section{margin:24px 0}
      #${DASH_ID} .head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}
      #${DASH_ID} .head h3{margin:0;color:var(--adm-text);font-size:19px;letter-spacing:-.03em}
      #${DASH_ID} .head button{border:0;background:transparent;color:var(--adm-brown2);font-size:12px;font-weight:700}
      #${DASH_ID} .today{padding:4px 14px;border:1px solid var(--adm-line);border-radius:20px;background:var(--adm-card)}
      #${DASH_ID} .booking{display:grid;grid-template-columns:54px 1fr auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid #eee3de}
      #${DASH_ID} .booking:last-child{border-bottom:0}
      #${DASH_ID} .booking time{color:var(--adm-text);font-size:13px;font-weight:800}
      #${DASH_ID} .booking b{display:block;color:var(--adm-text);font-size:13px}
      #${DASH_ID} .booking small{display:block;margin-top:3px;color:var(--adm-muted);font-size:11px}
      #${DASH_ID} .status{min-width:52px;padding:6px 9px;border-radius:999px;background:#f1e8e4;color:var(--adm-brown);text-align:center;font-size:11px;font-weight:800}
      #${DASH_ID} .status.wait{background:#f7dddd;color:var(--adm-wait)}
      #${DASH_ID} .empty{padding:20px 8px;color:var(--adm-muted);text-align:center;font-size:12px}
      #${DASH_ID} .quick{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
      #${DASH_ID} .quick button{min-height:72px;padding:13px;border:1px solid var(--adm-line);border-radius:18px;background:var(--adm-card);color:var(--adm-brown);display:flex;align-items:center;gap:10px;text-align:left}
      #${DASH_ID} .quick span{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--adm-soft);display:grid;place-items:center}
      #${DASH_ID} .quick b{color:var(--adm-text);font-size:13px;font-weight:650}
      .admSubnav{display:flex;gap:7px;margin:0 0 14px;overflow:auto;padding-bottom:2px}
      .admSubnav button{padding:9px 13px;border:1px solid var(--adm-line);border-radius:999px;background:var(--adm-card);color:var(--adm-muted);white-space:nowrap;font-size:12px;font-weight:700}
      .admSubnav button.active{background:var(--adm-brown);border-color:var(--adm-brown);color:#fff}
      .reservationItem.pendingApproval{border-color:#e3b9b9!important;background:#fff9f8!important}
      .reservationItem.pendingApproval .reservationSelect{color:var(--adm-wait)!important;font-weight:800!important}
      .reservationSelect,.reservationStatus{color:var(--adm-brown)!important}
      @media(max-width:430px){#adminApp .adminHeaderActions .secondary{display:none}}
    `;
    document.head.appendChild(s);
  }

  function item(action,ico,title,sub,badge=''){
    return `<button type="button" class="item" data-action="${action}"><span class="ico">${svg[ico]}</span><span class="txt"><b>${title}${badge}</b><small>${sub}</small></span><span class="arr">${svg.chev}</span></button>`;
  }

  function ensureDrawer(){
    if(q('#'+DRAWER_ID))return;
    const w=document.createElement('div');w.id=DRAWER_ID;
    w.innerHTML=`<div class="shade" data-close></div><aside class="panel"><div class="top"><div class="brand"><small>BEAUTY SALON</small><strong>S’nail</strong><em>MANAGER</em></div><button class="close" type="button" data-close>${svg.close}</button></div><nav>${item('dashboard','home','대시보드','오늘 예약과 매장 현황')}${item('reservations','calendar','예약 관리','예약목록 · 직접예약 · 승인','<span id="admPendingBadge" class="pending">0</span>')}${item('customers','users','고객 관리','고객목록 · 메모 · 이용내역')}${item('services','scissors','서비스 관리','서비스 · 가격 · 담당자')}${item('recommended-styles','image','추천 스타일','사진 등록 · 편집')}${item('store','store','매장 설정','기본정보 · 영업시간 · 휴무일')}${item('customer-screen','screen','손님 화면 설정','상단 로고 · 인트로 편집')}${item('policy','gear','예약 정책','취소정책 · 예약 방식')}<div class="divider"></div>${item('logout','logout','로그아웃','관리자 계정에서 나가기')}</nav><div class="foot">Good Beauty<br>Better Days</div></aside>`;
    document.body.appendChild(w);
    w.addEventListener('click',e=>{
      if(e.target.closest('[data-close]')){closeDrawer();return}
      const b=e.target.closest('[data-action]');if(!b)return;
      const a=b.dataset.action;
      if(a==='logout'){q('#logoutButton')?.click();closeDrawer();return}
      activate(a);closeDrawer();
    });
  }

  function ensureOpen(){
    if(q('#'+OPEN_ID))return;
    const h=q('#adminApp .adminHeader');if(!h)return;
    const b=document.createElement('button');b.id=OPEN_ID;b.type='button';b.innerHTML=svg.menu;b.setAttribute('aria-label','관리자 메뉴 열기');b.onclick=openDrawer;h.insertBefore(b,h.firstChild);
  }

  function ensureDashboard(){
    if(q('#'+DASH_ID))return;
    const main=q('#adminApp main');if(!main)return;
    const p=document.createElement('section');p.id=DASH_ID;p.className='adminPanel';p.dataset.panel='dashboard';
    p.innerHTML=`<div class="hello"><div><h2>안녕하세요!</h2><p>오늘도 좋은 하루 되세요.</p></div><span id="admDate" class="date"></span></div><div class="summary"><article><small>오늘 예약</small><b id="admTodayCount">0</b></article><article><small>예약 대기</small><b id="admPendingCount">0</b></article><article><small>고객</small><b id="admCustomerCount">0</b></article><article><small>서비스</small><b id="admServiceCount">0</b></article></div><section class="section"><div class="head"><h3>오늘 예약 현황</h3><button type="button" data-go="reservations">전체 보기 ›</button></div><div id="admTodayList" class="today"></div></section><section class="section"><div class="head"><h3>빠른 작업</h3></div><div class="quick"><button data-quick="direct"><span>${svg.calendar}</span><b>직접 예약</b></button><button data-quick="customer"><span>${svg.search}</span><b>고객 검색</b></button><button data-quick="style"><span>${svg.plus}</span><b>스타일 등록</b></button><button data-quick="notice"><span>${svg.notice}</span><b>공지 수정</b></button></div></section>`;
    main.insertBefore(p,main.firstChild);
    p.addEventListener('click',e=>{
      const go=e.target.closest('[data-go]');if(go){activate(go.dataset.go);return}
      const x=e.target.closest('[data-quick]')?.dataset.quick;if(!x)return;
      if(x==='direct'){activate('reservations');setTimeout(()=>q('#adminDirectBookingOpen')?.click(),100)}
      if(x==='customer'){activate('customers');setTimeout(()=>q('#customerSearch')?.focus(),120)}
      if(x==='style'){activate('recommended-styles');setTimeout(()=>q('#addRecommendedStyle')?.click(),120)}
      if(x==='notice'){activate('store');setTimeout(()=>{q('#aNotice')?.scrollIntoView({behavior:'smooth',block:'center'});q('#aNotice')?.focus()},120)}
    });
  }

  function openDrawer(){refreshDashboard();q('#'+DRAWER_ID)?.classList.add('open');document.body.classList.add('admDrawerOpen')}
  function closeDrawer(){q('#'+DRAWER_ID)?.classList.remove('open');document.body.classList.remove('admDrawerOpen')}
  function clickTab(name){const b=q(`.adminTabs [data-tab="${name}"]`);if(b){b.click();return true}return false}
  function setActive(a){qa(`#${DRAWER_ID} [data-action]`).forEach(b=>b.classList.toggle('active',b.dataset.action===a))}
  function clearSub(){qa('.admSubnav').forEach(x=>x.remove())}

  function subnav(group){
    clearSub();const svc=group==='services';const host=q(`.adminPanel[data-panel="${svc?'services':'store'}"]`);const title=host?.querySelector('.panelTitle');if(!title)return;
    const bar=document.createElement('div');bar.className='admSubnav';bar.innerHTML=svc?'<button class="active" data-sub="services">서비스</button><button data-sub="staff">담당자</button>':'<button class="active" data-sub="store">기본정보</button><button data-sub="schedule">시간 · 휴무</button>';title.insertAdjacentElement('afterend',bar);
    bar.onclick=e=>{const b=e.target.closest('[data-sub]');if(!b)return;clickTab(b.dataset.sub);subnav(group);qa('.admSubnav button').forEach(x=>x.classList.toggle('active',x.dataset.sub===b.dataset.sub))};
  }

  function activate(a){
    clearSub();
    if(a==='dashboard'){qa('.adminPanel').forEach(p=>p.classList.remove('active'));q('#'+DASH_ID)?.classList.add('active');setActive(a);refreshDashboard();window.scrollTo({top:0,behavior:'smooth'});return}
    if(a==='customer-screen'){clickTab('store');setActive(a);setTimeout(()=>{(q('#adminHomeHeaderCard')||q('#adminIntroEditorCard'))?.scrollIntoView({behavior:'smooth',block:'start'})},140);return}
    if(a==='policy'){clickTab('reservations');setActive(a);setTimeout(()=>q('#adminCustomerCancelPolicyCard')?.scrollIntoView({behavior:'smooth',block:'start'}),140);return}
    clickTab(a);setActive(a);if(a==='services')subnav('services');if(a==='store')subnav('store');window.scrollTo({top:0,behavior:'smooth'});
  }

  function kstToday(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=t=>p.find(x=>x.type===t)?.value||'';return `${g('year')}-${g('month')}-${g('day')}`}

  function refreshDashboard(){
    if(!q('#'+DASH_ID)||typeof data==='undefined')return;
    const rs=Array.isArray(data.reservations)?data.reservations:[];const day=kstToday();const todayRows=rs.filter(r=>r.date===day&&!['취소','노쇼','예약거절'].includes(r.status)).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));const pending=rs.filter(r=>r.status==='예약대기').length;
    q('#admDate').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short'}).format(new Date());q('#admTodayCount').textContent=todayRows.length;q('#admPendingCount').textContent=pending;q('#admPendingCount').style.color=pending?'var(--adm-wait)':'';q('#admCustomerCount').textContent=(data.customers||[]).filter(c=>!c.archivedAt).length;q('#admServiceCount').textContent=(data.services||[]).filter(s=>s.active!==false).length;
    q('#admTodayList').innerHTML=todayRows.length?todayRows.map(r=>`<article class="booking"><time>${esc(r.time||'')}</time><div><b>${esc(r.customerName||'고객')}</b><small>${esc(r.serviceName||'')} · ${esc(r.staffName||'담당없음')}</small></div><span class="status${r.status==='예약대기'?' wait':''}">${esc(r.status||'')}</span></article>`).join(''):'<div class="empty">오늘 등록된 예약이 없습니다.</div>';
    const badge=q('#admPendingBadge');if(badge){badge.textContent=pending;badge.classList.toggle('show',pending>0)}
  }

  function install(){
    addStyles();ensureDrawer();ensureOpen();ensureDashboard();
    const app=q('#adminApp');
    if(app&&!app.classList.contains('hidden')){activate('dashboard');return}
    if(app){const ob=new MutationObserver(()=>{if(!app.classList.contains('hidden')){ob.disconnect();setTimeout(()=>activate('dashboard'),100)}});ob.observe(app,{attributes:true,attributeFilter:['class']})}
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
