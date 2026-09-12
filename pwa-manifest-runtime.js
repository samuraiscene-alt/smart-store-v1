/* Smart Store - dynamic per-store PWA manifest v1 */
(() => {
  if (window.__smartStoreDynamicManifestV1) return;
  window.__smartStoreDynamicManifestV1 = true;

  const CONFIG = window.SMART_STORE_CONFIG || {};

  if (
    !CONFIG.supabaseUrl ||
    !CONFIG.supabaseKey ||
    !CONFIG.storeSlug ||
    !window.supabase
  ) return;

  const sb = window.supabase.createClient(
    CONFIG.supabaseUrl,
    CONFIG.supabaseKey
  );

  const isAdmin =
    location.pathname.endsWith('/admin.html') ||
    location.pathname.endsWith('admin.html');

  function basePath() {
    const path = location.pathname;

    const lastSlash =
      path.lastIndexOf('/');

    return path.slice(
      0,
      lastSlash + 1
    );
  }

  function absolutePageURL(page, slug) {
    return (
      location.origin +
      basePath() +
      page +
      '?store=' +
      encodeURIComponent(slug)
    );
  }

  function manifestId(page, slug) {
    return absolutePageURL(
      page,
      slug
    );
  }

  function pickIcons(store) {
    const config =
      store.app_icon_config || {};

    const customer =
      config.customer || {};

    const admin =
      config.admin || {};

    if (isAdmin) {
      return {
        icon192:
          admin.icon192 ||
          store.admin_app_icon_url ||
          'admin-app-icon-192.png',

        icon512:
          admin.icon512 ||
          store.admin_app_icon_url ||
          'admin-app-icon-512.png'
      };
    }

    return {
      icon192:
        customer.icon192 ||
        store.customer_app_icon_url ||
        'customer-app-icon-192.png',

      icon512:
        customer.icon512 ||
        store.customer_app_icon_url ||
        'customer-app-icon-512.png'
    };
  }

  function replaceManifest(manifest) {
    const oldLink =
      document.querySelector(
        'link[rel="manifest"]'
      );

    const json =
      JSON.stringify(manifest);

    const blob =
      new Blob(
        [json],
        {
          type:
            'application/manifest+json'
        }
      );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement(
        'link'
      );

    link.rel =
      'manifest';

    link.href =
      url;

    if (oldLink) {
      oldLink.replaceWith(link);
    } else {
      document.head.appendChild(
        link
      );
    }
  }

  function setAppleTouchIcon(url) {
    let link =
      document.querySelector(
        'link[rel="apple-touch-icon"]'
      );

    if (!link) {
      link =
        document.createElement(
          'link'
        );

      link.rel =
        'apple-touch-icon';

      document.head.appendChild(
        link
      );
    }

    link.href =
      url;
  }

  function setAppleTitle(name) {
    let meta =
      document.querySelector(
        'meta[name="apple-mobile-web-app-title"]'
      );

    if (!meta) {
      meta =
        document.createElement(
          'meta'
        );

      meta.name =
        'apple-mobile-web-app-title';

      document.head.appendChild(
        meta
      );
    }

    meta.content =
      name;
  }

  function setThemeColor(color) {
    const meta =
      document.querySelector(
        'meta[name="theme-color"]'
      );

    if (meta) {
      meta.content =
        color;
    }
  }

  function setDocumentTitle(name) {
    document.title =
      name;
  }

  async function loadStore() {
    const {
      data,
      error
    } =
      await sb.rpc(
        'public_store_payload',
        {
          p_slug:
            CONFIG.storeSlug
        }
      );

    if (error) throw error;

    return data?.store || null;
  }

  async function init() {
    try {
      const store =
        await loadStore();

      if (!store) return;

      const slug =
        store.slug ||
        CONFIG.storeSlug;

      const appName =
        (
          store.app_name ||
          store.name ||
          'Smart Store'
        ).trim();

      const finalName =
        isAdmin
          ? `${appName} 관리자`
          : appName;

      const page =
        isAdmin
          ? 'admin.html'
          : 'index.html';

      const themeColor =
        store.app_theme_color ||
        (
          isAdmin
            ? '#211c1a'
            : '#f8f4f1'
        );

      const icons =
        pickIcons(store);

      const startURL =
        absolutePageURL(
          page,
          slug
        );

      const scope =
        location.origin +
        basePath();

      const manifest = {
        id:
          manifestId(
            page,
            slug
          ),

        name:
          finalName,

        short_name:
          finalName,

        description:
          isAdmin
            ? `${appName} 관리자 앱`
            : `${appName} 매장 앱`,

        start_url:
          startURL,

        scope:
          scope,

        display:
          'standalone',

        background_color:
          themeColor,

        theme_color:
          themeColor,

        lang:
          'ko-KR',

        prefer_related_applications:
          false,

        icons: [
          {
            src:
              icons.icon192,

            sizes:
              '192x192',

            type:
              'image/png',

            purpose:
              'any'
          },
          {
            src:
              icons.icon512,

            sizes:
              '512x512',

            type:
              'image/png',

            purpose:
              'any'
          }
        ]
      };

      replaceManifest(
        manifest
      );

      setAppleTouchIcon(
        icons.icon512
      );

      setAppleTitle(
        finalName
      );

      setThemeColor(
        themeColor
      );

      setDocumentTitle(
        finalName
      );

      window.SMART_STORE_PWA =
        Object.freeze({
          storeSlug:
            slug,

          appName:
            finalName,

          startUrl:
            startURL,

          icon192:
            icons.icon192,

          icon512:
            icons.icon512
        });

      window.dispatchEvent(
        new CustomEvent(
          'smart-store-pwa-ready',
          {
            detail:
              window.SMART_STORE_PWA
          }
        )
      );

    } catch (error) {
      console.warn(
        'dynamic PWA manifest failed',
        error
      );
    }
  }

  init();
})();
