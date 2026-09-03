const DAYS=['일','월','화','수','목','금','토'];
const CONFIG=window.SMART_STORE_CONFIG;
const sb=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);
const STORE_SLUG=CONFIG.storeSlug;
const CLOUD_CACHE_KEY='smartStoreCloudCacheV1';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';

const fallbackData={
  store:{name:"S'nail",tagline:'당신의 일상에 작은 아름다움을',phone:'0212345678',address:'서울시 예시구 123',map:'https://map.naver.com/',staffLabel:'담당자',notice:'예약 전 휴무일과 담당자 일정을 확인해주세요.',introMode:'none',introMedia:'',staffEnabled:true},
  schedule:{open:'10:00',close:'20:00',slotMinutes:30,closedDays:[1],specialClosed:[],staffSpecialClosures:[]},
  services:[],staff:[]
};
let data=structuredClone(fallbackData);
let availabilityCache=new Map();
let cloudReady=false;

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function timeHHMM(v=''){return String(v).slice(0,5)}
function mapPayload(payload){
  const st=payload?.store||{};
  const staffServices=payload?.staffServices||[];
  const staffDaysOff=payload?.staffDaysOff||[];
  return {
    store:{
      id:st.id,name:st.name||"S'nail",tagline:st.tagline||'',phone:st.phone||'',address:st.address||'',map:st.map_url||'',
      staffLabel:st.staff_label||'담당자',notice:st.notice||'',introMode:st.intro_mode||'none',introMedia:st.intro_media_url||'',
      staffEnabled:st.staff_enabled!==false
    },
    schedule:{
      open:timeHHMM(st.opening_time||'10:00'),close:timeHHMM(st.closing_time||'20:00'),slotMinutes:Number(st.slot_minutes||30),
      closedDays:(payload?.closedDays||[]).map(Number),
      specialClosed:(payload?.specialClosures||[]).map(x=>({date:x.closed_date,reason:x.reason||'',isClosed:x.is_closed!==false,open:x.opening_time?timeHHMM(x.opening_time):null,close:x.closing_time?timeHHMM(x.closing_time):null})),
      staffSpecialClosures:(payload?.staffSpecialClosures||[]).map(x=>({staffId:x.staff_id,date:x.closed_date,reason:x.reason||''}))
    },
    services:(payload?.services||[]).map(s=>({id:s.id,name:s.name,price:Number(s.price||0),duration:Number(s.duration_minutes||30),desc:s.description||''})),
    staff:(payload?.staff||[]).map(s=>({
      id:s.id,name:s.name,specialty:s.specialty||'',
      services:staffServices.filter(x=>x.staff_id===s.id).map(x=>x.service_id),
      daysOff:staffDaysOff.filter(x=>x.staff_id===s.id).map(x=>Number(x.weekday))
    }))
  };
}

async function loadCloud(){
  try{
    const {data:payload,error}=await sb.rpc('public_store_payload',{p_slug:STORE_SLUG});
    if(error)throw error;
    if(!payload)throw new Error('매장 데이터를 찾을 수 없습니다.');
    data=mapPayload(payload);
    localStorage.setItem(CLOUD_CACHE_KEY,JSON.stringify(payload));
    cloudReady=true;
  }catch(err){
    console.error(err);
    try{
      const cached=JSON.parse(localStorage.getItem(CLOUD_CACHE_KEY)||'null');
      if(cached)data=mapPayload(cached);
    }catch{}
    cloudReady=false;
  }
  render();
}

