/* ============================================================
   فایل: src/db.js
   فهرست:
     بخش ۱: وابستگی‌ها
     بخش ۲: تعریف دیتابیس و schema نسخه ۱
     بخش ۳: Settings Repository
     بخش ۴: Activity Repository
     بخش ۵: Record Repository
   ============================================================ */

// ===== بخش ۱: وابستگی‌ها =====
import Dexie from '../vendor/dexie.min.js';
import { DB_NAME, DEFAULT_SETTINGS } from './config.js';

// ===== بخش ۲: تعریف دیتابیس و schema نسخه ۱ =====
export const db = new Dexie(DB_NAME);

db.version(1).stores({
  // نکته: IndexedDB روی null و boolean نمایه نمی‌سازد.
  // isActive عددی (0/1) و deletedAt/isArchived با فیلتر JS.
  activities: 'id, parentId, sortOrder',
  records: 'id, activityId, startTime, endTime, isActive, [activityId+startTime]',
  settings: 'key',
  goals: 'id, activityId',
  usageStats: 'id, packageName, startTime'
});

/**
 * باز کردن دیتابیس Dexie.
 */
export async function openDatabase() {
  if (db.isOpen()) return db;
  await db.open();
  return db;
}

// ===== بخش ۳: Settings Repository =====
/**
 * خواندن یک تنظیم. اگر نبود، پیش‌فرض برمی‌گرداند.
 */
export async function getSetting(key) {
  const row = await db.settings.get(key);
  if (row === undefined) return DEFAULT_SETTINGS[key] ?? null;
  return row.value;
}

/**
 * نوشتن یک تنظیم.
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value });
  return value;
}

/**
 * خواندن همه تنظیمات با اعمال پیش‌فرض‌ها.
 */
export async function getAllSettings() {
  const rows = await db.settings.toArray();
  const map = { ...DEFAULT_SETTINGS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

// ===== بخش ۴: Activity Repository =====
/**
 * همه فعالیت‌های غیرحذف‌شده (شامل آرشیو).
 */
export async function getAllActivities() {
  const rows = await db.activities.toArray();
  return rows.filter((a) => !a.deletedAt);
}

/**
 * فعالیت‌های موردعلاقه غیرآرشیو.
 */
export async function getFavoriteActivities() {
  const rows = await db.activities.toArray();
  return rows
    .filter((a) => !a.deletedAt && !a.isArchived && a.isFavorite)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/**
 * شمارش کل فعالیت‌های غیرحذف‌شده. برای Developer.
 */
export async function countActivities() {
  const rows = await db.activities.toArray();
  return rows.filter((a) => !a.deletedAt).length;
}

/**
 * افزودن یک فعالیت. id و زمان‌ها خودکار.
 */
export async function addActivity(input) {
  const now = Date.now();
  const activity = {
    id: input.id ?? crypto.randomUUID(),
    parentId: input.parentId ?? null,
    name: input.name,
    icon: input.icon ?? '⚪',
    color: input.color ?? '#9E9E9E',
    isFavorite: !!input.isFavorite,
    isArchived: false,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  await db.activities.add(activity);
  return activity;
}

/**
 * افزودن دسته‌ای فعالیت‌ها در یک تراکنش (برای seed).
 */
export async function bulkAddActivities(list) {
  const now = Date.now();
  const rows = list.map((item, idx) => ({
    id: crypto.randomUUID(),
    parentId: null,
    name: item.name,
    icon: item.icon,
    color: item.color,
    isFavorite: !!item.isFavorite,
    isArchived: false,
    sortOrder: idx,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }));
  await db.transaction('rw', db.activities, async () => {
    await db.activities.bulkAdd(rows);
  });
  return rows;
}

/**
 * به‌روزرسانی فیلدهای یک فعالیت.
 */
export async function updateActivity(id, patch) {
  await db.activities.update(id, { ...patch, updatedAt: Date.now() });
}

/**
 * حذف نرم فعالیت.
 */
export async function softDeleteActivity(id) {
  await db.activities.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

// ===== بخش ۵: Record Repository =====
/**
 * شمارش رکوردهای غیرحذف‌شده. برای صفحه Developer.
 */
export async function countRecords() {
  const rows = await db.records.toArray();
  return rows.filter((r) => !r.deletedAt).length;
}

/**
 * شمارش رکوردهای در حال اجرا. برای صفحه Developer.
 */
export async function countActiveRecords() {
  return db.records.where('isActive').equals(1).count();
}