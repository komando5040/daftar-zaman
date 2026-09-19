/* ============================================================
   فایل: src/format.js
   فهرست:
     بخش ۱: ارقام فارسی
     بخش ۲: فرمت مدت
     بخش ۳: فرمت ساعت
     بخش ۴: نرمال‌سازی ورودی
   ============================================================ */

// ===== بخش ۱: ارقام فارسی =====
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * تبدیل ارقام لاتین به فارسی در یک رشته.
 * ورودی: رشته یا عدد. خروجی: رشته با ارقام فارسی.
 */
export function toPersianDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/**
 * تبدیل ارقام فارسی/عربی به لاتین.
 * ورودی: رشته. خروجی: رشته با ارقام لاتین.
 */
export function toLatinDigits(input) {
  return String(input)
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

// ===== بخش ۲: فرمت مدت =====
/**
 * فرمت مدت به‌صورت «۲ ساعت و ۱۰ دقیقه».
 * ورودی: میلی‌ثانیه. خروجی: رشته فارسی.
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '۰ دقیقه';
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const parts = [];
  if (hours > 0) parts.push(`${hours} ساعت`);
  if (minutes > 0) parts.push(`${minutes} دقیقه`);
  if (parts.length === 0) parts.push('کمتر از ۱ دقیقه');
  return toPersianDigits(parts.join(' و '));
}

/**
 * فرمت کوتاه مدت به‌صورت «۲:۱۰».
 * ورودی: میلی‌ثانیه. خروجی: رشته فارسی.
 */
export function formatDurationShort(ms) {
  if (!ms || ms < 0) return '۰:۰۰';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return toPersianDigits(`${h}:${String(m).padStart(2, '0')}`);
}

// ===== بخش ۳: فرمت ساعت =====
/**
 * فرمت ساعت به‌صورت «۱۴:۱۰» با ارقام فارسی.
 * ورودی: timestamp (ms). خروجی: رشته.
 */
export function formatClock(timestamp) {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${h}:${m}`);
}

/**
 * فرمت تاریخ و ساعت به‌صورت «۲۸/۶، ۱۴:۱۰».
 * ورودی: timestamp (ms). خروجی: رشته.
 */
export function formatDateTime(timestamp) {
  const d = new Date(timestamp);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return toPersianDigits(`${day}/${month}، ${h}:${m}`);
}

// ===== بخش ۴: نرمال‌سازی ورودی =====
/**
 * نرمال‌سازی رشته ساعت ورودی («۱۴:۱۰» یا «14:10» → «14:10»).
 * ورودی: رشته. خروجی: رشته لاتین با دونقطه.
 */
export function normalizeTimeInput(input) {
  return toLatinDigits(String(input)).replace(/[：]/g, ':').trim();
}