/* Smart Store - block past reservation times */
(() => {
  const KST_OFFSET = '+09:00';

  function slotMs(date, time) {
    if (!date || !time) return NaN;
    return new Date(`${date}T${String(time).slice(0,5)}:00${KST_OFFSET}`).getTime();
  }

  function isPastSlot(date, time) {
    const ms = slotMs(date, time);
    return Number.isFinite(ms) && ms <= Date.now();
  }

  function showPastAlert() {
    try {
      showConfirm({
        title: '이미 지난 시간입니다',
        body: '<p>현재 시간보다 이전 예약시간은 선택할 수 없습니다.<br>다른 시간을 선택해주세요.</p>',
        ok: '확인',
        single: true
      });
    } catch (err) {
      alert('이미 지난 시간입니다. 다른 시간을 선택해주세요.');
    }
  }

  function clearPastSelection() {
    if (typeof booking === 'undefined') return;
    if (booking.date && booking.time && isPastSlot(booking.date, booking.time)) {
      booking.time = null;
      try { renderBooking(); } catch {}
    }
  }

  function disablePastButtons() {
    if (typeof booking === 'undefined' || !booking.date) return;
    const grid = document.getElementById('timeGrid');
    if (!grid) return;

    grid.querySelectorAll('.timeBtn').forEach(btn => {
      const t = String(btn.textContent || '').trim().slice(0,5);
      if (isPastSlot(booking.date, t)) {
        btn.disabled = true;
        btn.dataset.pastTime = '1';
        btn.setAttribute('aria-disabled', 'true');
        btn.title = '이미 지난 시간';
      }
    });
  }

  // 1) 시간표를 그린 직후, 오늘의 지난 슬롯은 즉시 비활성화.
  if (typeof renderTimes === 'function') {
    const originalRenderTimes = renderTimes;
    renderTimes = async function(...args) {
      const result = await originalRenderTimes.apply(this, args);
      disablePastButtons();
      clearPastSelection();
      return result;
    };
  }

  // 2) 사용자가 이미 지난 시간 버튼을 누르려 해도 선택 자체를 차단.
  if (typeof confirmTime === 'function') {
    const originalConfirmTime = confirmTime;
    confirmTime = function(t) {
      if (typeof booking !== 'undefined' && isPastSlot(booking.date, t)) {
        clearPastSelection();
        disablePastButtons();
        showPastAlert();
        return;
      }

      return originalConfirmTime.apply(this, arguments);
    };
  }

  // 3) 시간 선택 후 기다리는 사이 시간이 지나도 다음 단계 진입 차단.
  const nextBtn = document.getElementById('toCustomerInfo');
  if (nextBtn) {
    const originalNext = nextBtn.onclick;
    nextBtn.onclick = function(e) {
      if (typeof booking !== 'undefined' &&
          booking.date &&
          booking.time &&
          isPastSlot(booking.date, booking.time)) {
        e?.preventDefault?.();
        clearPastSelection();
        disablePastButtons();
        showPastAlert();
        return;
      }

      return originalNext?.call(this, e);
    };
  }

  // 4) 예약내용 최종 확인 단계에서도 다시 검사.
  const finalReviewBtn = document.getElementById('finalReview');
  if (finalReviewBtn) {
    const originalFinalReview = finalReviewBtn.onclick;
    finalReviewBtn.onclick = function(e) {
      if (typeof booking !== 'undefined' &&
          booking.date &&
          booking.time &&
          isPastSlot(booking.date, booking.time)) {
        e?.preventDefault?.();
        clearPastSelection();
        showPastAlert();
        try { setStep(3); } catch {}
        return;
      }

      return originalFinalReview?.call(this, e);
    };
  }

  // 5) RPC 호출 직전에도 마지막으로 검사.
  if (typeof createReservation === 'function') {
    const originalCreateReservation = createReservation;
    createReservation = async function(...args) {
      if (typeof booking !== 'undefined' &&
          booking.date &&
          booking.time &&
          isPastSlot(booking.date, booking.time)) {
        clearPastSelection();
        showPastAlert();
        try { setStep(3); } catch {}
        return;
      }

      return originalCreateReservation.apply(this, args);
    };
  }

  // 시간 선택창을 오래 열어 둔 경우에도 자동으로 현재 시각을 반영.
  setInterval(() => {
    const sheet = document.getElementById('timeSheet');
    if (!sheet || sheet.classList.contains('hidden')) return;
    disablePastButtons();
    clearPastSelection();
  }, 10000);
})();
