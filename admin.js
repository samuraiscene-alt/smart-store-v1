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
  ],
  reservations:[],
  customers:[],
  deletedCustomerPhones:[]
};
function load(){try{return deepMerge(structuredClone(defaults),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return structuredClone(defaults)}}
function deepMerge(a,b){for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k])a[k]=deepMerge(a[k],b[k]);else a[k]=b[k]}return a}
let data=load();
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const koCollator=new Intl.Collator('ko-KR',{sensitivity:'base',numeric:true});
const digits=v=>String(v||'').replace(/\D/g,'');
function formatPhone(v){const d=digits(v);if(d.length===11)return `${d.slice(0,3)}-${d.slice(3,7)}-${d.slice(7)}`;if(d.length===10)return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;return v||''}
const save=()=>{localStorage.setItem(KEY,JSON.stringify(data));renderAll()};
function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

function serviceNamesForStaff(st){const names=(st.services||[]).map(id=>data.services.find(s=>s.id===id)?.name).filter(Boolean);return names.length?names.join(' · '):'없음'}
function flashSaved(button){if(!button)return;const original=button.dataset.originalText||button.textContent;button.dataset.originalText=original;button.textContent='저장 완료 ✓';button.disabled=true;setTimeout(()=>{button.textContent=original;button.disabled=false},1400)}

function ensureDataShape(){data.customers=Array.isArray(data.customers)?data.customers:[];data.deletedCustomerPhones=Array.isArray(data.deletedCustomerPhones)?data.deletedCustomerPhones:[];let changed=false;for(const r of data.reservations||[]){const p=digits(r.customerPhone);if(p.length<9||data.deletedCustomerPhones.includes(p))continue;let c=data.customers.find(x=>digits(x.phone)===p);if(!c){c={id:'c'+Date.now()+Math.random().toString(36).slice(2,6),name:r.customerName||'이름없음',phone:p,note:'',archived:false,createdAt:r.createdAt||new Date().toISOString()};data.customers.push(c);changed=true}if(!r.customerId){r.customerId=c.id;changed=true}}if(changed)localStorage.setItem(KEY,JSON.stringify(data))}
ensureDataShape();

