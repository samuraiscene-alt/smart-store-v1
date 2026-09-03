const DAYS=['일','월','화','수','목','금','토'];
const KEY='smartStoreV1';
const CONFIG=window.SMART_STORE_CONFIG;
const sb=window.supabase.createClient(CONFIG.supabaseUrl,CONFIG.supabaseKey);
const STORE_SLUG=CONFIG.storeSlug;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const timeHHMM=v=>String(v||'').slice(0,5);
let storeId=null,currentUser=null,memberRole=null;
let data={store:{},schedule:{open:'10:00',close:'20:00',slotMinutes:30,closedDays:[],specialClosed:[]},services:[],staff:[],reservations:[],customers:[]};
let editing={type:null,id:null};
let customerMode='active',selectedCustomerId=null,actionCallback=null;

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function normalizePhone(v=''){return String(v).replace(/\D/g,'')}
function formatPhone(v=''){
  const n=normalizePhone(v).slice(0,11);if(n.length<=3)return n;if(n.length<=7)return `${n.slice(0,3)}-${n.slice(3)}`;return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
}
function flashSaved(button,text='저장 완료 ✓'){
  if(!button)return;const original=button.dataset.originalText||button.textContent;button.dataset.originalText=original;button.textContent=text;button.disabled=true;setTimeout(()=>{button.textContent=original;button.disabled=false},1400);
}
function showAuthMessage(msg,isError=false){const el=$('#authMessage');el.textContent=msg||'';el.classList.toggle('error',!!isError)}
function showAdminMessage(msg){$('#cloudStatusText').textContent=msg}
function localBackup(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}

async function resolveStore(){
  const {data:payload,error}=await sb.rpc('public_store_payload',{p_slug:STORE_SLUG});
  if(error)throw error;if(!payload?.store?.id)throw new Error('매장을 찾을 수 없습니다.');storeId=payload.store.id;return payload.store;
}
async function hasMembership(){
  if(!currentUser||!storeId)return false;
  const {data:row,error}=await sb.from('store_members').select('role').eq('store_id',storeId).eq('user_id',currentUser.id).maybeSingle();
  if(error)throw error;memberRole=row?.role||null;return !!row;
}
async function handleSession(session){
  currentUser=session?.user||null;
  $('#adminApp').classList.add('hidden');$('#adminAuthGate').classList.remove('hidden');$('#loginPanel').classList.toggle('hidden',!!currentUser);$('#claimPanel').classList.add('hidden');
  if(!currentUser){showAuthMessage('');return}
  try{
    await resolveStore();
    if(await hasMembership()){
      $('#adminAuthGate').classList.add('hidden');$('#adminApp').classList.remove('hidden');
      await loadAdminData();
    }else{
      $('#claimPanel').classList.remove('hidden');showAuthMessage(`로그인됨 · ${currentUser.email||'관리자 계정'}`);
    }
  }catch(err){showAuthMessage(err.message||'관리자 연결을 확인해주세요.',true)}
}
async function initAuth(){
  const {data:{session}}=await sb.auth.getSession();await handleSession(session);
  sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(()=>handleSession(session),0)});
}
$('#authSignIn').onclick=async()=>{
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;if(!email||password.length<6){showAuthMessage('이메일과 6자 이상의 비밀번호를 입력해주세요.',true);return}
  showAuthMessage('로그인 중...');const {error}=await sb.auth.signInWithPassword({email,password});if(error)showAuthMessage(error.message,true);
};
$('#authSignUp').onclick=async()=>{
  const email=$('#authEmail').value.trim(),password=$('#authPassword').value;if(!email||password.length<6){showAuthMessage('이메일과 6자 이상의 비밀번호를 입력해주세요.',true);return}
  showAuthMessage('계정 생성 중...');const {data:res,error}=await sb.auth.signUp({email,password});if(error){showAuthMessage(error.message,true);return}
  if(res.session)showAuthMessage('계정이 생성되었습니다. 매장 등록코드를 입력해주세요.');else showAuthMessage('가입 확인 메일을 보냈습니다. 메일 인증 후 이 화면에서 로그인해주세요.');
};
$('#claimStore').onclick=async()=>{
  const code=$('#claimCode').value.trim();if(!code){showAuthMessage('매장 등록코드를 입력해주세요.',true);return}
  showAuthMessage('매장 연결 중...');const {error}=await sb.rpc('claim_store',{p_slug:STORE_SLUG,p_claim_token:code});if(error){showAuthMessage(error.message,true);return}
  showAuthMessage('매장 연결 완료');await handleSession((await sb.auth.getSession()).data.session);
};
$('#claimLogout').onclick=()=>sb.auth.signOut();
$('#logoutButton').onclick=()=>sb.auth.signOut();