function staffServiceNames(st){
  const names=(st.services||[]).map(id=>data.services.find(s=>s.id===id)?.name).filter(Boolean);
  return names.length?names.join(' · '):'없음';
}
function closedLabel(){const ds=data.schedule.closedDays.map(i=>'매주 '+DAYS[i]+'요일');return ds.length?ds.join(', '):'정기휴무 없음'}
function render(){
  $('#storeName').textContent=data.store.name;$('#introBrand').textContent=data.store.name.split(' ')[0];$('#storeTagline').textContent=data.store.tagline;
  $('#callButton').href='tel:'+data.store.phone;$('#addressText').textContent=data.store.address;$('#mapLink').href=data.store.map||'#';
  $('#noticeText').textContent=data.store.notice;$('#staffHeading').textContent=data.store.staffLabel||'담당자';$('#bookingStaffLabel').textContent=data.store.staffLabel||'담당자';
  $('#hoursText').textContent=`${data.schedule.open} - ${data.schedule.close}`;$('#closedText').textContent=closedLabel();
  $('#serviceCards').innerHTML=data.services.length?data.services.map(s=>`<article class="serviceCard"><div><h3>${esc(s.name)}</h3><p>${esc(s.desc||'')} · 약 ${s.duration}분</p></div><div><div class="price">${money(s.price)}</div><button class="textBtn" data-book-service="${s.id}">예약</button></div></article>`).join(''):'<div class="hintBox">등록된 서비스가 없습니다.</div>';
  $('#staffSection').style.display=data.store.staffEnabled?'block':'none';
  $('#staffCards').innerHTML=data.staff.map(s=>`<article class="staffCard"><div class="avatar"></div><h3>${esc(s.name)}</h3><p>${esc(s.specialty||'')}</p><p>가능 서비스 · ${esc(staffServiceNames(s))}</p><button class="textBtn" data-book-staff="${s.id}">이 ${esc(data.store.staffLabel)}로 예약</button></article>`).join('');
  setupIntro();renderBooking();
}

function setupIntro(){
  const intro=$('#intro'),mode=data.store.introMode;
  if(mode==='none'||sessionStorage.getItem('introSeen'))return;
  intro.classList.remove('hidden');intro.setAttribute('aria-hidden','false');
  const video=$('#introVideo'),img=$('#introImage');video.style.display='none';img.style.display='none';
  if(mode==='video'&&data.store.introMedia){video.src=data.store.introMedia;video.style.display='block';video.play().catch(()=>{});video.onended=closeIntro;setTimeout(closeIntro,6000)}
  else if(mode==='image'&&data.store.introMedia){img.src=data.store.introMedia;img.style.display='block';setTimeout(closeIntro,3500)}
  else setTimeout(closeIntro,1200);
}
function closeIntro(){sessionStorage.setItem('introSeen','1');$('#intro').classList.add('hidden')}
$('#skipIntro').onclick=closeIntro;

