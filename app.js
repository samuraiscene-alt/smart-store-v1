const KEY='smartStoreV1';
const DAYS=['일','월','화','수','목','금','토'];
const defaults={
 store:{name:'LUMI NAIL',tagline:'당신의 일상에 작은 아름다움을',phone:'0212345678',address:'서울시 예시구 123',map:'https://map.naver.com/',staffLabel:'담당자',notice:'예약 전 휴무일과 담당자 일정을 확인해주세요.',introMode:'none',introMedia:'',staffEnabled:true},
 schedule:{open:'10:00',close:'20:00',slotMinutes:30,closedDays:[1],specialClosed:[{date:'2026-09-16',reason:'임시휴무'}]},
 services:[
  {id:'svc1',name:'원컬러',price:40000,duration:60,desc:'깔끔한 컬러 시술'},
  {id:'svc2',name:'프렌치',price:55000,duration:90,desc:'클래식 프렌치 스타일'},
  {id:'svc3',name:'케어',price:30000,duration:45,desc:'기본 손·발 케어'}
 ],
 staff:[
  {id:'st1',name:'김원장',specialty:'아트 · 젤',services:['svc1','svc2','svc3'],daysOff:[2]},
  {id:'st2',name:'이실장',specialty:'프렌치 · 케어',services:['svc1','svc2','svc3'],daysOff:[4]}
 ],reservations:[],customers:[],deletedCustomerPhones:[]
};
function load(){try{return deepMerge(structuredClone(defaults),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return structuredClone(defaults)}}
function deepMerge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]) a[k]=deepMerge(a[k],b[k]); else a[k]=b[k]}return a}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
let data=load();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>Number(n).toLocaleString('ko-KR')+'원';
const digits=v=>String(v||'').replace(/\D/g,'');
function formatPhone(v){const d=digits(v);if(d.length===11)return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;if(d.length===10)return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;return v||''}
function ensureCustomer(name,phone){data.customers=Array.isArray(data.customers)?data.customers:[];data.deletedCustomerPhones=Array.isArray(data.deletedCustomerPhones)?data.deletedCustomerPhones:[];const p=digits(phone);data.deletedCustomerPhones=data.deletedCustomerPhones.filter(x=>x!==p);let c=data.customers.find(x=>digits(x.phone)===p);if(!c){c={id:'c'+Date.now()+Math.random().toString(36).slice(2,6),name,phone:p,note:'',archived:false,createdAt:new Date().toISOString()};data.customers.push(c)}else{c.name=name||c.name;c.phone=p;c.archived=false}return c}


function render(){
 $('#storeName').textContent=data.store.name; $('#introBrand').textContent=data.store.name.split(' ')[0]; $('#storeTagline').textContent=data.store.tagline;
 $('#callButton').href='tel:'+data.store.phone; $('#addressText').textContent=data.store.address; $('#mapLink').href=data.store.map||'#';
 $('#noticeText').textContent=data.store.notice; $('#staffHeading').textContent=data.store.staffLabel||'담당자'; $('#bookingStaffLabel').textContent=data.store.staffLabel||'담당자';
 $('#hoursText').textContent=`${data.schedule.open} - ${data.schedule.close}`; $('#closedText').textContent=closedLabel();
 $('#serviceCards').innerHTML=data.services.map(s=>`<article class="serviceCard"><div><h3>${esc(s.name)}</h3><p>${esc(s.desc||'')} · 약 ${s.duration}분</p></div><div><div class="price">${money(s.price)}</div><button class="textBtn" data-book-service="${s.id}">예약</button></div></article>`).join('');
 $('#staffSection').style.display=data.store.staffEnabled?'block':'none';
 $('#staffCards').innerHTML=data.staff.map(s=>`<article class="staffCard"><div class="avatar"></div><h3>${esc(s.name)}</h3><p>${esc(s.specialty||'')}</p><p>가능 서비스 · ${esc(staffServiceNames(s))}</p><button class="textBtn" data-book-staff="${s.id}">이 ${esc(data.store.staffLabel)}로 예약</button></article>`).join('');
 setupIntro();
}
function staffServiceNames(st){const names=(st.services||[]).map(id=>data.services.find(s=>s.id===id)?.name).filter(Boolean);return names.length?names.join(' · '):'없음'}
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function closedLabel(){const ds=data.schedule.closedDays.map(i=>'매주 '+DAYS[i]+'요일');return ds.length?ds.join(', '):'정기휴무 없음'}
function setupIntro(){const intro=$('#intro'); const mode=data.store.introMode; if(mode==='none'||sessionStorage.getItem('introSeen')) return;
 intro.classList.remove('hidden'); intro.setAttribute('aria-hidden','false');
 const video=$('#introVideo'),img=$('#introImage'); video.style.display='none';img.style.display='none';
 if(mode==='video'&&data.store.introMedia){video.src=data.store.introMedia;video.style.display='block';video.play().catch(()=>{});video.onended=closeIntro;setTimeout(closeIntro,6000)}
 else if(mode==='image'&&data.store.introMedia){img.src=data.store.introMedia;img.style.display='block';setTimeout(closeIntro,3500)}
 else setTimeout(closeIntro,1800);
}
function closeIntro(){sessionStorage.setItem('introSeen','1');$('#intro').classList.add('hidden')}
$('#skipIntro').onclick=closeIntro;