async function loadAdminData(){
  showAdminMessage('공용 데이터 불러오는 중...');
  const [storeR,servicesR,staffR,ssR,closedR,specialR,daysR,customersR,resR]=await Promise.all([
    sb.from('stores').select('*').eq('id',storeId).single(),
    sb.from('services').select('*').eq('store_id',storeId).order('sort_order').order('created_at'),
    sb.from('staff').select('*').eq('store_id',storeId).order('sort_order').order('created_at'),
    sb.from('staff_services').select('staff_id,service_id'),
    sb.from('store_closed_days').select('weekday').eq('store_id',storeId),
    sb.from('special_closures').select('*').eq('store_id',storeId).order('closed_date'),
    sb.from('staff_days_off').select('staff_id,weekday'),
    sb.from('customers').select('*').eq('store_id',storeId).order('name'),
    sb.from('reservations').select('*,customers(name,phone)').eq('store_id',storeId).order('reservation_date').order('reservation_time')
  ]);
  const firstError=[storeR,servicesR,staffR,ssR,closedR,specialR,daysR,customersR,resR].find(x=>x.error)?.error;if(firstError)throw firstError;
  const st=storeR.data;
  data.store={id:st.id,name:st.name,tagline:st.tagline||'',phone:st.phone||'',address:st.address||'',map:st.map_url||'',staffLabel:st.staff_label||'담당자',notice:st.notice||'',introMode:st.intro_mode||'none',introMedia:st.intro_media_url||'',staffEnabled:st.staff_enabled!==false};
  data.schedule={open:timeHHMM(st.opening_time),close:timeHHMM(st.closing_time),slotMinutes:Number(st.slot_minutes||30),closedDays:(closedR.data||[]).map(x=>Number(x.weekday)),specialClosed:(specialR.data||[]).map(x=>({id:x.id,date:x.closed_date,reason:x.reason||'',isClosed:x.is_closed!==false,open:x.opening_time?timeHHMM(x.opening_time):null,close:x.closing_time?timeHHMM(x.closing_time):null}))};
  data.services=(servicesR.data||[]).map(s=>({id:s.id,name:s.name,price:Number(s.price||0),duration:Number(s.duration_minutes||30),desc:s.description||'',active:s.active!==false}));
  data.staff=(staffR.data||[]).map(s=>({id:s.id,name:s.name,specialty:s.specialty||'',active:s.active!==false,services:(ssR.data||[]).filter(x=>x.staff_id===s.id).map(x=>x.service_id),daysOff:(daysR.data||[]).filter(x=>x.staff_id===s.id).map(x=>Number(x.weekday))}));
  data.customers=(customersR.data||[]).map(c=>({id:c.id,name:c.name,phone:c.phone,memo:c.memo||'',archivedAt:c.archived_at,createdAt:c.created_at}));
  data.reservations=(resR.data||[]).map(r=>({id:r.id,customerId:r.customer_id,serviceId:r.service_id,staffId:r.staff_id,staffAny:r.staff_any,date:r.reservation_date,time:timeHHMM(r.reservation_time),duration:Number(r.duration_minutes||30),serviceName:r.service_name,staffName:r.staff_name||'',price:Number(r.price||0),status:r.status,customerName:r.customers?.name||'',customerPhone:r.customers?.phone||'',createdAt:r.created_at}));
  renderAll();showAdminMessage(`연결됨 · ${data.store.name}`);
  $('#importLocalData').classList.toggle('hidden',!localBackup()||localStorage.getItem('smartStoreCloudImported')==='1');
}

