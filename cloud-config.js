const isAdminPage =
  location.pathname.endsWith('/admin.html') ||
  location.pathname.endsWith('admin.html');

const storeSlugParam =
  new URLSearchParams(location.search).get('store')?.trim();

const storeSlugStorageKey = isAdminPage
  ? 'smartStoreAdminSlug'
  : 'smartStoreCustomerSlug';

if (storeSlugParam) {
  localStorage.setItem(storeSlugStorageKey, storeSlugParam);
}

const resolvedStoreSlug =
  storeSlugParam ||
  localStorage.getItem(storeSlugStorageKey) ||
  'snail-demo';

window.SMART_STORE_CONFIG = Object.freeze({
  supabaseUrl: 'https://jfjxgyclgzxvuwncjork.supabase.co',
  supabaseKey: 'sb_publishable_FYc-zUVTUjsWIIA1LO6gng_M0NpFqSt',
  storeSlug: resolvedStoreSlug
});
const pwaManifestScript = document.createElement('script');
pwaManifestScript.src = 'pwa-manifest-runtime.js?v=20260912-1';
pwaManifestScript.defer = true;
document.head.appendChild(pwaManifestScript);
// 관리자 페이지 전용 추가 스크립트
if (isAdminPage) {
  const googleCalendarScript = document.createElement('script');
  googleCalendarScript.src = 'google-calendar.js?v=20260905-1';
  googleCalendarScript.defer = true;
  document.head.appendChild(googleCalendarScript);

  const reservationEditFixScript = document.createElement('script');
  reservationEditFixScript.src = 'admin-reservation-edit-fix.js?v=20260911-1';
  reservationEditFixScript.defer = true;
  document.head.appendChild(reservationEditFixScript);

  const adminSafeAreaStyle = document.createElement('link');
  adminSafeAreaStyle.rel = 'stylesheet';
  adminSafeAreaStyle.href = 'admin-safe-area-fix.css?v=20260912-1';
  document.head.appendChild(adminSafeAreaStyle);
  const adminStoreManagerScript = document.createElement('script');
adminStoreManagerScript.src = 'admin-store-manager.js?v=20260912-1';
adminStoreManagerScript.defer = true;
document.head.appendChild(adminStoreManagerScript);
const appIconSettingsScript = document.createElement('script');
appIconSettingsScript.src = 'admin-app-icon-settings.js?v=20260912-1';
appIconSettingsScript.defer = true;
document.head.appendChild(appIconSettingsScript);
}