function renderAll(){fillStore();renderServices();renderStaff();renderSchedule();renderReservations();renderCustomers();$('#serviceCount').textContent=data.services.length;$('#staffCount').textContent=data.staff.length;$('#customerCount').textContent=data.customers.filter(c=>!c.archived).length;const today=new Date().toISOString().slice(0,10);$('#todayReservations').textContent=data.reservations.filter(r=>r.date===today&&r.status!=='취소').length}
function fillStore(){$('#aStoreName').value=data.store.name;$('#aTagline').value=data.store.tagline;$('#aPhone').value=data.store.phone;$('#aAddress').value=data.store.address;$('#aMap').value=data.store.map||'';$('#aStaffLabel').value=data.store.staffLabel||'담당자';$('#aNotice').value=data.store.notice||'';$$('#introMode button').forEach(b=>b.classList.toggle('active',b.dataset.value===data.store.introMode));$('#staffEnabled').checked=!!data.store.staffEnabled}
$('#saveStore').onclick=()=>{Object.assign(data.store,{name:$('#aStoreName').value.trim(),tagline:$('#aTagline').value.trim(),phone:$('#aPhone').value.trim(),address:$('#aAddress').value.trim(),map:$('#aMap').value.trim(),staffLabel:$('#aStaffLabel').value.trim()||'담당자',notice:$('#aNotice').value.trim()});save();flashSaved($('#saveStore'))};
$('#introMode').onclick=e=>{const b=e.target.closest('button');if(!b)return;data.store.introMode=b.dataset.value;save()};
$('#introFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;const max=7*1024*1024;if(f.size>max){alert('데모에서는 7MB 이하 파일을 사용해주세요.');return}const rd=new FileReader();rd.onload=()=>{data.store.introMedia=rd.result;data.store.introMode=f.type.startsWith('video')?'video':'image';save()};rd.readAsDataURL(f)};
$('#staffEnabled').onchange=()=>{data.store.staffEnabled=$('#staffEnabled').checked;save()};

function renderServices(){$('#adminServices').innerHTML=data.services.length?data.services.map(s=>`<article class="adminItem"><div><h3>${esc(s.name)}</h3><p>${money(s.price)} · ${s.duration}분 · ${esc(s.desc||'')}</p></div><button data-edit-service="${s.id}">편집</button></article>`).join(''):'<p class="formNote">등록된 서비스가 없습니다.</p>'}
function renderStaff(){$('#adminStaff').innerHTML=data.staff.length?data.staff.map(s=>`<article class="adminItem"><div><h3>${esc(s.name)}</h3><p>${esc(s.specialty||'소개 없음')}</p><p>가능 서비스 · ${esc(serviceNamesForStaff(s))}</p><p>휴무 · ${s.daysOff?.map(d=>DAYS[d]).join('·')||'없음'}</p></div><button data-edit-staff="${s.id}">편집</button></article>`).join(''):'<p class="formNote">등록된 담당자가 없습니다.</p>'}

let editing={type:null,id:null};
function openEdit(type,id){editing={type,id};const isSvc=type==='service',obj=id?(isSvc?data.services:data.staff).find(x=>x.id===id):null;$('#editTitle').textContent=(obj?'편집':'추가')+' · '+(isSvc?'서비스':data.store.staffLabel);$('#editDelete').style.visibility=obj?'visible':'hidden';if(isSvc){$('#editFields').innerHTML=`<label class="field"><span>서비스명</span><input id="eName" value="${esc(obj?.name||'')}"></label><label class="field"><span>가격</span><input id="ePrice" type="number" inputmode="numeric" value="${obj?.price||0}"></label><label class="field"><span>소요시간(분)</span><input id="eDuration" type="number" inputmode="numeric" value="${obj?.duration||60}"></label><label class="field"><span>설명</span><input id="eDesc" value="${esc(obj?.desc||'')}"></label>`}else{$('#editFields').innerHTML=`<label class="field"><span>이름</span><input id="eName" value="${esc(obj?.name||'')}"></label><label class="field"><span>소개 / 전문분야</span><input id="eSpecialty" value="${esc(obj?.specialty||'')}"></label><div class="field"><span>가능 서비스</span><div id="eServices" class="chipList">${data.services.map(s=>`<label class="chip"><input type="checkbox" value="${s.id}" ${obj?.services?.includes(s.id)?'checked':''}> ${esc(s.name)}</label>`).join('')}</div></div>`}$('#editModal').classList.remove('hidden')}
function closeEdit(){$('#editModal').classList.add('hidden')}
$('#editClose').onclick=closeEdit;$('#addService').onclick=()=>openEdit('service',null);$('#addStaff').onclick=()=>openEdit('staff',null);
document.addEventListener('click',e=>{const a=e.target.closest('[data-edit-service]');if(a)openEdit('service',a.dataset.editService);const b=e.target.closest('[data-edit-staff]');if(b)openEdit('staff',b.dataset.editStaff)});
$('#editSave').onclick=()=>{const isSvc=editing.type==='service',arr=isSvc?data.services:data.staff;let obj=editing.id?arr.find(x=>x.id===editing.id):{id:(isSvc?'svc':'st')+Date.now()};obj.name=$('#eName').value.trim();if(!obj.name)return;if(isSvc){obj.price=Number($('#ePrice').value||0);obj.duration=Number($('#eDuration').value||30);obj.desc=$('#eDesc').value.trim()}else{obj.specialty=$('#eSpecialty').value.trim();obj.services=[...$$('#eServices input:checked')].map(x=>x.value);obj.daysOff=obj.daysOff||[]}if(!editing.id)arr.push(obj);save();closeEdit()};
$('#editDelete').onclick=()=>{if(!editing.id)return;if(!confirm('삭제하시겠습니까?'))return;const arr=editing.type==='service'?data.services:data.staff;const i=arr.findIndex(x=>x.id===editing.id);if(i>=0)arr.splice(i,1);save();closeEdit()};

function renderSchedule(){$('#openTime').value=data.schedule.open;$('#closeTime').value=data.schedule.close;$('#slotMinutes').value=String(data.schedule.slotMinutes);$('#storeClosedDays').innerHTML=DAYS.map((d,i)=>`<label class="dayCheck"><input type="checkbox" value="${i}" ${data.schedule.closedDays.includes(i)?'checked':''}><span>${d}</span></label>`).join('');$('#specialClosedList').innerHTML=data.schedule.specialClosed.map((x,i)=>`<span class="chip">${x.date} ${esc(x.reason||'')}<button data-remove-special="${i}">✕</button></span>`).join('');$('#staffDaysOff').innerHTML=data.staff.map(st=>`<div class="staffSchedule"><h4>${esc(st.name)}</h4><div class="weekdayGrid">${DAYS.map((d,i)=>`<label class="dayCheck"><input type="checkbox" data-staff-day="${st.id}" value="${i}" ${st.daysOff?.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}</div></div>`).join('')||'<p class="formNote">담당자를 먼저 등록해주세요.</p>'}
$('#saveSchedule').onclick=()=>{data.schedule.open=$('#openTime').value;data.schedule.close=$('#closeTime').value;data.schedule.slotMinutes=Number($('#slotMinutes').value);data.schedule.closedDays=$$('#storeClosedDays input:checked').map(x=>Number(x.value));data.staff.forEach(st=>st.daysOff=$$(`[data-staff-day="${st.id}"]:checked`).map(x=>Number(x.value)));save();flashSaved($('#saveSchedule'))};
$('#addSpecialClosed').onclick=()=>{const date=$('#specialClosedDate').value;if(!date)return;data.schedule.specialClosed.push({date,reason:$('#specialClosedReason').value.trim()});data.schedule.specialClosed=[...new Map(data.schedule.specialClosed.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));$('#specialClosedDate').value='';$('#specialClosedReason').value='';save()};
document.addEventListener('click',e=>{const b=e.target.closest('[data-remove-special]');if(b){data.schedule.specialClosed.splice(Number(b.dataset.removeSpecial),1);save()}});

function renderReservations(){const rs=[...data.reservations].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));$('#reservationList').innerHTML=rs.length?rs.map(r=>`<article class="adminItem"><div><h3>${esc(r.date)} ${esc(r.time)} · ${esc(r.customerName)}</h3><p>${esc(r.serviceName)} · ${esc(r.staffName||'담당없음')} · ${money(r.price)}</p><p>${formatPhone(r.customerPhone)} · ${esc(r.status||'예약확정')}</p></div><span class="reservationStatus">${esc(r.status||'예약확정')}</span></article>`).join(''):'<p class="formNote">아직 예약이 없습니다.</p>'}

// ---------- CRM ----------
let customerView='active', currentCustomerId=null, actionYesCallback=null;
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function chosung(str=''){return [...String(str)].map(ch=>{const code=ch.charCodeAt(0)-0xAC00;return code>=0&&code<=11171?CHO[Math.floor(code/588)]:ch}).join('')}
function isSubsequence(q,s){let i=0;for(const ch of s){if(ch===q[i])i++;if(i===q.length)return true}return false}
function customerMatches(c,q){q=q.trim().toLowerCase();if(!q)return true;const name=String(c.name||'').toLowerCase(),phone=digits(c.phone),qd=digits(q);if(name.includes(q)||chosung(name).includes(q))return true;if(qd&&phone.includes(qd))return true;return q.length>=2&&isSubsequence(q,name)}
function customerReservations(c){const p=digits(c.phone);return (data.reservations||[]).filter(r=>r.customerId===c.id||(!r.customerId&&digits(r.customerPhone)===p)||digits(r.customerPhone)===p).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))}
function customerStats(c){const rs=customerReservations(c).filter(r=>r.status!=='취소');return{visits:rs.length,total:rs.reduce((n,r)=>n+Number(r.price||0),0),last:rs[0]?.date||'-'}}
function sortedCustomers(list){return [...list].sort((a,b)=>koCollator.compare(a.name||'',b.name||''))}
function renderCustomers(){const q=$('#customerSearch')?.value||'';const archived=customerView==='archived';const list=sortedCustomers(data.customers.filter(c=>!!c.archived===archived&&customerMatches(c,q)));$('#showActiveCustomers')?.classList.toggle('active',!archived);$('#showArchivedCustomers')?.classList.toggle('active',archived);$('#customerList').innerHTML=list.length?list.map(c=>{const st=customerStats(c);return`<button class="customerRow" data-customer="${c.id}"><span class="customerAvatar">${esc((c.name||'?').slice(0,1))}</span><span class="customerRowMain"><b>${esc(c.name)}</b><small>${formatPhone(c.phone)}</small><small>이용/예약 ${st.visits}회 · 누적 ${money(st.total)}</small></span><span class="customerChevron">›</span></button>`}).join(''):`<div class="emptyCustomer">${archived?'보관된 고객이 없습니다.':'등록된 고객이 없습니다.'}</div>`}
function renderSuggestions(){const box=$('#customerSuggestions'),q=$('#customerSearch').value.trim();if(!q){box.classList.add('hidden');box.innerHTML='';return}const list=sortedCustomers(data.customers.filter(c=>!c.archived&&customerMatches(c,q))).slice(0,6);if(!list.length){box.classList.add('hidden');box.innerHTML='';return}box.innerHTML=list.map(c=>`<button data-customer-suggest="${c.id}"><b>${esc(c.name)}</b><span>${formatPhone(c.phone)}</span></button>`).join('');box.classList.remove('hidden')}
function openCustomer(id){const c=data.customers.find(x=>x.id===id);if(!c)return;currentCustomerId=id;const st=customerStats(c),rs=customerReservations(c);$('#customerDetailName').textContent=c.name;$('#customerDetailPhone').textContent=formatPhone(c.phone);$('#customerDetailCreated').textContent=`등록 ${String(c.createdAt||'').slice(0,10)||'-'}`;$('#customerVisitCount').textContent=st.visits;$('#customerTotalSpend').textContent=money(st.total);$('#customerLastVisit').textContent=st.last;$('#customerNote').value=c.note||'';$('#archiveCustomer').textContent=c.archived?'고객 복구':'고객 보관';$('#permanentDeleteCustomer').classList.toggle('hidden',!c.archived);$('#customerHistory').innerHTML=rs.length?rs.map(r=>`<article><div><b>${esc(r.date)} ${esc(r.time)}</b><span class="reservationStatus">${esc(r.status||'예약확정')}</span></div><p>${esc(r.serviceName||'-')} · ${esc(r.staffName||'담당없음')}</p><strong>${money(r.price)}</strong></article>`).join(''):'<p class="formNote">이용 내역이 없습니다.</p>';$('#customerModal').classList.remove('hidden')}
function closeCustomer(){$('#customerModal').classList.add('hidden');currentCustomerId=null}
function askAction(title,text,yes){$('#actionTitle').textContent=title;$('#actionText').textContent=text;actionYesCallback=yes;$('#actionModal').classList.remove('hidden')}
function closeAction(){$('#actionModal').classList.add('hidden');actionYesCallback=null}
$('#customerSearch').addEventListener('input',()=>{renderCustomers();renderSuggestions()});
$('#customerSearch').addEventListener('focus',renderSuggestions);
$('#showActiveCustomers').onclick=()=>{customerView='active';renderCustomers()};
$('#showArchivedCustomers').onclick=()=>{customerView='archived';renderCustomers()};
$('#customerClose').onclick=closeCustomer;
$('#saveCustomerNote').onclick=()=>{const c=data.customers.find(x=>x.id===currentCustomerId);if(!c)return;c.note=$('#customerNote').value.trim();save();flashSaved($('#saveCustomerNote'))};
$('#archiveCustomer').onclick=()=>{const c=data.customers.find(x=>x.id===currentCustomerId);if(!c)return;if(c.archived){askAction('고객을 복구하시겠습니까?',`${c.name} 고객을 고객명단으로 되돌립니다.`,()=>{c.archived=false;save();closeCustomer()})}else{askAction('고객을 보관하시겠습니까?',`${c.name} 고객은 보관함으로 이동하며 언제든 복구할 수 있습니다.`,()=>{c.archived=true;save();closeCustomer()})}};
$('#permanentDeleteCustomer').onclick=()=>{const c=data.customers.find(x=>x.id===currentCustomerId);if(!c)return;askAction('영구 삭제하시겠습니까?','고객 프로필은 삭제되며 복구할 수 없습니다. 기존 예약 기록은 유지됩니다.',()=>{const p=digits(c.phone);if(p&&!data.deletedCustomerPhones.includes(p))data.deletedCustomerPhones.push(p);data.customers=data.customers.filter(x=>x.id!==c.id);save();closeCustomer()})};
$('#actionNo').onclick=closeAction;$('#actionYes').onclick=()=>{const cb=actionYesCallback;closeAction();cb?.()};
document.addEventListener('click',e=>{const row=e.target.closest('[data-customer]');if(row)openCustomer(row.dataset.customer);const sug=e.target.closest('[data-customer-suggest]');if(sug){$('#customerSuggestions').classList.add('hidden');openCustomer(sug.dataset.customerSuggest)}else if(!e.target.closest('.customerSearchWrap'))$('#customerSuggestions')?.classList.add('hidden')});

$$('.adminTabs button').forEach(b=>b.onclick=()=>{$$('.adminTabs button').forEach(x=>x.classList.toggle('active',x===b));$$('.adminPanel').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.tab));if(b.dataset.tab==='customers'){$('#customerSearch').value='';customerView='active';renderCustomers()}});
window.addEventListener('storage',e=>{if(e.key===KEY){data=load();ensureDataShape();renderAll()}});
renderAll();
