window.SMART_STORE_CONFIG = Object.freeze({
  supabaseUrl: 'https://jfjxgyclgzxvuwncjork.supabase.co',
  supabaseKey: 'sb_publishable_FYc-zUVTUjsWIIA1LO6gng_M0NpFqSt',
  storeSlug: 'snail-demo'
});

// 관리자 페이지에서만 Google Calendar 연결 UI를 추가로 불러온다.
if (location.pathname.endsWith('/admin.html') || location.pathname.endsWith('admin.html')) {
  const script = document.createElement('script');
  script.src = 'google-calendar.js?v=20260905-1';
  script.defer = true;
  document.head.appendChild(script);
}