function serviceNamesForStaff(st){const names=(st.services||[]).map(id=>data.services.find(s=>s.id===id)?.name).filter(Boolean);return names.length?names.join(' · '):'없음'}
function renderAll(){fillStore();renderServices();renderStaff();renderSchedule();renderReservations();renderCustomers();$('#serviceCount').textContent=data.services.filter(x=>x.active!==false).length;$('#staffCount').textContent=data.staff.filter(x=>x.active!==false).length;$('#customerCount').textContent=data.customers.filter(x=>!x.archivedAt).length;const today=new Date().toISOString().slice(0,10);$('#todayReservations').textContent=data.reservations.filter(r=>r.date===today&&!['취소','노쇼'].includes(r.status)).length}
function fillStore(){
  $('#aStoreName').value=data.store.name||'';$('#aTagline').value=data.store.tagline||'';$('#aPhone').value=data.store.phone||'';$('#aAddress').value=data.store.address||'';$('#aMap').value=data.store.map||'';$('#aStaffLabel').value=data.store.staffLabel||'담당자';$('#aNotice').value=data.store.notice||'';$$('#introMode button').forEach(b=>b.classList.toggle('active',b.dataset.value===data.store.introMode));$('#staffEnabled').checked=!!data.store.staffEnabled;
}
$('#saveStore').onclick=async()=>{
  const patch={name:$('#aStoreName').value.trim(),tagline:$('#aTagline').value.trim(),phone:$('#aPhone').value.trim(),address:$('#aAddress').value.trim(),map_url:$('#aMap').value.trim(),staff_label:$('#aStaffLabel').value.trim()||'담당자',notice:$('#aNotice').value.trim()};
  const {error}=await sb.from('stores').update(patch).eq('id',storeId);if(error){alert(error.message);return}await loadAdminData();flashSaved($('#saveStore'));
};
$('#introMode').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const {error}=await sb.from('stores').update({intro_mode:b.dataset.value}).eq('id',storeId);if(error){alert(error.message);return}await loadAdminData()};
$('#introFile').onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;if(f.size>15*1024*1024){alert('15MB 이하 파일을 사용해주세요.');return}
  const ext=(f.name.split('.').pop()||'bin').toLowerCase();const path=`${storeId}/intro-${Date.now()}.${ext}`;
  showAdminMessage('인트로 파일 업로드 중...');const {error:upErr}=await sb.storage.from('store-media').upload(path,f,{upsert:false,contentType:f.type||undefined});if(upErr){alert(upErr.message);showAdminMessage('업로드 실패');return}
  const {data:urlData}=sb.storage.from('store-media').getPublicUrl(path);const mode=f.type.startsWith('video')?'video':'image';const {error}=await sb.from('stores').update({intro_mode:mode,intro_media_url:urlData.publicUrl}).eq('id',storeId);if(error){alert(error.message);return}await loadAdminData();flashSaved($('#saveStore'),'업로드 완료 ✓');
};
$('#staffEnabled').onchange=async()=>{const {error}=await sb.from('stores').update({staff_enabled:$('#staffEnabled').checked}).eq('id',storeId);if(error){alert(error.message);return}await loadAdminData()};