let booking={step:1,serviceId:null,staffId:null,date:null,time:null};
function openBooking(pref={}){booking={step:1,serviceId:pref.serviceId||null,staffId:pref.staffId||null,date:null,time:null};$('#bookingSheet').classList.remove('hidden');renderBooking();document.body.style.overflow='hidden'}
function closeBooking(){ $('#bookingSheet').classList.add('hidden');document.body.style.overflow=''}
function setStep(n){booking.step=n;renderBooking()}
function renderBooking(){
 $$('.bookingStep').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===booking.step));$$('.steps span').forEach((x,i)=>x.classList.toggle('on',i<booking.step));$('#prevStep').classList.toggle('hidden',booking.step===1);
 $('#bookingServices').innerHTML=data.services.map(s=>`<button class="choice ${booking.serviceId===s.id?'selected':''}" data-service="${s.id}"><span><b>${esc(s.name)}</b><small>${s.duration}분 · ${esc(s.desc||'')}</small></span><strong>${money(s.price)}</strong></button>`).join('');
 const svc=data.services.find(s=>s.id===booking.serviceId); const eligible=data.staff.filter(st=>!svc||st.services?.includes(svc.id));
 $('#bookingStaff').innerHTML=data.store.staffEnabled?(eligible.length?`<button class="choice ${booking.staffId==='any'?'selected':''}" data-staff="any"><span><b>${esc(data.store.staffLabel)} 상관없음</b><small>가능한 분으로 배정</small></span><strong>›</strong></button>`+eligible.map(st=>`<button class="choice ${booking.staffId===st.id?'selected':''}" data-staff="${st.id}"><span><b>${esc(st.name)}</b><small>${esc(st.specialty||'')} · 가능 서비스 ${esc(staffServiceNames(st))}</small></span><strong>›</strong></button>`).join(''):`<div class="hintBox">선택한 서비스를 담당할 수 있는 ${esc(data.store.staffLabel||'담당자')}가 없습니다. 다른 서비스를 선택해주세요.</div>`):'<button class="choice selected"><span><b>담당자 선택 없음</b><small>이 업종은 담당자 지정 없이 예약합니다.</small></span></button>';
 $('#pickedTimeText').textContent=booking.date&&booking.time?`${formatDate(booking.date)} · ${booking.time}`:'날짜와 시간을 선택';$('#toCustomerInfo').disabled=!(booking.date&&booking.time);
 $('#closureHint').textContent=`매장 휴무일: ${closedLabel()}${data.schedule.specialClosed.length?' · 임시휴무 '+data.schedule.specialClosed.map(x=>x.date).join(', '):''}`;
 const timeBack=$('#timeBackToStaff'); if(timeBack) timeBack.textContent=data.store.staffEnabled?`‹ ${data.store.staffLabel||'담당자'} 다시 선택`:'‹ 서비스 다시 선택';
}
$('#bookingSheet').addEventListener('click',e=>{const s=e.target.closest('[data-service]');if(s){const changed=booking.serviceId!==s.dataset.service;booking.serviceId=s.dataset.service;if(changed){booking.staffId=null;booking.date=null;booking.time=null}setStep(data.store.staffEnabled?2:3)}const st=e.target.closest('[data-staff]');if(st){const changed=booking.staffId!==st.dataset.staff;booking.staffId=st.dataset.staff;if(changed){booking.date=null;booking.time=null}setStep(3)}});
$('#prevStep').onclick=()=>setStep(Math.max(1,booking.step-1));
$('#toCustomerInfo').onclick=()=>setStep(4);

