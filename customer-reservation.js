/* Smart Store - customer push deep link */
(() => {
  const cfg = window.SMART_STORE_CONFIG;
  if (!cfg || !window.supabase) return;

  const detailSb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  const DAYS = ['일','월','화','수','목','금','토'];

  const escHtml = (value='') => String(value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));

  const won = value => `${Number(value || 0).toLocaleString('ko-KR')}원`;

  function koreanDate(iso){
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso || '');
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
  }

  function detailBody(r, rejected=false){
    return `
      <div class="reviewList">
        <div><span>예약자</span><b>${escHtml(r.customer_name || '고객')}</b></div>
        <div><span>날짜</span><b>${escHtml(koreanDate(r.reservation_date))}</b></div>
        <div><span>시간</span><b>${escHtml(r.reservation_time || '-')}</b></div>
        <div><span>서비스</span><b>${escHtml(r.service_name || '-')}</b></div>
        <div><span>담당자</span><b>${escHtml(r.staff_name || '담당없음')}</b></div>
        <div><span>예상금액</span><b>${won(r.price)}</b></div>
      </div>
      ${rejected ? '<p style="margin-top:14px">다른 시간으로 다시 예약해주세요.</p>' : ''}
    `;
  }

  async function waitForApp(){
    for(let i=0;i<20;i++){
      if(typeof window.showConfirm === 'function' || typeof showConfirm === 'function') return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function openReservationFromPush(){
    const params = new URLSearchParams(location.search);
    const reservationId = params.get('reservation_id');
    if(!reservationId) return;

    // 같은 알림을 새로고침할 때 반복 표시하지 않도록 주소를 먼저 정리합니다.
    history.replaceState({}, '', location.pathname + location.hash);

    try{
      const {data:r, error} = await detailSb.rpc('public_reservation_detail', {
        p_reservation_id: reservationId
      });
      if(error) throw error;
      if(!r) throw new Error('예약 정보를 찾을 수 없습니다.');

      await waitForApp();

      if(r.status === '예약거절'){
        showConfirm({
          title:'예약이 거절되었습니다',
          body:detailBody(r, true),
          ok:'다시 예약하기',
          cancel:'닫기',
          onOk:()=>{
            if(typeof openBooking === 'function'){
              openBooking(r.service_id ? {serviceId:r.service_id} : {});
            }
          }
        });
        return;
      }

      if(r.status === '예약확정'){
        showConfirm({
          title:'예약이 확정되었습니다 ✓',
          body:detailBody(r, false),
          ok:'확인',
          single:true
        });
        return;
      }

      showConfirm({
        title:'예약 정보',
        body:detailBody(r, false),
        ok:'확인',
        single:true
      });
    }catch(err){
      console.error('reservation deep link error', err);
      await waitForApp();
      if(typeof showConfirm === 'function'){
        showConfirm({
          title:'예약 정보를 불러올 수 없습니다',
          body:'<p>잠시 후 예약 메뉴에서 다시 확인해주세요.</p>',
          ok:'확인',
          single:true
        });
      }
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => setTimeout(openReservationFromPush, 150));
  }else{
    setTimeout(openReservationFromPush, 150);
  }
})();