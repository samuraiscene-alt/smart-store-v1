/* Smart Store - reservation tab layout order */
(() => {
  const PANEL_SELECTOR = '.adminPanel[data-panel="reservations"]';

  function applyReservationLayout(){
    const panel = document.querySelector(PANEL_SELECTOR);
    const title = panel?.querySelector('.panelTitle');
    const list = document.getElementById('reservationList');
    const cancelPolicy = document.getElementById('adminCustomerCancelPolicyCard');
    const reminder = document.getElementById('adminReservationReminderCard');

    if(!panel || !title || !list) return false;

    title.insertAdjacentElement('afterend', list);

    if(cancelPolicy){
      list.insertAdjacentElement('afterend', cancelPolicy);
    }

    if(reminder){
      if(cancelPolicy){
        cancelPolicy.insertAdjacentElement('afterend', reminder);
      }else{
        list.insertAdjacentElement('afterend', reminder);
      }
    }

    return !!(cancelPolicy && reminder);
  }

  function start(){
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const done = applyReservationLayout();
      if(done || tries > 120) clearInterval(timer);
    }, 200);

    setTimeout(applyReservationLayout, 50);
    setTimeout(applyReservationLayout, 500);
    setTimeout(applyReservationLayout, 1500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', start, {once:true});
  }else{
    start();
  }

  window.addEventListener('pageshow', () => setTimeout(applyReservationLayout, 100));
})();