function buildDateStrip(){const wrap=$('#dateStrip');wrap.innerHTML='';for(let i=0;i<21;i++){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+i);const iso=isoDate(d);const closed=isStoreClosed(iso);const b=document.createElement('button');b.className='dateBtn'+(booking.date===iso?' active':'')+(closed?' closed':'');b.innerHTML=`<small>${i===0?'오늘':DAYS[d.getDay()]}</small><b>${d.getMonth()+1}/${d.getDate()}</b>`;b.onclick=()=>{booking.date=iso;booking.time=null;buildDateStrip();renderTimes()};wrap.appendChild(b)}renderTimes()}
function openTime(){if(!booking.serviceId){setStep(1);return}$('#timeSheet').classList.remove('hidden');buildDateStrip()}
function closeTime(){ $('#timeSheet').classList.add('hidden')}
function backFromTime(){closeTime();setStep(data.store.staffEnabled?2:1)}
function isStoreClosed(iso){const d=new Date(iso+'T12:00:00');return data.schedule.closedDays.includes(d.getDay())||data.schedule.specialClosed.some(x=>x.date===iso)}
function renderTimes(){const grid=$('#timeGrid'),status=$('#dayStatus');grid.innerHTML='';if(!booking.date){status.textContent='날짜를 먼저 선택해주세요.';return}const sp=data.schedule.specialClosed.find(x=>x.date===booking.date);if(isStoreClosed(booking.date)){status.textContent=sp?`매장 휴무 · ${sp.reason||'임시휴무'}`:'매장 정기 휴무일입니다.';return}
 const d=new Date(booking.date+'T12:00:00');const st=booking.staffId&&booking.staffId!=='any'?data.staff.find(x=>x.id===booking.staffId):null;if(st?.daysOff?.includes(d.getDay())){status.textContent=`${st.name} ${data.store.staffLabel}의 휴무일입니다. 다른 담당자를 선택해주세요.`;return}
 const slots=makeSlots(data.schedule.open,data.schedule.close,data.schedule.slotMinutes);const svc=data.services.find(s=>s.id===booking.serviceId);status.textContent=`${formatDate(booking.date)} · 예약 가능한 시간만 표시됩니다.`;
 slots.forEach(t=>{const disabled=slotUnavailable(booking.date,t,svc?.duration||data.schedule.slotMinutes,booking.staffId);const b=document.createElement('button');b.className='timeBtn';b.textContent=t;b.disabled=disabled;b.onclick=()=>confirmTime(t);grid.appendChild(b)})
}
function makeSlots(open,close,step){let [h,m]=open.split(':').map(Number),[eh,em]=close.split(':').map(Number),a=[];let cur=h*60+m,end=eh*60+em;while(cur<end){a.push(`${String(Math.floor(cur/60)).padStart(2,'0')}:${String(cur%60).padStart(2,'0')}`);cur+=Number(step)}return a}
function slotUnavailable(date,time,duration,staffId){const start=toMin(time),end=start+duration;return data.reservations.some(r=>r.date===date&&r.status!=='취소'&&(staffId==='any'||!staffId||r.staffId===staffId||r.staffId==='any')&&overlap(start,end,toMin(r.time),toMin(r.time)+Number(r.duration||30)))}
const toMin=t=>{const[a,b]=t.split(':').map(Number);return a*60+b};const overlap=(a,b,c,d)=>Math.max(a,c)<Math.min(b,d);
function confirmTime(t){showConfirm({title:'시간을 선택하시겠습니까?',body:`<p><b>${formatDate(booking.date)} ${t}</b>로 선택합니다.</p>`,ok:'선택',cancel:'아니오',onOk:()=>{booking.time=t;closeTime();renderBooking()}})}
function formatDate(iso){const d=new Date(iso+'T12:00:00');return `${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`}
const isoDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

