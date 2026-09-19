/* ============================================================
   فایل: src/main.js
   فهرست:
     بخش ۱: وابستگی‌ها
     بخش ۲: تم
     بخش ۳: مسیریاب
     بخش ۴: Service Worker و به‌روزرسانی
     بخش ۵: راه‌اندازی
   ============================================================ */

// ===== بخش ۱: وابستگی‌ها =====
import { openDatabase, getSetting, setSetting } from './db.js';
import { runSeedIfNeeded, installGlobalErrorHandlers, logError } from './services.js';
import { showToast } from './components.js';
import { renderHome, renderHistory, renderActivities, renderSettings, renderDev } from './pages.js';

// ===== بخش ۲: تم =====
function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeSetting = theme;
}

// ===== بخش ۳: مسیریاب =====
const ROUTES = {
  home: renderHome,
  history: renderHistory,
  activities: renderActivities,
  settings: renderSettings,
  dev: renderDev
};

function getRoute() {
  const hash = location.hash || '#/home';
  const name = hash.replace(/^#\//, '').split('?')[0] || 'home';
  return ROUTES[name] ? name : 'home';
}

async function navigate() {
  const route = getRoute();
  const app = document.getElementById('app');
  app.innerHTML = '<div class="loading">…</div>';
  try {
    await ROUTES[route](app);
  } catch (e) {
    logError(e);
    app.innerHTML = '<div class="error-box">خطا در بارگذاری صفحه.</div>';
  }
  document.querySelectorAll('#bottom-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

// ===== بخش ۴: Service Worker و به‌روزرسانی =====
function setupServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    logError('مرورگر از Service Worker پشتیبانی نمی‌کند.');
    return;
  }

  const doRegister = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });

      if (reg.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable(reg.waiting);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            notifyUpdateAvailable(newWorker);
          } else if (newWorker.state === 'redundant') {
            logError('SW نصب نشد (redundant). احتمالاً یک فایل در ASSETS موجود نیست.');
          }
        });
      });

      reg.onerror = (e) => logError('خطای SW: ' + (e?.message || ''));

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        location.reload();
      });
    } catch (e) {
      logError('ثبت SW ناموفق: ' + (e?.message || e));
    }
  };

  // اگر صفحه قبلاً کاملاً بارگذاری شده، فوراً ثبت کن؛ وگرنه منتظر load بمان.
  if (document.readyState === 'complete') {
    doRegister();
  } else {
    window.addEventListener('load', doRegister, { once: true });
  }
}

function notifyUpdateAvailable(worker) {
  showToast('نسخه جدید آماده است.', {
    actionLabel: 'به‌روزرسانی',
    duration: 10000,
    onAction: () => worker.postMessage({ type: 'SKIP_WAITING' })
  });
}

// ===== بخش ۵: راه‌اندازی =====
async function bootstrap() {
  installGlobalErrorHandlers();

  // SW را قبل از هر await دیگری شروع کن تا هیچوقت دیر نشود.
  setupServiceWorker();

  try {
    const theme = await getSetting('theme');
    applyTheme(theme);
  } catch (_) {
    applyTheme('system');
  }

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
    const t = await getSetting('theme');
    if (t === 'system') applyTheme('system');
  });

  try {
    await openDatabase();
  } catch (e) {
    logError(e);
    showToast('خطا در باز کردن دیتابیس. آیا vendor/dexie.min.js وجود دارد؟');
    return;
  }

  try {
    await runSeedIfNeeded();
  } catch (e) {
    logError(e);
  }

  try {
    if (navigator.storage?.persist) {
      const ok = await navigator.storage.persist();
      await setSetting('storagePersisted', ok);
    }
  } catch (_) {}

  window.addEventListener('hashchange', navigate);
  if (!location.hash) location.hash = '#/home';
  await navigate();
}

bootstrap();