let booking={step:1,serviceId:null,staffId:null,date:null,time:null};
function openBooking(pref={}){
  booking={step:1,serviceId:pref.serviceId||null,staffId:pref.staffId||null,date:null,time:null};
  if(pref.serviceId)booking.step=data.store.staffEnabled?2:3;
  $('#bookingSheet').classList.remove('hidden');renderBooking();document.body.style.overflow='hidden';
}
function closeBooking(){$('#bookingSheet').classList.add('hidden');document.body.style.overflow=''}
function setStep(n){booking.step=n;renderBooking()}
function renderBooking(){
  if(!$('#bookingServices'))return;
  $$('.bookingStep').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===booking.step));
  $$('.steps span').forEach((x,i)=>x.classList.toggle('on',i<booking.step));
  $('#prevStep').classList.toggle('hidden',booking.step===1);
  $('#bookingServices').innerHTML=data.services.map(s=>`<button class="choice ${booking.serviceId===s.id?'selected':''}" data-service="${s.id}"><span><b>${esc(s.name)}</b><small>${s.duration}분 · ${esc(s.desc||'')}</small></span><strong>${money(s.price)}</strong></button>`).join('');
  const svc=data.services.find(s=>s.id===booking.serviceId);
  const eligible=data.staff.filter(st=>!svc||st.services?.includes(svc.id));
  $('#bookingStaff').innerHTML=data.store.staffEnabled?(eligible.length?`<button class="choice ${booking.staffId==='any'?'selected':''}" data-staff="any"><span><b>${esc(data.store.staffLabel)} 상관없음</b><small>가능한 분으로 배정</small></span><strong>›</strong></button>`+eligible.map(st=>`<button class="choice ${booking.staffId===st.id?'selected':''}" data-staff="${st.id}"><span><b>${esc(st.name)}</b><small>${esc(st.specialty||'')} · 가능 서비스 ${esc(staffServiceNames(st))}</small></span><strong>›</strong></button>`).join(''):`<div class="hintBox">선택한 서비스를 담당할 수 있는 ${esc(data.store.staffLabel||'담당자')}가 없습니다.</div>`):'<button class="choice selected"><span><b>담당자 선택 없음</b><small>담당자 지정 없이 예약합니다.</small></span></button>';
  $('#pickedTimeText').textContent=booking.date&&booking.time?`${formatDate(booking.date)} · ${booking.time}`:'날짜와 시간을 선택';
  $('#toCustomerInfo').disabled=!(booking.date&&booking.time);
  $('#closureHint').textContent=`매장 휴무일: ${closedLabel()}${data.schedule.specialClosed.filter(x=>x.isClosed).length?' · 임시휴무 '+data.schedule.specialClosed.filter(x=>x.isClosed).map(x=>x.date).join(', '):''}`;
  const timeBack=$('#timeBackToStaff');if(timeBack)timeBack.textContent=data.store.staffEnabled?`‹ ${data.store.staffLabel||'담당자'} 다시 선택`:'‹ 서비스 다시 선택';
}
$('#bookingSheet').addEventListener('click',e=>{
  const s=e.target.closest('[data-service]');
  if(s){const changed=booking.serviceId!==s.dataset.service;booking.serviceId=s.dataset.service;if(changed){booking.staffId=null;booking.date=null;booking.time=null}setStep(data.store.staffEnabled?2:3)}
  const st=e.target.closest('[data-staff]');
  if(st){const changed=booking.staffId!==st.dataset.staff;booking.staffId=st.dataset.staff;if(changed){booking.date=null;booking.time=null}setStep(3)}
});
$('#prevStep').onclick=()=>setStep(Math.max(1,booking.step-1));
$('#toCustomerInfo').onclick=()=>setStep(4);

