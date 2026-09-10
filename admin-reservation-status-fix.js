/* Smart Store - admin reservation status consistency fix v1 */
(() => {
  if (window.__smartStoreReservationStatusFixV1) return;
  window.__smartStoreReservationStatusFixV1 = true;

  const STATUS_SELECTOR = '#reservationList [data-res-status]';

  function cleanupCustomerCancelVisual(reservationId, nextStatus){
    const sel = document.querySelector(
      `[data-res-status="${CSS.escape(reservationId)}"]`
    );
    if(!sel) return;

    const item = sel.closest('.reservationItem');

    if(nextStatus !== '취소' || nextStatus === '취소'){
      [...sel.options].forEach(opt => {
        if(opt.textContent.trim() === '고객취소'){
          opt.textContent = '취소';
          opt.value = '취소';
        }
      });

      sel.classList.remove('customerCancelledSelect');
      item?.classList.remove('customerCancelledItem');
    }

    if(nextStatus === '예약대기'){
      item?.classList.add('pendingApproval');
    }else{
      item?.classList.remove('pendingApproval');
    }
  }

  async function handleStatusChange(event){
    const sel = event.target.closest?.(STATUS_SELECTOR);
    if(!sel) return;

    /*
      기존 admin.js / admin-reservation-archive.js 의 status-only update보다
      먼저 처리하여 cancelled_by까지 함께 정리한다.
    */
    event.stopImmediatePropagation();

    const reservationId = sel.dataset.resStatus;
    const nextStatus = sel.value;

    if(!reservationId || typeof sb === 'undefined'){
      return;
    }

    const currentReservation =
      typeof data !== 'undefined' && Array.isArray(data.reservations)
        ? data.reservations.find(r => r.id === reservationId)
        : null;

    const wasPending = currentReservation?.status === '예약대기';

    const payload = {
      status: nextStatus,
      cancelled_by: nextStatus === '취소' ? 'admin' : null
    };

    const { error } = await sb
      .from('reservations')
      .update(payload)
      .eq('id', reservationId);

    if(error){
      alert(error.message);
      if(typeof loadAdminData === 'function'){
        await loadAdminData();
      }
      return;
    }

    if(
      wasPending &&
      ['예약확정','예약거절'].includes(nextStatus)
    ){
      try{
        await window.SmartStorePush
          ?.sendReservationStatus(reservationId);
      }catch(err){
        console.warn('reservation status push failed', err);
      }
    }

    if(typeof loadAdminData === 'function'){
      await loadAdminData();
    }

    /*
      고객취소 알림 모듈의 내부 목록도 최신 DB 상태로 다시 읽게 한다.
      focus 이벤트는 해당 모듈이 이미 사용하는 정상 refresh 경로다.
    */
    setTimeout(() => {
      window.dispatchEvent(new Event('focus'));
    }, 20);

    /*
      이전 customer 취소 장식이 잠시 남지 않도록 렌더 직후와
      알림 refresh 이후에 한 번씩 정리한다.
    */
    cleanupCustomerCancelVisual(reservationId, nextStatus);
    setTimeout(
      () => cleanupCustomerCancelVisual(reservationId, nextStatus),
      180
    );
    setTimeout(
      () => cleanupCustomerCancelVisual(reservationId, nextStatus),
      420
    );
  }

  document.addEventListener('change', handleStatusChange, true);
})();
