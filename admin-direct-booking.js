/* Smart Store - admin direct booking */
(() => {
  const STYLE_ID='adminDirectBookingStyle';
  const MODAL_ID='adminDirectBookingModal';
  const BUTTON_ID='adminDirectBookingOpen';
  let initialized=false;

  const escDirect=(v='')=>String(v).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  const phoneDigits=(v='')=>String(v).replace(/\D/g,'');
  const moneyDirect=n=>Number(n||0).toLocaleString('ko-KR')+'원';

  function addStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${MODAL_ID}{z-index:99998}
      #${MODAL_ID} .adminDirectBookingBox{width:min(94vw,520px);max-height:88vh;overflow:auto}
      #${MODAL_ID} .adminDirectInfo{margin:8px 0 14px;padding:11px 13px;border-radius:14px;background:#f9f3f0;color:#7b6660;font-size:13px;line-height:1.5}
      #${MODAL_ID} .adminDirectServiceInfo{display:block;margin-top:7px;color:#8e817b;font-size:13px}
      #${MODAL_ID} .adminDirectSearchWrap{position:relative}
      #${MODAL_ID} .adminDirectSuggestions{position:absolute;z-index:4;left:0;right:0;top:100%;margin-top:5px;background:#fff;border:1px solid #eadbd5;border-radius:14px;box-shadow:0 12px 30px rgba(74,48,42,.12);overflow:hidden}
      #${MODAL_ID} .adminDirectSuggestions.hidden{display:none}
      #${MODAL_ID} .adminDirectSuggestions button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:12px 14px;color:#3f3431}
      #${MODAL_ID} .adminDirectSuggestions button+button{border-top:1px solid #f1e7e3}
      #${MODAL_ID} .adminDirectSuggestions small{display:block;margin-top:3px;color:#968983}
      #${MODAL_ID} .adminDirectStaffHidden{display:none}
      #adminDirectBookingToast{position:fixed;z-index:100000;left:50%;bottom:calc(26px + env(safe-area-inset-bottom));transform:translateX(-50%);padding:12px 18px;border-radius:999px;background:#5f4540;color:#fff;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.18);opacity:0;pointer-events:none;transition:opacity .2s}
      #adminDirectBookingToast.show{opacity:1}
    `;
    document.head.appendChild(style);
  }

  function showToast(text){
    let toast=document.getElementById('adminDirectBookingToast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='adminDirectBookingToast';
      document.body.appendChild(toast);
    }
    toast.textContent=text;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),1800);
  }

  function ensureButton(){
    if(document.getElementById(BUTTON_ID))return;
    const panel=document.querySelector('.adminPanel[data-panel="reservations"]');
    const title=panel?.querySelector('.panelTitle');
    if(!title)return;
    const button=document.createElement('button');
    button.id=BUTTON_ID;
    button.type='button';
    button.className='primary mini';
    button.textContent='＋ 예약 등록';
    button.onclick=openDirectBooking;
    title.appendChild(button);
  }

  function ensureModal(){
    if(document.getElementById(MODAL_ID))return;
    addStyles();

    const wrap=document.createElement('div');
    wrap.id=MODAL_ID;
    wrap.className='modalBackdrop hidden';
    wrap.innerHTML=`
      <section class="confirmBox editBox adminDirectBookingBox">
        <div class="sheetTop">
          <div>
            <p class="eyebrow">BOOKING</p>
            <h3>관리자 예약 등록</h3>
          </div>
          <button id="adminDirectBookingClose" class="iconBtn" type="button">✕</button>
        </div>

        <div class="adminDirectInfo">
          전화 · 카카오톡 · 현장 접수 예약을 직접 등록합니다.<br>
          관리자 등록 예약은 바로 <b>예약확정</b>됩니다.
        </div>

        <div class="adminDirectSearchWrap field">
          <span>기존 고객 검색</span>
          <input id="adminDirectCustomerSearch" type="search" autocomplete="off" placeholder="이름 또는 전화번호">
          <div id="adminDirectCustomerSuggestions" class="adminDirectSuggestions hidden"></div>
        </div>

        <label class="field">
          <span>고객명</span>
          <input id="adminDirectCustomerName" autocomplete="name" placeholder="이름">
        </label>

        <label class="field">
          <span>전화번호</span>
          <input id="adminDirectCustomerPhone" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000">
        </label>

        <label class="field">
          <span>서비스</span>
          <select id="adminDirectService"></select>
          <small id="adminDirectServiceInfo" class="adminDirectServiceInfo"></small>
        </label>

        <label id="adminDirectStaffField" class="field">
          <span id="adminDirectStaffLabel">담당자</span>
          <select id="adminDirectStaff"></select>
        </label>

        <label class="field">
          <span>예약 날짜</span>
          <input id="adminDirectDate" type="date">
        </label>

        <label class="field">
          <span>예약 시간</span>
          <input id="adminDirectTime" type="time">
        </label>

        <label class="field">
          <span>관리자 메모</span>
          <textarea id="adminDirectNote" rows="3" placeholder="예: 전화 예약 / 요청사항"></textarea>
        </label>

        <div class="confirmActions">
          <button id="adminDirectBookingCancel" class="secondary" type="button">취소</button>
          <button id="adminDirectBookingSave" class="primary" type="button">예약 등록</button>
        </div>
      </section>
    `;
    document.body.appendChild(wrap);

    document.getElementById('adminDirectBookingClose').onclick=closeDirectBooking;
    document.getElementById('adminDirectBookingCancel').onclick=closeDirectBooking;
    document.getElementById('adminDirectBookingSave').onclick=saveDirectBooking;
    document.getElementById('adminDirectService').onchange=()=>{
      refreshServiceInfo();
      refreshStaffOptions();
    };

    const phone=document.getElementById('adminDirectCustomerPhone');
    phone.addEventListener('input',()=>{
      const n=phoneDigits(phone.value).slice(0,11);
      if(n.length<=3)phone.value=n;
      else if(n.length<=7)phone.value=`${n.slice(0,3)}-${n.slice(3)}`;
      else phone.value=`${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
    });

    const search=document.getElementById('adminDirectCustomerSearch');
    search.addEventListener('input',renderCustomerSuggestions);
    search.addEventListener('focus',renderCustomerSuggestions);
    document.addEventListener('click',e=>{
      if(!wrap.contains(e.target))return;
      const pick=e.target.closest('[data-direct-customer]');
      if(pick){
        const c=(data.customers||[]).find(x=>x.id===pick.dataset.directCustomer);
        if(c){
          document.getElementById('adminDirectCustomerName').value=c.name||'';
          document.getElementById('adminDirectCustomerPhone').value=c.phone||'';
          search.value=`${c.name} · ${c.phone}`;
          hideSuggestions();
        }
      }
    });
  }

  function hideSuggestions(){
    document.getElementById('adminDirectCustomerSuggestions')?.classList.add('hidden');
  }

  function renderCustomerSuggestions(){
    const input=document.getElementById('adminDirectCustomerSearch');
    const box=document.getElementById('adminDirectCustomerSuggestions');
    if(!input||!box)return;

    const raw=input.value.trim();
    if(!raw){
      box.classList.add('hidden');
      box.innerHTML='';
      return;
    }

    const q=raw.toLowerCase();
    const qPhone=phoneDigits(raw);
    const matches=(data.customers||[])
      .filter(c=>!c.archivedAt)
      .filter(c=>
        String(c.name||'').toLowerCase().includes(q) ||
        (qPhone && phoneDigits(c.phone||'').includes(qPhone))
      )
      .slice(0,6);

    if(!matches.length){
      box.innerHTML='<button type="button" disabled>검색된 기존 고객이 없습니다.</button>';
    }else{
      box.innerHTML=matches.map(c=>`
        <button type="button" data-direct-customer="${c.id}">
          <b>${escDirect(c.name||'고객')}</b>
          <small>${escDirect(c.phone||'')}</small>
        </button>
      `).join('');
    }
    box.classList.remove('hidden');
  }

  function fillServices(){
    const select=document.getElementById('adminDirectService');
    if(!select)return;

    const services=(data.services||[]).filter(s=>s.active!==false);
    select.innerHTML=services.length
      ? services.map(s=>`<option value="${s.id}">${escDirect(s.name)}</option>`).join('')
      : '<option value="">등록된 서비스 없음</option>';

    refreshServiceInfo();
    refreshStaffOptions();
  }

  function selectedService(){
    const id=document.getElementById('adminDirectService')?.value;
    return (data.services||[]).find(s=>s.id===id)||null;
  }

  function refreshServiceInfo(){
    const info=document.getElementById('adminDirectServiceInfo');
    const service=selectedService();
    if(!info)return;
    info.textContent=service
      ? `${moneyDirect(service.price)} · ${Number(service.duration||30)}분`
      : '';
  }

  function refreshStaffOptions(){
    const field=document.getElementById('adminDirectStaffField');
    const label=document.getElementById('adminDirectStaffLabel');
    const select=document.getElementById('adminDirectStaff');
    if(!field||!select)return;

    if(data.store?.staffEnabled===false){
      field.classList.add('adminDirectStaffHidden');
      select.innerHTML='';
      return;
    }

    field.classList.remove('adminDirectStaffHidden');
    if(label)label.textContent=data.store?.staffLabel||'담당자';

    const serviceId=document.getElementById('adminDirectService')?.value;
    const compatible=(data.staff||[])
      .filter(st=>st.active!==false && Array.isArray(st.services) && st.services.includes(serviceId));

    select.innerHTML=`
      <option value="__any__">${escDirect(data.store?.staffLabel||'담당자')} 상관없음</option>
      ${compatible.map(st=>`<option value="${st.id}">${escDirect(st.name)}</option>`).join('')}
    `;
  }

  function openDirectBooking(){
    ensureModal();
    fillServices();

    document.getElementById('adminDirectCustomerSearch').value='';
    document.getElementById('adminDirectCustomerName').value='';
    document.getElementById('adminDirectCustomerPhone').value='';
    document.getElementById('adminDirectNote').value='';
    hideSuggestions();

    const now=new Date();
    const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);
    document.getElementById('adminDirectDate').value=local.toISOString().slice(0,10);
    document.getElementById('adminDirectTime').value=data.schedule?.open||'10:00';

    document.getElementById(MODAL_ID).classList.remove('hidden');
  }

  function closeDirectBooking(){
    document.getElementById(MODAL_ID)?.classList.add('hidden');
    hideSuggestions();
  }

  async function saveDirectBooking(){
    const name=document.getElementById('adminDirectCustomerName').value.trim();
    const phone=document.getElementById('adminDirectCustomerPhone').value.trim();
    const serviceId=document.getElementById('adminDirectService').value;
    const date=document.getElementById('adminDirectDate').value;
    const time=document.getElementById('adminDirectTime').value;
    const note=document.getElementById('adminDirectNote').value.trim();
    const staffSelect=document.getElementById('adminDirectStaff');

    if(!name){
      alert('고객명을 입력해주세요.');
      return;
    }
    if(phoneDigits(phone).length<9){
      alert('전화번호를 확인해주세요.');
      return;
    }
    if(!serviceId){
      alert('서비스를 선택해주세요.');
      return;
    }
    if(!date||!time){
      alert('예약 날짜와 시간을 선택해주세요.');
      return;
    }

    const staffEnabled=data.store?.staffEnabled!==false;
    const staffAny=staffEnabled && staffSelect?.value==='__any__';
    const staffId=staffEnabled && !staffAny ? (staffSelect?.value||null) : null;

    if(staffEnabled && !staffAny && !staffId){
      alert(`${data.store?.staffLabel||'담당자'}를 선택해주세요.`);
      return;
    }

    const save=document.getElementById('adminDirectBookingSave');
    save.disabled=true;
    save.textContent='등록 중...';

    const {data:result,error}=await sb.rpc('create_admin_reservation',{
      p_store_id:storeId,
      p_customer_name:name,
      p_customer_phone:phone,
      p_service_id:serviceId,
      p_staff_id:staffId,
      p_staff_any:staffAny,
      p_date:date,
      p_time:time,
      p_note:note
    });

    save.disabled=false;
    save.textContent='예약 등록';

    if(error){
      alert(error.message);
      return;
    }

    closeDirectBooking();
    await loadAdminData();
    showToast('예약 등록 완료 ✓');

    if(typeof showAdminMessage==='function'){
      showAdminMessage('관리자 예약 등록 완료 ✓');
    }

    return result;
  }

  function init(){
    if(initialized)return;
    if(typeof data==='undefined'||typeof storeId==='undefined')return;
    ensureButton();
    ensureModal();
    initialized=true;
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(document.querySelector('.adminPanel[data-panel="reservations"]') && typeof data!=='undefined'){
      init();
      clearInterval(timer);
    }
    if(tries>80)clearInterval(timer);
  },250);

  window.addEventListener('pageshow',()=>setTimeout(init,100));
})();
