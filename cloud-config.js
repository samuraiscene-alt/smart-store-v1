window.SMART_STORE_CONFIG = Object.freeze({
  supabaseUrl: 'https://jfjxgyclgzxvuwncjork.supabase.co',
  supabaseKey: 'sb_publishable_FYc-zUVTUjsWIIA1LO6gng_M0NpFqSt',
  storeSlug: 'snail-demo'
});

// 관리자 페이지 전용 추가 스크립트
if (location.pathname.endsWith('/admin.html') || location.pathname.endsWith('admin.html')) {
  const googleCalendarScript = document.createElement('script');
  googleCalendarScript.src = 'google-calendar.js?v=20260905-1';
  googleCalendarScript.defer = true;
  document.head.appendChild(googleCalendarScript);

  const reservationEditFixScript = document.createElement('script');
  reservationEditFixScript.src = 'admin-reservation-edit-fix.js?v=20260911-1';
  reservationEditFixScript.defer = true;
  document.head.appendChild(reservationEditFixScript);
}
