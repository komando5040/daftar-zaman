/* ============================================================
   فایل: src/config.js
   فهرست:
     بخش ۱: نسخه‌ها
     بخش ۲: کلیدهای تنظیمات و پیش‌فرض‌ها
   ============================================================ */

// ===== بخش ۱: نسخه‌ها =====
export const APP_VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;
export const DB_NAME = 'dafter-zaman';
export const SW_CACHE_NAME = 'dafter-zaman-v1';
export const ERROR_LOG_KEY = 'dafter-zaman-errors';
export const ERROR_LOG_MAX = 50;

// ===== بخش ۲: کلیدهای تنظیمات و پیش‌فرض‌ها =====
export const DEFAULT_SETTINGS = {
  theme: 'system',
  weekStartDay: 6,
  dayStartHour: 0,
  forgottenTimerHours: 4,
  lastBackupAt: null,
  seeded: false,
  storagePersisted: null
};

export const THEME_OPTIONS = [
  { value: 'system', label: 'سیستم' },
  { value: 'light', label: 'روشن' },
  { value: 'dark', label: 'تیره' }
];

export const WEEK_DAYS = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنجشنبه' },
  { value: 5, label: 'جمعه' }
];