function renderServices(){$('#adminServices').innerHTML=data.services.length?data.services.map(s=>`<article class="adminItem"><div><h3>${esc(s.name)}</h3><p>${money(s.price)} · ${s.duration}분 · ${esc(s.desc||'')}</p></div><button data-edit-service="${s.id}">편집</button></article>`).join(''):'<p class="formNote">등록된 서비스가 없습니다.</p>'}
function renderStaff(){$('#adminStaff').innerHTML=data.staff.length?data.staff.map(s=>`<article class="adminItem"><div><h3>${esc(s.name)}</h3><p>${esc(s.specialty||'소개 없음')}</p><p>가능 서비스 · ${esc(serviceNamesForStaff(s))}</p><p>휴무 · ${s.daysOff?.map(d=>DAYS[d]).join('·')||'없음'}</p></div><button data-edit-staff="${s.id}">편집</button></article>`).join(''):'<p class="formNote">등록된 담당자가 없습니다.</p>'}
function openEdit(type,id){
  editing={type,id};const isSvc=type==='service',obj=id?(isSvc?data.services:data.staff).find(x=>x.id===id):null;$('#editTitle').textContent=(obj?'편집':'추가')+' · '+(isSvc?'서비스':data.store.staffLabel);$('#editDelete').style.visibility=obj?'visible':'hidden';
  if(isSvc)$('#editFields').innerHTML=`<label class="field"><span>서비스명</span><input id="eName" value="${esc(obj?.name||'')}"></label><label class="field"><span>가격</span><input id="ePrice" type="number" inputmode="numeric" value="${obj?.price||0}"></label><label class="field"><span>소요시간(분)</span><input id="eDuration" type="number" inputmode="numeric" value="${obj?.duration||60}"></label><label class="field"><span>설명</span><input id="eDesc" value="${esc(obj?.desc||'')}"></label>`;
  else $('#editFields').innerHTML=`<label class="field"><span>이름</span><input id="eName" value="${esc(obj?.name||'')}"></label><label class="field"><span>소개 / 전문분야</span><input id="eSpecialty" value="${esc(obj?.specialty||'')}"></label><div class="field"><span>가능 서비스</span><div id="eServices" class="chipList">${data.services.map(s=>`<label class="chip"><input type="checkbox" value="${s.id}" ${obj?.services?.includes(s.id)?'checked':''}> ${esc(s.name)}</label>`).join('')}</div></div>`;
  $('#editModal').classList.remove('hidden');
}
function closeEdit(){$('#editModal').classList.add('hidden')}
$('#editClose').onclick=closeEdit;$('#addService').onclick=()=>openEdit('service',null);$('#addStaff').onclick=()=>openEdit('staff',null);
document.addEventListener('click',e=>{const a=e.target.closest('[data-edit-service]');if(a)openEdit('service',a.dataset.editService);const b=e.target.closest('[data-edit-staff]');if(b)openEdit('staff',b.dataset.editStaff);const sp=e.target.closest('[data-remove-special]');if(sp)removeSpecial(sp.dataset.removeSpecial);const cust=e.target.closest('[data-customer-id]');if(cust)openCustomer(cust.dataset.customerId)});
$('#editSave').onclick=async()=>{
  const isSvc=editing.type==='service',name=$('#eName').value.trim();if(!name)return;
  if(isSvc){
    const payload={store_id:storeId,name,price:Number($('#ePrice').value||0),duration_minutes:Number($('#eDuration').value||30),description:$('#eDesc').value.trim(),active:true,sort_order:editing.id?undefined:data.services.length+1};
    let result;if(editing.id){delete payload.store_id;delete payload.sort_order;result=await sb.from('services').update(payload).eq('id',editing.id)}else result=await sb.from('services').insert(payload);
    if(result.error){alert(result.error.message);return}
  }else{
    const specialty=$('#eSpecialty').value.trim(),serviceIds=$$('#eServices input:checked').map(x=>x.value);let staffId=editing.id;
    if(editing.id){const {error}=await sb.from('staff').update({name,specialty}).eq('id',editing.id);if(error){alert(error.message);return}}
    else{const {data:newStaff,error}=await sb.from('staff').insert({store_id:storeId,name,specialty,active:true,sort_order:data.staff.length+1}).select('id').single();if(error){alert(error.message);return}staffId=newStaff.id}
    let q=await sb.from('staff_services').delete().eq('staff_id',staffId);if(q.error){alert(q.error.message);return}
    if(serviceIds.length){q=await sb.from('staff_services').insert(serviceIds.map(service_id=>({staff_id:staffId,service_id})));if(q.error){alert(q.error.message);return}}
  }
  closeEdit();await loadAdminData();
};
$('#editDelete').onclick=()=>{if(!editing.id)return;askAction('삭제하시겠습니까?','삭제하면 손님 화면에서도 즉시 사라집니다.',async()=>{const table=editing.type==='service'?'services':'staff';const {error}=await sb.from(table).delete().eq('id',editing.id);if(error){alert(error.message);return}closeEdit();await loadAdminData()})};

