/* ============================================================
   فایل: src/services.js
   فهرست:
     بخش ۱: وابستگی‌ها
     بخش ۲: logger
     بخش ۳: seedService
     بخش ۴: backupService (فاز ۱)
   ============================================================ */

// ===== بخش ۱: وابستگی‌ها =====
import { ERROR_LOG_KEY, ERROR_LOG_MAX } from './config.js';
import { getSetting, setSetting } from './db.js';
import { bulkAddActivities } from './db.js';

// ===== بخش ۲: logger =====
/**
 * ثبت یک خطا در localStorage (فقط ۵۰ مورد آخر).
 */
export function logError(input) {
  try {
    const item = {
      at: Date.now(),
      message: typeof input === 'string' ? input : (input?.message ?? String(input)),
      stack: typeof input === 'object' && input?.stack ? String(input.stack) : ''
    };
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(item);
    while (list.length > ERROR_LOG_MAX) list.shift();
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(list));
  } catch (_) {}
}

/**
 * خواندن همه خطاهای ثبت‌شده.
 */
export function getErrors() {
  try {
    const raw = localStorage.getItem(ERROR_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * پاک‌کردن همه خطاها.
 */
export function clearErrors() {
  try { localStorage.removeItem(ERROR_LOG_KEY); } catch (_) {}
}

/**
 * نصب window.onerror و unhandledrejection.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    logError(e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    logError(e.reason ?? 'unhandledrejection');
  });
}

// ===== بخش ۳: seedService =====
const DEFAULT_ACTIVITIES = [
  { name: 'خواب', icon: '😴', color: '#5C6BC0', isFavorite: true },
  { name: 'درس دانشگاه', icon: '🎓', color: '#26A69A', isFavorite: true },
  { name: 'مطالعه آزاد', icon: '📚', color: '#42A5F5', isFavorite: true },
  { name: 'برنامه‌نویسی', icon: '💻', color: '#7E57C2', isFavorite: true },
  { name: 'ورزش', icon: '🏋️', color: '#EF5350', isFavorite: true },
  { name: 'گوشی', icon: '📱', color: '#FFA726', isFavorite: true },
  { name: 'شبکه‌های اجتماعی', icon: '💬', color: '#EC407A', isFavorite: true },
  { name: 'بازی', icon: '🎮', color: '#66BB6A', isFavorite: true },
  { name: 'بهداشت', icon: '🧼', color: '#26C6DA', isFavorite: false },
  { name: 'غذا', icon: '🍽️', color: '#8D6E63', isFavorite: false },
  { name: 'خانواده / اجتماعی', icon: '👨‍👩‍👧', color: '#FFCA28', isFavorite: false },
  { name: 'رفت‌وآمد', icon: '🚌', color: '#78909C', isFavorite: false },
  { name: 'کار', icon: '💼', color: '#6D4C41', isFavorite: false },
  { name: 'سایر', icon: '⚪', color: '#9E9E9E', isFavorite: false }
];

/**
 * اگر قبلاً seed نشده، ۱۴ فعالیت پیش‌فرض را می‌سازد.
 * خروجی: true اگر seed اجرا شد، false اگر قبلاً شده.
 */
export async function runSeedIfNeeded() {
  const seeded = await getSetting('seeded');
  if (seeded) return false;
  await bulkAddActivities(DEFAULT_ACTIVITIES);
  await setSetting('seeded', true);
  return true;
}

// ===== بخش ۴: backupService (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.