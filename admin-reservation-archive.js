/* Smart Store - monthly reservation archive + swipe delete */
(() => {
  const STYLE_ID='adminReservationArchiveStyle';
  const MODAL_ID='reservationDeleteModal';
  const openGroups=new Set();
  const deleteGroups=new Map();
  let deleteSequence=0;
  let swipeState=null;
  let suppressClickUntil=0;

  const safeEsc=(v='')=>typeof esc==='function'
    ? esc(v)
    : String(v).replace(/[&<>"']/g,m=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
      }[m]));

  const safeMoney=n=>typeof money==='function'
    ? money(n)
    : `${Number(n||0).toLocaleString('ko-KR')}원`;

  function addStyles(){
    const old=document.getElementById(STYLE_ID);
    if(old)old.remove();

    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #reservationList.reservationArchiveList{display:grid;gap:12px}
      .reservationArchiveSection{display:grid;gap:10px}
      .reservationArchiveSectionLabel{
        margin:6px 2px 1px;
        color:#8f7f79;
        font-size:13.5px;
        font-weight:900;
        letter-spacing:.01em
      }

      .reservationSwipe{
        position:relative;
        overflow:hidden;
        border-radius:18px
      }

      .reservationSwipeDelete{
        position:absolute;
        inset:0 auto 0 0;
        width:88px;
        border:0;
        border-radius:18px 0 0 18px;
        background:#b24e4e;
        color:#fff;
        font-weight:900;
        display:flex;
        align-items:center;
        justify-content:center;
        z-index:1
      }

      .reservationSwipeContent{
        position:relative;
        z-index:2;
        transform:translateX(0);
        transition:transform .2s ease;
        touch-action:pan-y;
        background:#fff;
        border-radius:18px
      }

      .reservationSwipe.dragging .reservationSwipeContent{
        transition:none
      }

      .reservationGroupCard{
        border:1px solid #eadfda;
        border-radius:18px;
        box-shadow:0 5px 15px rgba(81,60,52,.04);
        overflow:hidden
      }

      .reservationGroupToggle{
        width:100%;
        border:0;
        background:#fff;
        color:#4b3c37;
        padding:16px 16px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        text-align:left
      }

      .reservationGroupMain{min-width:0}

      .reservationGroupTitle{
        display:block;
        font-size:16.5px;
        font-weight:900;
        line-height:1.3
      }

      .reservationGroupMeta{
        display:block;
        margin-top:5px;
        color:#968983;
        font-size:13.5px;
        font-weight:750
      }

      .reservationGroupArrow{
        flex:0 0 auto;
        color:#9c8b84;
        font-size:18px;
        transition:transform .18s ease
      }

      .reservationGroupCard.open > .reservationSwipe .reservationGroupArrow{
        transform:rotate(180deg)
      }

      .reservationGroupBody{
        display:grid;
        gap:9px;
        padding:0 10px 10px;
        background:#fbf8f6
      }

      .reservationGroupBody.hidden{display:none}

      .reservationGroupBody .reservationSwipe{border-radius:15px}
      .reservationGroupBody .reservationSwipeContent{border-radius:15px}
      .reservationGroupBody .reservationSwipeDelete{border-radius:15px 0 0 15px}
      .reservationGroupBody .reservationGroupCard{border-radius:15px}
      .reservationGroupBody .reservationGroupToggle{padding:14px 14px}
      .reservationGroupBody .reservationGroupBody{padding:0 8px 8px}

      .reservationArchiveItem{
        margin:0!important;
        border-radius:15px!important
      }

      .reservationArchiveItem.adminItem{
        padding:14px 14px
      }

      .reservationArchiveItem h3{
        font-size:15.5px
      }

      .reservationArchiveItem p{
        font-size:13.5px;
        line-height:1.45
      }

      .reservationArchiveEmpty{
        margin:0;
        padding:15px 13px;
        border:1px dashed #e5d9d4;
        border-radius:14px;
        color:#9a8c86;
        text-align:center;
        font-size:13.5px;
        background:#fff
      }

      .reservationArchiveItem .reservationEditActions{
        min-width:112px
      }

      #${MODAL_ID}{z-index:100002}
      #${MODAL_ID} .reservationDeleteBox{width:min(92vw,430px)}
      #${MODAL_ID} .reservationDeleteIcon{
        width:48px;
        height:48px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        margin:0 auto 12px;
        background:#f5dddd;
        color:#a54848;
        font-size:22px;
        font-weight:900
      }
      #${MODAL_ID} h3{text-align:center;margin:0}
      #${MODAL_ID} p{
        text-align:center;
        color:#806f69;
        line-height:1.55;
        margin:10px 0 18px;
        white-space:pre-line
      }
      #${MODAL_ID} .confirmActions{grid-template-columns:1fr 1fr}
      #${MODAL_ID} .reservationDeleteConfirm{
        background:#a94f4f;
        color:#fff
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDeleteModal(){
    if(document.getElementById(MODAL_ID))return;

    const wrap=document.createElement('div');
    wrap.id=MODAL_ID;
    wrap.className='modalBackdrop hidden';
    wrap.innerHTML=`
      <section class="confirmBox reservationDeleteBox">
        <div class="reservationDeleteIcon">!</div>
        <h3 id="reservationDeleteTitle">삭제하시겠습니까?</h3>
        <p id="reservationDeleteText"></p>
        <div class="confirmActions">
          <button id="reservationDeleteCancel" class="secondary" type="button">취소</button>
          <button id="reservationDeleteConfirm" class="reservationDeleteConfirm" type="button">삭제</button>
        </div>
      </section>
    `;
    document.body.appendChild(wrap);
  }

  function askDelete(title,text,confirmLabel){
    ensureDeleteModal();

    return new Promise(resolve=>{
      const modal=document.getElementById(MODAL_ID);
      const cancel=document.getElementById('reservationDeleteCancel');
      const confirm=document.getElementById('reservationDeleteConfirm');

      document.getElementById('reservationDeleteTitle').textContent=title;
      document.getElementById('reservationDeleteText').textContent=text;
      confirm.textContent=confirmLabel;

      modal.classList.remove('hidden');

      const done=value=>{
        modal.classList.add('hidden');
        cancel.onclick=null;
        confirm.onclick=null;
        resolve(value);
      };

      cancel.onclick=()=>done(false);
      confirm.onclick=()=>done(true);
    });
  }

  function dateObj(date){
    const [y,m,d]=String(date).split('-').map(Number);
    return new Date(Date.UTC(y,m-1,d));
  }

  function dateStr(d){
    return d.toISOString().slice(0,10);
  }

  function addDays(date,days){
    const d=dateObj(date);
    d.setUTCDate(d.getUTCDate()+days);
    return dateStr(d);
  }

  function startOfWeek(date){
    const d=dateObj(date);
    const diff=(d.getUTCDay()+6)%7;
    d.setUTCDate(d.getUTCDate()-diff);
    return dateStr(d);
  }

  function monthKey(date){
    return String(date).slice(0,7);
  }

  function yearKey(date){
    return String(date).slice(0,4);
  }

  function md(date){
    const [,m,d]=String(date).split('-').map(Number);
    return `${m}/${d}`;
  }

  function currentKstDate(){
    return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).format(new Date());
  }

  function monthStart(month){
    return `${month}-01`;
  }

  function monthEnd(month){
    const [year,mon]=String(month).split('-').map(Number);
    return dateStr(new Date(Date.UTC(year,mon,0)));
  }

  function monthWeekRanges(month){
    const first=monthStart(month);
    const last=monthEnd(month);
    let weekStart=startOfWeek(first);
    const ranges=[];

    while(weekStart<=last){
      const realEnd=addDays(weekStart,6);
      const displayStart=weekStart<first?first:weekStart;
      const displayEnd=realEnd>last?last:realEnd;

      ranges.push({
        weekStart,
        displayStart,
        displayEnd
      });

      weekStart=addDays(weekStart,7);
    }

    return ranges;
  }

  function sortedReservations(rs){
    return [...rs].sort((a,b)=>
      (a.date+a.time).localeCompare(b.date+b.time)
    );
  }

  function registerDelete(ids,label){
    const key=`delete-${++deleteSequence}`;
    deleteGroups.set(key,{
      ids:[...new Set(ids)],
      label
    });
    return key;
  }

  function swipeWrap(content,key=null){
    return `
      <div
        class="reservationSwipe"
        data-swipe-wrap
        ${key?'':'data-swipe-disabled="1"'}>
        ${key
          ?`<button
              class="reservationSwipeDelete"
              type="button"
              data-res-delete-key="${key}">
              삭제
            </button>`
          :''
        }
        <div class="reservationSwipeContent">
          ${content}
        </div>
      </div>
    `;
  }

  function groupCard({
    key,
    title,
    meta,
    body,
    deleteIds,
    deleteLabel
  }){
    const isOpen=openGroups.has(key);

    const deleteKey=deleteIds.length
      ?registerDelete(deleteIds,deleteLabel)
      :null;

    return `
      <section
        class="reservationGroupCard ${isOpen?'open':''}"
        data-res-group="${key}">

        <div
          class="reservationSwipe"
          data-swipe-wrap
          ${deleteKey?'':'data-swipe-disabled="1"'}>

          ${deleteKey
            ?`<button
                class="reservationSwipeDelete"
                type="button"
                data-res-delete-key="${deleteKey}">
                삭제
              </button>`
            :''
          }

          <div class="reservationSwipeContent">
            <button
              class="reservationGroupToggle"
              type="button"
              data-group-toggle="${key}"
              aria-expanded="${isOpen?'true':'false'}">

              <span class="reservationGroupMain">
                <span class="reservationGroupTitle">
                  ${safeEsc(title)}
                </span>
                <span class="reservationGroupMeta">
                  ${safeEsc(meta)}
                </span>
              </span>

              <span class="reservationGroupArrow">⌄</span>
            </button>
          </div>
        </div>

        <div
          class="reservationGroupBody ${isOpen?'':'hidden'}"
          data-group-body="${key}">
          ${body}
        </div>
      </section>
    `;
  }

  function reservationCard(r){
    const statuses=[
      '예약대기',
      '예약확정',
      '방문완료',
      '예약거절',
      '취소',
      '노쇼'
    ];

    const deleteKey=registerDelete(
      [r.id],
      `${r.date} ${r.time} · ${r.customerName||'고객'} 예약`
    );

    const content=`
      <article
        class="adminItem reservationItem reservationArchiveItem ${r.status==='예약대기'?'pendingApproval':''}">

        <div>
          <h3>
            ${safeEsc(r.date)} ${safeEsc(r.time)} · ${safeEsc(r.customerName||'고객')}
          </h3>
          <p>
            ${safeEsc(r.serviceName||'')} ·
            ${safeEsc(r.staffName||'담당없음')} ·
            ${safeMoney(r.price)}
          </p>
        </div>

        <select
          class="reservationSelect"
          data-res-status="${r.id}">
          ${statuses
            .map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`)
            .join('')
          }
        </select>
      </article>
    `;

    return swipeWrap(content,deleteKey);
  }

  function weekBody(rs){
    const sorted=sortedReservations(rs);

    return sorted.length
      ?sorted.map(reservationCard).join('')
      :'<p class="reservationArchiveEmpty">예약이 없습니다.</p>';
  }

  function weekCard(
    weekStart,
    rs,
    keyPrefix='week',
    displayStart=weekStart,
    displayEnd=addDays(weekStart,6)
  ){
    const count=rs.length;
    const key=`${keyPrefix}:${weekStart}`;

    return groupCard({
      key,
      title:`${md(displayStart)} ~ ${md(displayEnd)}`,
      meta:`예약 ${count}건`,
      body:weekBody(rs),
      deleteIds:rs.map(r=>r.id),
      deleteLabel:`${md(displayStart)} ~ ${md(displayEnd)} 예약 ${count}건 전체`
    });
  }

  function currentMonthWeeks(rs,month){
    return monthWeekRanges(month)
      .map(range=>{
        const items=rs.filter(r=>
          r.date>=range.displayStart &&
          r.date<=range.displayEnd
        );

        return weekCard(
          range.weekStart,
          items,
          `current-month-week:${month}`,
          range.displayStart,
          range.displayEnd
        );
      })
      .join('');
  }

  function archivedMonthWeeks(rs,keyPrefix,month){
    return monthWeekRanges(month)
      .map(range=>{
        const items=rs.filter(r=>
          r.date>=range.displayStart &&
          r.date<=range.displayEnd
        );

        if(!items.length)return '';

        return weekCard(
          range.weekStart,
          items,
          keyPrefix,
          range.displayStart,
          range.displayEnd
        );
      })
      .join('');
  }

  function monthCard(key,rs,kind='month'){
    const [year,month]=key.split('-');
    const count=rs.length;

    return groupCard({
      key:`${kind}:${key}`,
      title:`${Number(year)}년 ${Number(month)}월`,
      meta:`예약 ${count}건`,
      body:archivedMonthWeeks(
        rs,
        `${kind}-week:${key}`,
        key
      ),
      deleteIds:rs.map(r=>r.id),
      deleteLabel:`${Number(year)}년 ${Number(month)}월 예약 ${count}건 전체`
    });
  }

  function monthsWithinYear(year,rs){
    const groups=new Map();

    sortedReservations(rs).forEach(r=>{
      const mk=monthKey(r.date);
      if(!groups.has(mk))groups.set(mk,[]);
      groups.get(mk).push(r);
    });

    return [...groups.entries()]
      .sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([mk,items])=>
        monthCard(
          mk,
          items,
          `year-${year}-month`
        )
      )
      .join('');
  }

  function yearCard(year,rs){
    const count=rs.length;

    return groupCard({
      key:`year:${year}`,
      title:`${Number(year)}년`,
      meta:`총 예약 ${count}건`,
      body:monthsWithinYear(year,rs),
      deleteIds:rs.map(r=>r.id),
      deleteLabel:`${Number(year)}년 예약 ${count}건 전체`
    });
  }

  function renderArchive(){
    addStyles();
    ensureDeleteModal();

    const list=document.getElementById('reservationList');

    if(
      !list ||
      typeof data==='undefined' ||
      !Array.isArray(data.reservations)
    )return;

    deleteGroups.clear();
    deleteSequence=0;
    list.classList.add('reservationArchiveList');

    const rs=sortedReservations(data.reservations);
    const today=currentKstDate();
    const currentMonth=monthKey(today);
    const currentStart=monthStart(currentMonth);
    const currentEnd=monthEnd(currentMonth);
    const currentYear=Number(today.slice(0,4));

    const currentMonthReservations=rs.filter(r=>
      r.date>=currentStart &&
      r.date<=currentEnd
    );

    const past=rs.filter(r=>r.date<currentStart);
    const future=rs.filter(r=>r.date>currentEnd);

    const pastYears=new Map();
    const pastMonths=new Map();

    past.forEach(r=>{
      const year=Number(yearKey(r.date));

      if(year<currentYear){
        const y=String(year);

        if(!pastYears.has(y))pastYears.set(y,[]);
        pastYears.get(y).push(r);
      }else{
        const m=monthKey(r.date);

        if(!pastMonths.has(m))pastMonths.set(m,[]);
        pastMonths.get(m).push(r);
      }
    });

    const futureMonths=new Map();

    future.forEach(r=>{
      const m=monthKey(r.date);

      if(!futureMonths.has(m))futureMonths.set(m,[]);
      futureMonths.get(m).push(r);
    });

    const [currentYearText,currentMonthText]=currentMonth.split('-');

    const sections=[];

    sections.push(`
      <section class="reservationArchiveSection">
        <div class="reservationArchiveSectionLabel">
          ${Number(currentYearText)}년 ${Number(currentMonthText)}월 예약현황
        </div>

        ${currentMonthWeeks(
          currentMonthReservations,
          currentMonth
        )}
      </section>
    `);

    if(futureMonths.size){
      sections.push(`
        <section class="reservationArchiveSection">
          <div class="reservationArchiveSectionLabel">
            이후 예약
          </div>

          ${[...futureMonths.entries()]
            .sort((a,b)=>a[0].localeCompare(b[0]))
            .map(([m,items])=>
              monthCard(
                m,
                items,
                'future-month'
              )
            )
            .join('')
          }
        </section>
      `);
    }

    if(pastMonths.size || pastYears.size){
      sections.push(`
        <section class="reservationArchiveSection">
          <div class="reservationArchiveSectionLabel">
            지난 예약
          </div>

          ${[...pastMonths.entries()]
            .sort((a,b)=>b[0].localeCompare(a[0]))
            .map(([m,items])=>
              monthCard(
                m,
                items,
                'past-month'
              )
            )
            .join('')
          }

          ${[...pastYears.entries()]
            .sort((a,b)=>b[0].localeCompare(a[0]))
            .map(([y,items])=>
              yearCard(y,items)
            )
            .join('')
          }
        </section>
      `);
    }

    list.innerHTML=sections.join('');
    bindStatusHandlers();
  }

  function bindStatusHandlers(){
    document
      .querySelectorAll(
        '#reservationList [data-res-status]'
      )
      .forEach(sel=>{
        sel.onchange=async()=>{
          const reservationId=sel.dataset.resStatus;

          const currentReservation=
            data.reservations.find(
              r=>r.id===reservationId
            );

          const wasPending=
            currentReservation?.status==='예약대기';

          const nextStatus=sel.value;

          const {error}=await sb
            .from('reservations')
            .update({status:nextStatus})
            .eq('id',reservationId);

          if(error){
            alert(error.message);
            await loadAdminData();
            return;
          }

          if(
            wasPending &&
            ['예약확정','예약거절'].includes(nextStatus)
          ){
            await window.SmartStorePush
              ?.sendReservationStatus(reservationId);
          }

          await loadAdminData();
        };
      });
  }

  function setSwipeX(wrap,x,animate=true){
    if(!wrap)return;

    wrap.classList.toggle(
      'dragging',
      !animate
    );

    const content=
      wrap.querySelector(
        ':scope > .reservationSwipeContent'
      );

    if(content){
      content.style.transform=`translateX(${x}px)`;
    }

    wrap.dataset.swipeOpen=x>=44?'1':'0';
  }

  function closeOtherSwipes(except=null){
    document
      .querySelectorAll(
        '#reservationList [data-swipe-wrap][data-swipe-open="1"]'
      )
      .forEach(w=>{
        if(w!==except)setSwipeX(w,0,true);
      });
  }

  function onPointerDown(e){
    const content=
      e.target.closest(
        '#reservationList .reservationSwipeContent'
      );

    if(!content)return;

    const wrap=
      content.closest('[data-swipe-wrap]');

    if(!wrap)return;

    closeOtherSwipes(wrap);

    if(wrap.dataset.swipeDisabled==='1')return;

    const base=
      wrap.dataset.swipeOpen==='1'
        ?88
        :0;

    swipeState={
      wrap,
      pointerId:e.pointerId,
      startX:e.clientX,
      startY:e.clientY,
      base,
      lastX:base,
      moved:false
    };

    try{
      content.setPointerCapture(e.pointerId);
    }catch{}
  }

  function onPointerMove(e){
    if(
      !swipeState ||
      e.pointerId!==swipeState.pointerId
    )return;

    const dx=e.clientX-swipeState.startX;
    const dy=e.clientY-swipeState.startY;

    if(
      !swipeState.moved &&
      Math.abs(dx)<7 &&
      Math.abs(dy)<7
    )return;

    if(
      Math.abs(dy)>Math.abs(dx) &&
      !swipeState.moved
    )return;

    swipeState.moved=true;

    const x=Math.max(
      0,
      Math.min(
        88,
        swipeState.base+dx
      )
    );

    swipeState.lastX=x;
    setSwipeX(swipeState.wrap,x,false);
  }

  function onPointerEnd(e){
    if(
      !swipeState ||
      e.pointerId!==swipeState.pointerId
    )return;

    const {
      wrap,
      lastX,
      moved
    }=swipeState;

    if(moved){
      suppressClickUntil=Date.now()+280;
    }

    setSwipeX(
      wrap,
      lastX>=44?88:0,
      true
    );

    swipeState=null;
  }

  function idChunks(ids,size=100){
    const out=[];

    for(let i=0;i<ids.length;i+=size){
      out.push(ids.slice(i,i+size));
    }

    return out;
  }

  async function removeGoogleCalendarEvents(ids){
    const rows=[];

    for(const batch of idChunks(ids)){
      const {data:part,error}=await sb
        .from('reservations')
        .select('id,google_calendar_event_id')
        .in('id',batch);

      if(error)throw error;

      rows.push(...(part||[]));
    }

    const withEvents=
      rows.filter(r=>r.google_calendar_event_id);

    for(const row of withEvents){
      const {
        data:result,
        error:syncError
      }=await sb.functions.invoke(
        'google-calendar-delete',
        {
          body:{
            reservation_id:row.id
          }
        }
      );

      if(syncError)throw syncError;
      if(result?.error)throw new Error(result.error);
    }
  }

  async function permanentlyDelete(group){
    if(!group?.ids?.length)return;

    const first=await askDelete(
      '삭제하시겠습니까?',
      `${group.label}을 삭제합니다.`,
      '삭제'
    );

    if(!first)return;

    const second=await askDelete(
      '이 삭제는 되돌릴 수 없습니다',
      `${group.label}을 영구 삭제합니다.`,
      '확인'
    );

    if(!second)return;

    showAdminMessage?.('예약 삭제 중...');

    try{
      await removeGoogleCalendarEvents(group.ids);

      for(const batch of idChunks(group.ids)){
        const {error}=await sb
          .from('reservations')
          .delete()
          .in('id',batch);

        if(error)throw error;
      }

      await loadAdminData();

      showAdminMessage?.(
        '예약 영구 삭제 완료 ✓'
      );
    }catch(err){
      alert(
        err?.message ||
        '예약 삭제에 실패했습니다.'
      );

      showAdminMessage?.(
        '예약 삭제 실패'
      );
    }
  }

  document.addEventListener(
    'pointerdown',
    onPointerDown
  );

  document.addEventListener(
    'pointermove',
    onPointerMove
  );

  document.addEventListener(
    'pointerup',
    onPointerEnd
  );

  document.addEventListener(
    'pointercancel',
    onPointerEnd
  );

  document.addEventListener('click',e=>{
    if(
      Date.now()<suppressClickUntil &&
      e.target.closest(
        '#reservationList .reservationSwipeContent'
      )
    ){
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const deleteBtn=
      e.target.closest('[data-res-delete-key]');

    if(deleteBtn){
      const group=
        deleteGroups.get(
          deleteBtn.dataset.resDeleteKey
        );

      permanentlyDelete(group);
      return;
    }

    const toggle=
      e.target.closest('[data-group-toggle]');

    if(toggle){
      const swipe=
        toggle.closest('[data-swipe-wrap]');

      setSwipeX(swipe,0,true);
      closeOtherSwipes();

      const key=
        toggle.dataset.groupToggle;

      const card=
        toggle.closest('[data-res-group]');

      const body=
        card?.querySelector(
          `:scope > [data-group-body="${CSS.escape(key)}"]`
        );

      const open=!openGroups.has(key);

      if(open){
        openGroups.add(key);
      }else{
        openGroups.delete(key);
      }

      card?.classList.toggle(
        'open',
        open
      );

      body?.classList.toggle(
        'hidden',
        !open
      );

      toggle.setAttribute(
        'aria-expanded',
        open?'true':'false'
      );

      return;
    }

    if(
      !e.target.closest(
        '#reservationList [data-swipe-wrap]'
      )
    ){
      closeOtherSwipes();
    }
  });

  function install(){
    addStyles();
    ensureDeleteModal();

    try{
      renderReservations=renderArchive;
    }catch{}

    try{
      const previousLoadAdminData=loadAdminData;

      loadAdminData=async function(){
        await previousLoadAdminData();
        renderArchive();
      };
    }catch{}

    setTimeout(renderArchive,0);
  }

  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      install,
      {once:true}
    );
  }else{
    install();
  }
})();