function renderSchedule(){
  $('#openTime').value=data.schedule.open;$('#closeTime').value=data.schedule.close;$('#slotMinutes').value=String(data.schedule.slotMinutes);
  $('#storeClosedDays').innerHTML=DAYS.map((d,i)=>`<label class="dayCheck"><input type="checkbox" value="${i}" ${data.schedule.closedDays.includes(i)?'checked':''}><span>${d}</span></label>`).join('');
  $('#specialClosedList').innerHTML=data.schedule.specialClosed.map(x=>`<span class="chip">${x.date} ${esc(x.reason||'')}<button data-remove-special="${x.id}">✕</button></span>`).join('');
  $('#staffDaysOff').innerHTML=data.staff.map(st=>`<div class="staffSchedule"><h4>${esc(st.name)}</h4><div class="weekdayGrid">${DAYS.map((d,i)=>`<label class="dayCheck"><input type="checkbox" data-staff-day="${st.id}" value="${i}" ${st.daysOff?.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}</div></div>`).join('')||'<p class="formNote">담당자를 먼저 등록해주세요.</p>';
}
$('#saveSchedule').onclick=async()=>{
  let r=await sb.from('stores').update({opening_time:$('#openTime').value,closing_time:$('#closeTime').value,slot_minutes:Number($('#slotMinutes').value)}).eq('id',storeId);if(r.error){alert(r.error.message);return}
  r=await sb.from('store_closed_days').delete().eq('store_id',storeId);if(r.error){alert(r.error.message);return}
  const closed=$$('#storeClosedDays input:checked').map(x=>({store_id:storeId,weekday:Number(x.value)}));if(closed.length){r=await sb.from('store_closed_days').insert(closed);if(r.error){alert(r.error.message);return}}
  for(const st of data.staff){r=await sb.from('staff_days_off').delete().eq('staff_id',st.id);if(r.error){alert(r.error.message);return}const days=$$(`[data-staff-day="${st.id}"]:checked`).map(x=>({staff_id:st.id,weekday:Number(x.value)}));if(days.length){r=await sb.from('staff_days_off').insert(days);if(r.error){alert(r.error.message);return}}
  }
  await loadAdminData();flashSaved($('#saveSchedule'));
};
$('#addSpecialClosed').onclick=async()=>{const date=$('#specialClosedDate').value;if(!date)return;const reason=$('#specialClosedReason').value.trim();const {error}=await sb.from('special_closures').upsert({store_id:storeId,closed_date:date,reason,is_closed:true},{onConflict:'store_id,closed_date'});if(error){alert(error.message);return}$('#specialClosedDate').value='';$('#specialClosedReason').value='';await loadAdminData()};
async function removeSpecial(id){const {error}=await sb.from('special_closures').delete().eq('id',id);if(error){alert(error.message);return}await loadAdminData()}

function renderReservations(){
  const statuses=['예약대기','예약확정','방문완료','취소','노쇼'];
  const rs=[...data.reservations].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $('#reservationList').innerHTML=rs.length?rs.map(r=>`<article class="adminItem reservationItem"><div><h3>${r.date} ${r.time} · ${esc(r.customerName||'고객')}</h3><p>${esc(r.serviceName)} · ${esc(r.staffName||'담당없음')} · ${money(r.price)}</p></div><select class="reservationSelect" data-res-status="${r.id}">${statuses.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select></article>`).join(''):'<p class="formNote">아직 예약이 없습니다.</p>';
  $$('[data-res-status]').forEach(sel=>sel.onchange=async()=>{const {error}=await sb.from('reservations').update({status:sel.value}).eq('id',sel.dataset.resStatus);if(error){alert(error.message);return}await loadAdminData()});
}

const CHO=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function initials(str=''){return [...str].map(ch=>{const code=ch.charCodeAt(0)-0xAC00;if(code>=0&&code<11172)return CHO[Math.floor(code/588)];return ch}).join('')}
function customerMatches(c,q){const raw=q.trim().toLowerCase(),num=normalizePhone(q);if(!raw)return true;return c.name.toLowerCase().includes(raw)||initials(c.name).includes(raw)||normalizePhone(c.phone).includes(num)}
function sortedCustomers(){return data.customers.filter(c=>customerMode==='archived'?!!c.archivedAt:!c.archivedAt).sort((a,b)=>a.name.localeCompare(b.name,'ko-KR'))}
function renderCustomers(query=''){
  $('#showActiveCustomers').classList.toggle('active',customerMode==='active');$('#showArchivedCustomers').classList.toggle('active',customerMode==='archived');
  const list=sortedCustomers().filter(c=>customerMatches(c,query));
  $('#customerList').innerHTML=list.length?list.map(c=>`<button class="customerRow" data-customer-id="${c.id}"><span class="customerAvatar">${esc((c.name||'?').slice(0,1))}</span><span class="customerRowMain"><b>${esc(c.name)}</b><small>${esc(formatPhone(c.phone))}</small></span><span class="customerChevron">›</span></button>`).join(''):'<p class="formNote">표시할 고객이 없습니다.</p>';
}
$('#showActiveCustomers').onclick=()=>{customerMode='active';renderCustomers($('#customerSearch').value)};$('#showArchivedCustomers').onclick=()=>{customerMode='archived';renderCustomers($('#customerSearch').value)};
$('#customerSearch').addEventListener('input',e=>{
  const q=e.target.value;renderCustomers(q);const matches=sortedCustomers().filter(c=>customerMatches(c,q)).slice(0,6);const box=$('#customerSuggestions');
  if(!q.trim()||!matches.length){box.classList.add('hidden');box.innerHTML='';return}
  box.innerHTML=matches.map(c=>`<button data-customer-id="${c.id}"><b>${esc(c.name)}</b><small>${esc(formatPhone(c.phone))}</small></button>`).join('');box.classList.remove('hidden');
});
function customerReservations(id){return data.reservations.filter(r=>r.customerId===id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))}
function openCustomer(id){
  const c=data.customers.find(x=>x.id===id);if(!c)return;selectedCustomerId=id;$('#customerSuggestions').classList.add('hidden');$('#customerModal').classList.remove('hidden');
  $('#customerDetailName').textContent=c.name;$('#customerDetailPhone').textContent=formatPhone(c.phone);$('#customerDetailCreated').textContent=`등록 ${String(c.createdAt||'').slice(0,10)}`;$('#customerNote').value=c.memo||'';
  const rs=customerReservations(id),valid=rs.filter(r=>!['취소','노쇼'].includes(r.status));$('#customerVisitCount').textContent=valid.length;$('#customerTotalSpend').textContent=money(valid.reduce((a,r)=>a+r.price,0));$('#customerLastVisit').textContent=valid[0]?.date||'-';
  $('#customerHistory').innerHTML=rs.length?rs.map(r=>`<article><div><b>${r.date} ${r.time}</b><span class="reservationStatus">${r.status}</span></div><p>${esc(r.serviceName)} · ${esc(r.staffName||'담당없음')} · ${money(r.price)}</p></article>`).join(''):'<p class="formNote">이용 기록이 없습니다.</p>';
  $('#archiveCustomer').textContent=c.archivedAt?'고객 복구':'고객 보관';$('#permanentDeleteCustomer').classList.toggle('hidden',!c.archivedAt);
}
$('#customerClose').onclick=()=>$('#customerModal').classList.add('hidden');
$('#saveCustomerNote').onclick=async()=>{const {error}=await sb.from('customers').update({memo:$('#customerNote').value.trim()}).eq('id',selectedCustomerId);if(error){alert(error.message);return}await loadAdminData();openCustomer(selectedCustomerId);flashSaved($('#saveCustomerNote'),'메모 저장 ✓')};
$('#archiveCustomer').onclick=()=>{const c=data.customers.find(x=>x.id===selectedCustomerId);if(!c)return;if(c.archivedAt){askAction('고객을 복구하시겠습니까?',`${c.name} 고객을 고객명단으로 되돌립니다.`,async()=>{await sb.from('customers').update({archived_at:null}).eq('id',c.id);$('#customerModal').classList.add('hidden');await loadAdminData()})}else{askAction('보관하시겠습니까?',`${c.name} 고객을 고객명단에서 보관함으로 이동합니다.`,async()=>{await sb.from('customers').update({archived_at:new Date().toISOString()}).eq('id',c.id);$('#customerModal').classList.add('hidden');await loadAdminData()})}};
$('#permanentDeleteCustomer').onclick=()=>{const c=data.customers.find(x=>x.id===selectedCustomerId);if(!c)return;askAction('영구 삭제하시겠습니까?',`${c.name} 고객과 연결된 예약/히스토리도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,async()=>{await sb.from('reservations').delete().eq('customer_id',c.id);await sb.from('visits').delete().eq('customer_id',c.id);const {error}=await sb.from('customers').delete().eq('id',c.id);if(error){alert(error.message);return}$('#customerModal').classList.add('hidden');await loadAdminData()})};

function askAction(title,text,cb){actionCallback=cb;$('#actionTitle').textContent=title;$('#actionText').textContent=text;$('#actionModal').classList.remove('hidden')}
$('#actionNo').onclick=()=>{$('#actionModal').classList.add('hidden');actionCallback=null};$('#actionYes').onclick=async()=>{const cb=actionCallback;$('#actionModal').classList.add('hidden');actionCallback=null;if(cb)await cb()};

$$('.adminTabs button').forEach(b=>b.onclick=()=>{$$('.adminTabs button').forEach(x=>x.classList.toggle('active',x===b));$$('.adminPanel').forEach(p=>p.classList.toggle('active',p.dataset.panel===b.dataset.tab));if(b.dataset.tab==='customers')renderCustomers($('#customerSearch').value)});

$('#importLocalData').onclick=()=>askAction('이 기기 데이터를 가져올까요?','현재 Supabase의 이 매장 테스트 데이터를 지우고, 이 기기에 남아 있는 매장/서비스/담당자/예약 데이터를 공용 DB로 옮깁니다.',importLocalData);
async function importLocalData(){
  const old=localBackup();if(!old){alert('이 기기에 가져올 기존 데이터가 없습니다.');return}
  showAdminMessage('기기 데이터 이전 중...');
  try{
    await sb.from('visits').delete().eq('store_id',storeId);await sb.from('reservations').delete().eq('store_id',storeId);await sb.from('customers').delete().eq('store_id',storeId);await sb.from('special_closures').delete().eq('store_id',storeId);await sb.from('store_closed_days').delete().eq('store_id',storeId);await sb.from('staff').delete().eq('store_id',storeId);await sb.from('services').delete().eq('store_id',storeId);
    const os=old.store||{},sch=old.schedule||{};
    await sb.from('stores').update({name:os.name||data.store.name,tagline:os.tagline||'',phone:os.phone||'',address:os.address||'',map_url:os.map||'',staff_label:os.staffLabel||'담당자',notice:os.notice||'',staff_enabled:os.staffEnabled!==false,opening_time:sch.open||'10:00',closing_time:sch.close||'20:00',slot_minutes:Number(sch.slotMinutes||30),intro_mode:'none'}).eq('id',storeId);
    const serviceMap=new Map();
    for(let i=0;i<(old.services||[]).length;i++){const s=old.services[i];const {data:row,error}=await sb.from('services').insert({store_id:storeId,name:s.name,description:s.desc||'',price:Number(s.price||0),duration_minutes:Number(s.duration||30),sort_order:i+1}).select('id').single();if(error)throw error;serviceMap.set(s.id,row.id)}
    const staffMap=new Map();
    for(let i=0;i<(old.staff||[]).length;i++){const st=old.staff[i];const {data:row,error}=await sb.from('staff').insert({store_id:storeId,name:st.name,specialty:st.specialty||'',sort_order:i+1}).select('id').single();if(error)throw error;staffMap.set(st.id,row.id);const links=(st.services||[]).map(x=>serviceMap.get(x)).filter(Boolean).map(service_id=>({staff_id:row.id,service_id}));if(links.length){const x=await sb.from('staff_services').insert(links);if(x.error)throw x.error}const days=(st.daysOff||[]).map(weekday=>({staff_id:row.id,weekday:Number(weekday)}));if(days.length){const x=await sb.from('staff_days_off').insert(days);if(x.error)throw x.error}}
    const closed=(sch.closedDays||[]).map(weekday=>({store_id:storeId,weekday:Number(weekday)}));if(closed.length){const x=await sb.from('store_closed_days').insert(closed);if(x.error)throw x.error}
    const specs=(sch.specialClosed||[]).map(x=>({store_id:storeId,closed_date:x.date,reason:x.reason||'',is_closed:true}));if(specs.length){const x=await sb.from('special_closures').insert(specs);if(x.error)throw x.error}
    for(const r of (old.reservations||[])){
      const phone=normalizePhone(r.customerPhone||'');if(!r.customerName||phone.length<9)continue;
      const {data:cust,error:ce}=await sb.from('customers').upsert({store_id:storeId,name:r.customerName,phone:r.customerPhone,phone_normalized:phone},{onConflict:'store_id,phone_normalized'}).select('id').single();if(ce)throw ce;
      const serviceId=serviceMap.get(r.serviceId)||null,staffAny=r.staffId==='any'||!r.staffId,staffId=staffAny?null:(staffMap.get(r.staffId)||null);
      const x=await sb.from('reservations').insert({store_id:storeId,customer_id:cust.id,service_id:serviceId,staff_id:staffId,staff_any:staffAny,reservation_date:r.date,reservation_time:r.time,duration_minutes:Number(r.duration||30),service_name:r.serviceName||old.services?.find(s=>s.id===r.serviceId)?.name||'서비스',staff_name:staffAny?'상관없음':(r.staffName||''),price:Number(r.price||0),status:['예약대기','예약확정','방문완료','취소','노쇼'].includes(r.status)?r.status:'예약확정'});if(x.error)throw x.error;
    }
    localStorage.setItem('smartStoreCloudImported','1');await loadAdminData();showAdminMessage('기기 데이터 이전 완료 ✓');
  }catch(err){console.error(err);alert('데이터 이전 중 오류: '+(err.message||err));showAdminMessage('데이터 이전 실패')}
}

initAuth();
