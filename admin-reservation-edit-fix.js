/* Smart Store - admin reservation edit guard/fixes */
(() => {
  let activeReservationId = null;

  function currentReservation(){
    return (data?.reservations||[]).find(r=>r.id===activeReservationId)||null;
  }

  function selectedService(){
    const id=document.getElementById('reservationEditService')?.value;
    return (data?.services||[]).find(s=>s.id===id)||null;
  }

  function addAnyStaffOption(){
    const select=document.getElementById('reservationEditStaff');
    if(!select || data?.store?.staffEnabled===false)return;

    if(!select.querySelector('option[value="__any__"]')){
      const option=document.createElement('option');
      option.value='__any__';
      option.textContent=`${data.store?.staffLabel||'담당자'} 상관없음`;
      select.insertBefore(option,select.firstChild);
    }

    const r=currentReservation();
    if(r?.staffAny || !r?.staffId){
      select.value='__any__';
    }
  }

  function kstNowParts(){
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return {
      date:`${get('year')}-${get('month')}-${get('day')}`,
      time:`${get('hour')}:${get('minute')}`
    };
  }

  function patchModal(){
    const modal=document.getElementById('reservationScheduleModal');
    const save=document.getElementById('reservationScheduleSave');
    const service=document.getElementById('reservationEditService');
    if(!modal||!save||save.dataset.editFix==='1')return false;

    save.dataset.editFix='1';
    save.onclick=saveReservationEditFixed;
    service?.addEventListener('change',()=>setTimeout(addAnyStaffOption,0));
    return true;
  }

  async function saveReservationEditFixed(){
    const r=currentReservation();
    const service=selectedService();
    const date=document.getElementById('reservationEditDate')?.value||'';
    const time=document.getElementById('reservationEditTime')?.value||'';
    const note=document.getElementById('reservationEditNote')?.value.trim()||'';

    if(!r){ alert('수정할 예약을 찾을 수 없습니다.'); return; }
    if(!service){ alert('서비스를 선택해주세요.'); return; }
    if(!date||!time){ alert('날짜와 시간을 선택해주세요.'); return; }

    const now=kstNowParts();
    if(date<now.date || (date===now.date && time<now.time)){
      alert('이미 지난 시간으로 예약을 변경할 수 없습니다.');
      return;
    }

    const patch={
      service_id:service.id,
      service_name:service.name,
      price:Number(service.price||0),
      duration_minutes:Number(service.duration||30),
      reservation_date:date,
      reservation_time:time,
      note:note||null
    };

    if(data.store?.staffEnabled!==false){
      const staffValue=document.getElementById('reservationEditStaff')?.value||'';

      if(staffValue==='__any__'){
        patch.staff_id=null;
        patch.staff_name=null;
        patch.staff_any=true;
      }else{
        const staff=(data.staff||[]).find(s=>s.id===staffValue);
        if(!staff){
          alert(`선택한 서비스가 가능한 ${data.store?.staffLabel||'담당자'}를 선택해주세요.`);
          return;
        }
        patch.staff_id=staff.id;
        patch.staff_name=staff.name;
        patch.staff_any=false;
      }
    }else{
      patch.staff_id=null;
      patch.staff_name=null;
      patch.staff_any=false;
    }

    const button=document.getElementById('reservationScheduleSave');
    const original=button.textContent;
    button.disabled=true;
    button.textContent='저장 중...';

    const {error}=await sb
      .from('reservations')
      .update(patch)
      .eq('id',r.id);

    button.disabled=false;
    button.textContent=original;

    if(error){
      alert(error.message||'예약 수정에 실패했습니다.');
      return;
    }

    document.getElementById('reservationScheduleModal')?.classList.add('hidden');
    activeReservationId=null;

    await loadAdminData();
    showAdminMessage?.('예약 상세 변경 완료 ✓');
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-edit-reservation]');
    if(!button)return;

    activeReservationId=button.dataset.editReservation;

    setTimeout(()=>{
      patchModal();
      addAnyStaffOption();
    },0);
  });

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    patchModal();
    if(tries>80)clearInterval(timer);
  },250);
})();