function buildDateStrip(){
  const wrap=$('#dateStrip');wrap.innerHTML='';
  for(let i=0;i<21;i++){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);const iso=isoDate(d);const closed=isStoreClosed(iso);
    const b=document.createElement('button');b.className='dateBtn'+(booking.date===iso?' active':'')+(closed?' closed':'');
    b.innerHTML=`<small>${i===0?'오늘':DAYS[d.getDay()]}</small><b>${d.getMonth()+1}/${d.getDate()}</b>`;
    b.onclick=async()=>{booking.date=iso;booking.time=null;buildDateStrip();await renderTimes()};wrap.appendChild(b);
  }
}
function openTime(){if(!booking.serviceId){setStep(1);return}$('#timeSheet').classList.remove('hidden');buildDateStrip();renderTimes()}
function closeTime(){$('#timeSheet').classList.add('hidden')}
function backFromTime(){closeTime();setStep(data.store.staffEnabled?2:1)}
function specialClosure(iso){return data.schedule.specialClosed.find(x=>x.date===iso)}
function isStoreClosed(iso){const d=new Date(iso+'T12:00:00');const sp=specialClosure(iso);return data.schedule.closedDays.includes(d.getDay())||!!sp?.isClosed}
function staffIsOff(st,iso){
  if(!st)return false;const d=new Date(iso+'T12:00:00');
  return st.daysOff?.includes(d.getDay())||data.schedule.staffSpecialClosures.some(x=>x.staffId===st.id&&x.date===iso);
}
async function getDayReservations(iso){
  if(availabilityCache.has(iso))return availabilityCache.get(iso);
  if(!cloudReady)return [];
  const {data:rows,error}=await sb.rpc('public_day_reservations',{p_slug:STORE_SLUG,p_date:iso});
  if(error){console.error(error);return []}
  const normalized=(rows||[]).map(r=>({staffId:r.staff_id||null,staffAny:!!r.staff_any,time:timeHHMM(r.time),duration:Number(r.duration||30)}));
  availabilityCache.set(iso,normalized);return normalized;
}
function overlap(a,b,c,d){return Math.max(a,c)<Math.min(b,d)}
function toMin(t){const[a,b]=String(t).split(':').map(Number);return a*60+b}
function hasConflict(rows,staffId,time,duration){
  const start=toMin(time),end=start+duration;
  return rows.some(r=>r.staffId===staffId&&overlap(start,end,toMin(r.time),toMin(r.time)+r.duration));
}
function eligibleStaffForDate(iso){
  const svc=data.services.find(s=>s.id===booking.serviceId);
  return data.staff.filter(st=>(!svc||st.services.includes(svc.id))&&!staffIsOff(st,iso));
}
async function renderTimes(){
  const grid=$('#timeGrid'),status=$('#dayStatus');grid.innerHTML='';
  if(!booking.date){status.textContent='날짜를 먼저 선택해주세요.';return}
  const sp=specialClosure(booking.date);
  if(isStoreClosed(booking.date)){status.textContent=sp?.reason?`매장 휴무 · ${sp.reason}`:'매장 정기 휴무일입니다.';return}
  const st=booking.staffId&&booking.staffId!=='any'?data.staff.find(x=>x.id===booking.staffId):null;
  if(staffIsOff(st,booking.date)){status.textContent=`${st.name} ${data.store.staffLabel}의 휴무일입니다. 다른 담당자를 선택해주세요.`;return}
  status.textContent='예약 가능시간을 확인하고 있습니다...';
  const rows=await getDayReservations(booking.date);const svc=data.services.find(s=>s.id===booking.serviceId);const duration=svc?.duration||data.schedule.slotMinutes;
  const slots=makeSlots(sp&&!sp.isClosed&&sp.open?sp.open:data.schedule.open,sp&&!sp.isClosed&&sp.close?sp.close:data.schedule.close,data.schedule.slotMinutes);
  status.textContent=`${formatDate(booking.date)} · 예약 가능한 시간만 선택할 수 있습니다.`;
  const candidates=eligibleStaffForDate(booking.date);
  slots.forEach(t=>{
    let disabled=false;
    if(booking.staffId&&booking.staffId!=='any')disabled=hasConflict(rows,booking.staffId,t,duration);
    else if(data.store.staffEnabled)disabled=!candidates.length||candidates.every(x=>hasConflict(rows,x.id,t,duration));
    const b=document.createElement('button');b.className='timeBtn';b.textContent=t;b.disabled=disabled;b.onclick=()=>confirmTime(t);grid.appendChild(b);
  });
}
function makeSlots(open,close,step){let[h,m]=open.split(':').map(Number),[eh,em]=close.split(':').map(Number),a=[],cur=h*60+m,end=eh*60+em;while(cur<end){a.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);cur+=Number(step)}return a}
function confirmTime(t){showConfirm({title:'시간을 선택하시겠습니까?',body:`<p><b>${formatDate(booking.date)} ${t}</b>로 선택합니다.</p>`,ok:'선택',cancel:'아니오',onOk:()=>{booking.time=t;closeTime();renderBooking()}})}
function formatDate(iso){const d=new Date(iso+'T12:00:00');return `${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`}
const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

