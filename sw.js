/* ============================================================
   فایل: sw.js
   فهرست:
     بخش ۱: ثابت‌ها
     بخش ۲: نصب و precache (تحمل‌پذیر)
     بخش ۳: فعال‌سازی و حذف کش قدیمی
     بخش ۴: واکشی
     بخش ۵: پیام skipWaiting
   ============================================================ */

// ===== بخش ۱: ثابت‌ها =====
const CACHE_NAME = 'dafter-zaman-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/main.js',
  './src/config.js',
  './src/format.js',
  './src/db.js',
  './src/core.js',
  './src/services.js',
  './src/components.js',
  './src/pages.js',
  './src/styles.css',
  './icons/icon.svg',
  './icons/maskable.svg',
  './vendor/dexie.min.js'
];

// ===== بخش ۲: نصب و precache (تحمل‌پذیر) =====
// هر فایل جدا کش می‌شود؛ اگر یکی نبود، نصب کل SW رد نمی‌شود.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const failed = [];
      for (const url of ASSETS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (e) {
          failed.push(url);
        }
      }
      if (failed.length) {
        console.warn('[SW] فایل‌های کش‌نشده:', failed);
      }
    })
  );
});

// ===== بخش ۳: فعال‌سازی و حذف کش قدیمی =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ===== بخش ۴: واکشی =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

// ===== بخش ۵: پیام skipWaiting =====
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
