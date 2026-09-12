/* Smart Store - early per-store PWA bootstrap */
(() => {
  const isAdmin =
    location.pathname.endsWith('/admin.html') ||
    location.pathname.endsWith('admin.html');

  const storageKey = isAdmin
    ? 'smartStoreAdminSlug'
    : 'smartStoreCustomerSlug';

  const params =
    new URLSearchParams(location.search);

  const querySlug =
    params.get('store')?.trim();

  if (querySlug) {
    localStorage.setItem(
      storageKey,
      querySlug
    );
  }

  const storeSlug =
    querySlug ||
    localStorage.getItem(storageKey) ||
    'snail-demo';

  const path =
    location.pathname;

  const basePath =
    path.slice(
      0,
      path.lastIndexOf('/') + 1
    );

  const base =
    location.origin + basePath;

  const endpoint =
    'https://jfjxgyclgzxvuwncjork.supabase.co/functions/v1/pwa-manifest';

  const manifestParams =
    new URLSearchParams({
      store: storeSlug,
      mode: isAdmin
        ? 'admin'
        : 'customer',
      base
    });

  const manifestLink =
    document.createElement('link');

  manifestLink.rel =
    'manifest';

  manifestLink.crossOrigin =
    'anonymous';

  manifestLink.href =
    `${endpoint}?${manifestParams.toString()}`;

  document.head.appendChild(
    manifestLink
  );

  const iconParams =
    new URLSearchParams(
      manifestParams
    );

  iconParams.set(
    'asset',
    'icon'
  );

  const appleIcon =
    document.createElement('link');

  appleIcon.rel =
    'apple-touch-icon';

  appleIcon.href =
    `${endpoint}?${iconParams.toString()}`;

  document.head.appendChild(
    appleIcon
  );
})();
