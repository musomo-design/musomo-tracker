/* Musomo Tracker — locale runtime (en / it / es / fr / de). */
(function () {
  const LOCALE_KEY = 'musomo-tracker:locale';
  const SUPPORTED = ['en', 'it', 'es', 'fr', 'de'];
  const DEFAULT = 'en';

  function normalize(code) {
    if (!code || code === 'system') return null;
    const base = String(code).trim().toLowerCase().replace('_', '-').split('-')[0];
    return SUPPORTED.includes(base) ? base : null;
  }

  function detectFromNavigator() {
    try {
      const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
      for (const raw of langs) {
        const hit = normalize(raw);
        if (hit) return hit;
      }
    } catch (_) {}
    return DEFAULT;
  }

  function getStoredLocale() {
    try {
      return localStorage.getItem(LOCALE_KEY);
    } catch (_) {
      return null;
    }
  }

  let currentLocale = DEFAULT;
  let systemLocale = detectFromNavigator();

  function resolveLocale(requested) {
    if (!requested || requested === 'system') {
      return systemLocale || DEFAULT;
    }
    return normalize(requested) || DEFAULT;
  }

  function getLocalePack(code) {
    const pack = window.MUSOMO_LOCALES?.[code];
    if (pack && typeof pack === 'object') return pack;
    return window.MUSOMO_LOCALES?.[DEFAULT] || {};
  }

  function t(key, pack) {
    const dict = pack || getLocalePack(currentLocale);
    return dict[key] ?? window.MUSOMO_LOCALES?.[DEFAULT]?.[key] ?? key;
  }

  async function refreshSystemLocale() {
    try {
      const invoke =
        window.__TAURI__?.core?.invoke ?? window.__TAURI__?.invoke;
      if (typeof invoke === 'function') {
        const raw = await invoke('get_system_locale');
        const hit = normalize(raw);
        if (hit) systemLocale = hit;
      }
    } catch (_) {}
    if (!systemLocale) systemLocale = detectFromNavigator();
    return systemLocale;
  }

  function setLocale(requested, options = {}) {
    const next =
      requested === 'system'
        ? systemLocale || detectFromNavigator()
        : resolveLocale(requested);
    currentLocale = next;
    try {
      localStorage.setItem(LOCALE_KEY, requested === 'system' ? 'system' : next);
    } catch (_) {}
    document.documentElement.lang = next;
    if (options.apply !== false && typeof window.applyLang === 'function') {
      window.applyLang();
    }
    if (options.syncMenu !== false && typeof window.syncAppMenuLocale === 'function') {
      void window.syncAppMenuLocale();
    }
    return next;
  }

  async function initLocale() {
    await refreshSystemLocale();
    const stored = getStoredLocale();
    if (stored === 'system' || !stored) {
      setLocale('system', { apply: false, syncMenu: false });
    } else {
      setLocale(stored, { apply: false, syncMenu: false });
    }
    return currentLocale;
  }

  function getStrings() {
    return getLocalePack(currentLocale);
  }

  window.MusomoI18n = {
    LOCALE_KEY,
    SUPPORTED,
    DEFAULT,
    normalize,
    detectFromNavigator,
    refreshSystemLocale,
    resolveLocale,
    getLocale: () => currentLocale,
    getStoredPreference: () => getStoredLocale() || 'system',
    getSystemLocale: () => systemLocale,
    setLocale,
    initLocale,
    getStrings,
    t
  };
})();