let confirmCb=null;
function showConfirm({title,body,ok='확인',cancel='아니오',onOk,single=false}){
  $('#confirmTitle').textContent=title;$('#confirmBody').innerHTML=body;$('#confirmOk').textContent=ok;$('#confirmCancel').textContent=cancel;
  $('#confirmCancel').style.display=single?'none':'';$('.confirmActions').style.gridTemplateColumns=single?'1fr':'';confirmCb=onOk;$('#confirmModal').classList.remove('hidden');
}
function hideConfirm(){$('#confirmModal').classList.add('hidden');confirmCb=null;$('#confirmCancel').style.display='';$('.confirmActions').style.gridTemplateColumns=''}
$('#confirmCancel').onclick=hideConfirm;$('#confirmOk').onclick=()=>{const cb=confirmCb;hideConfirm();cb?.()};
$('#finalReview').onclick=()=>{
  const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim();
  if(!name||phone.replace(/\D/g,'').length<9){showConfirm({title:'예약자 정보를 확인해주세요',body:'<p>이름과 올바른 전화번호를 입력해주세요.</p>',ok:'확인',single:true});return}
  const svc=data.services.find(s=>s.id===booking.serviceId);const st=booking.staffId==='any'?'상관없음':(data.staff.find(s=>s.id===booking.staffId)?.name||'-');
  showConfirm({title:'예약 내용을 확인해주세요',body:`<div class="reviewList"><div><span>서비스</span><b>${esc(svc.name)}</b></div><div><span>${esc(data.store.staffLabel)}</span><b>${esc(st)}</b></div><div><span>날짜</span><b>${formatDate(booking.date)}</b></div><div><span>시간</span><b>${booking.time}</b></div><div><span>예약자</span><b>${esc(name)}</b></div><div><span>예상금액</span><b>${money(svc.price)}</b></div></div><p>이 내용으로 예약하시겠습니까?</p>`,ok:'예약확정',cancel:'수정하기',onOk:()=>createReservation(name,phone,svc)});
};
async function createReservation(name,phone,svc){
  if(!cloudReady){showConfirm({title:'인터넷 연결을 확인해주세요',body:'<p>예약은 온라인 상태에서만 확정할 수 있습니다.</p>',ok:'확인',single:true});return}
  $('#confirmOk').disabled=true;
  const staffAny=!data.store.staffEnabled||booking.staffId==='any'||!booking.staffId;
  const {data:id,error}=await sb.rpc('create_public_reservation',{
    p_slug:STORE_SLUG,p_customer_name:name,p_customer_phone:phone,p_service_id:svc.id,
    p_staff_id:staffAny?null:booking.staffId,p_staff_any:staffAny,p_date:booking.date,p_time:booking.time
  });
  $('#confirmOk').disabled=false;
  if(error){
    showConfirm({title:'예약할 수 없습니다',body:`<p>${esc(error.message||'잠시 후 다시 시도해주세요.')}</p>`,ok:'확인',single:true});
    availabilityCache.delete(booking.date);return;
  }
  availabilityCache.delete(booking.date);closeBooking();
  showConfirm({title:'예약이 완료되었습니다',body:`<p><b>${formatDate(booking.date)} ${booking.time}</b><br>${esc(svc.name)} 예약이 확정되었습니다.</p>`,ok:'확인',single:true});
}
function formatPhone(value){
  const n=String(value||'').replace(/\D/g,'').slice(0,11);
  if(n.length<=3)return n;if(n.length<=7)return `${n.slice(0,3)}-${n.slice(3)}`;return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}
$('#customerPhone').addEventListener('input',e=>{e.target.value=formatPhone(e.target.value)});

document.addEventListener('click',e=>{
  if(e.target.closest('[data-action="open-booking"]'))openBooking();
  if(e.target.closest('[data-action="close-booking"]'))closeBooking();
  if(e.target.closest('[data-action="close-time"]'))closeTime();
  const s=e.target.closest('[data-scroll]');if(s){const id=s.dataset.scroll;if(id==='top')scrollTo({top:0,behavior:'smooth'});else document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}
  const bs=e.target.closest('[data-book-service]');if(bs)openBooking({serviceId:bs.dataset.bookService});
  const bst=e.target.closest('[data-book-staff]');if(bst)openBooking({staffId:bst.dataset.bookStaff});
});
$('#openTimePicker').onclick=openTime;$('#timeBackToStaff').onclick=backFromTime;
$('#saveContact').onclick=()=>{
  const v=`BEGIN:VCARD\nVERSION:3.0\nFN:${data.store.name}\nORG:${data.store.name}\nTEL;TYPE=WORK:${data.store.phone}\nADR;TYPE=WORK:;;${data.store.address};;;;\nNOTE:${data.store.tagline}\nEND:VCARD`;
  const blob=new Blob([v],{type:'text/vcard;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${data.store.name}.vcf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

loadCloud();
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