let confirmCb=null;
function showConfirm({title,body,ok='확인',cancel='아니오',onOk,single=false}){$('#confirmTitle').textContent=title;$('#confirmBody').innerHTML=body;$('#confirmOk').textContent=ok;$('#confirmCancel').textContent=cancel;$('#confirmCancel').style.display=single?'none':'';$('.confirmActions').style.gridTemplateColumns=single?'1fr':'';confirmCb=onOk;$('#confirmModal').classList.remove('hidden')}
function hideConfirm(){ $('#confirmModal').classList.add('hidden');confirmCb=null }
$('#confirmCancel').onclick=hideConfirm;$('#confirmOk').onclick=()=>{const cb=confirmCb;hideConfirm();cb?.()};
$('#finalReview').onclick=()=>{const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim();if(!name||phone.replace(/\D/g,'').length<9){showConfirm({title:'예약자 정보를 확인해주세요',body:'<p>이름과 올바른 전화번호를 입력해주세요.</p>',ok:'확인',cancel:'닫기'});return}const svc=data.services.find(s=>s.id===booking.serviceId);const st=booking.staffId==='any'?'상관없음':(data.staff.find(s=>s.id===booking.staffId)?.name||'-');showConfirm({title:'예약 내용을 확인해주세요',body:`<div class="reviewList"><div><span>서비스</span><b>${esc(svc.name)}</b></div><div><span>${esc(data.store.staffLabel)}</span><b>${esc(st)}</b></div><div><span>날짜</span><b>${formatDate(booking.date)}</b></div><div><span>시간</span><b>${booking.time}</b></div><div><span>예약자</span><b>${esc(name)}</b></div><div><span>예상금액</span><b>${money(svc.price)}</b></div></div><p>이 내용으로 예약하시겠습니까?</p>`,ok:'예약확정',cancel:'수정하기',onOk:()=>createReservation(name,phone,svc)})};
function createReservation(name,phone,svc){const customer=ensureCustomer(name,phone);const r={id:'r'+Date.now(),customerId:customer.id,serviceId:svc.id,serviceName:svc.name,staffId:booking.staffId||'any',staffName:booking.staffId==='any'?'상관없음':(data.staff.find(x=>x.id===booking.staffId)?.name||''),date:booking.date,time:booking.time,duration:svc.duration,customerName:name,customerPhone:digits(phone),status:'예약확정',price:svc.price,createdAt:new Date().toISOString()};data.reservations.push(r);save();closeBooking();showConfirm({title:'예약이 완료되었습니다',body:`<p><b>${formatDate(r.date)} ${r.time}</b><br>${esc(r.serviceName)} 예약이 확정되었습니다.</p>`,ok:'확인',single:true});}

$('[data-action="open-booking"]')?.addEventListener('click',()=>openBooking());document.addEventListener('click',e=>{if(e.target.closest('[data-action="open-booking"]'))openBooking();if(e.target.closest('[data-action="close-booking"]'))closeBooking();if(e.target.closest('[data-action="close-time"]'))closeTime();const s=e.target.closest('[data-scroll]');if(s){const id=s.dataset.scroll;if(id==='top')scrollTo({top:0,behavior:'smooth'});else document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}const bs=e.target.closest('[data-book-service]');if(bs)openBooking({serviceId:bs.dataset.bookService});const bst=e.target.closest('[data-book-staff]');if(bst)openBooking({staffId:bst.dataset.bookStaff})});
$('#openTimePicker').onclick=openTime;
$('#timeBackToStaff').onclick=backFromTime;
$('#customerPhone').addEventListener('input',e=>{const d=digits(e.target.value).slice(0,11);e.target.value=formatPhone(d)});
$('#saveContact').onclick=()=>{const v=`BEGIN:VCARD\nVERSION:3.0\nFN:${data.store.name}\nORG:${data.store.name}\nTEL;TYPE=WORK:${data.store.phone}\nADR;TYPE=WORK:;;${data.store.address};;;;\nNOTE:${data.store.tagline}\nEND:VCARD`;const blob=new Blob([v],{type:'text/vcard;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${data.store.name}.vcf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('storage',e=>{if(e.key===KEY){data=load();render()}});
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
