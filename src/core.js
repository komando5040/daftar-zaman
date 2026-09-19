/* ============================================================
   فایل: src/core.js
   فهرست:
     بخش ۱: time — ثابت‌ها و توابع کمکی
     بخش ۲: time — مرز روز
     بخش ۳: time — مدت رکورد
     بخش ۴: time — اجتماع بازه‌ها
     بخش ۵: time — splitByDay
     بخش ۶: time — تست‌های خودکار
     بخش ۷: jalali — محاسبات پایه
     بخش ۸: jalali — تبدیل میلادی ↔ شمسی
     بخش ۹: jalali — نام ماه/روز و قالب‌بندی
     بخش ۱۰: jalali — تست‌های خودکار
     بخش ۱۱: timerEngine (فاز ۱)
     بخش ۱۲: undo (فاز ۱)
     بخش ۱۳: analytics (فاز ۱)
   ============================================================ */

// ===== بخش ۱: time — ثابت‌ها و توابع کمکی =====
export const MS_MIN = 60_000;
export const MS_HOUR = 3_600_000;
export const MS_DAY = 86_400_000;

// ===== بخش ۲: time — مرز روز =====
/**
 * شروع «روز آماری» شامل timestamp.
 * ورودی: timestamp (ms), dayStartHour (0-23), tzOffset (دقیقه شرق UTC یا null برای محلی).
 * خروجی: timestamp شروع روز.
 */
export function getDayStart(timestamp, dayStartHour = 0, tzOffset = null) {
  if (tzOffset === null || tzOffset === undefined) {
    const d = new Date(timestamp);
    d.setHours(dayStartHour, 0, 0, 0);
    if (d.getTime() > timestamp) d.setDate(d.getDate() - 1);
    return d.getTime();
  }
  const offsetMs = tzOffset * MS_MIN;
  const shifted = timestamp + offsetMs;
  const d = new Date(shifted);
  d.setUTCHours(dayStartHour, 0, 0, 0);
  if (d.getTime() > shifted) d.setUTCDate(d.getUTCDate() - 1);
  return d.getTime() - offsetMs;
}

/**
 * پایان «روز آماری» شامل timestamp (شروع روز بعد).
 */
export function getDayEnd(timestamp, dayStartHour = 0, tzOffset = null) {
  const start = getDayStart(timestamp, dayStartHour, tzOffset);
  if (tzOffset === null || tzOffset === undefined) {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    d.setHours(dayStartHour, 0, 0, 0);
    return d.getTime();
  }
  const offsetMs = tzOffset * MS_MIN;
  const d = new Date(start + offsetMs);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(dayStartHour, 0, 0, 0);
  return d.getTime() - offsetMs;
}

/**
 * طول «روز آماری» شامل timestamp (میلی‌ثانیه).
 */
export function getDayLength(timestamp, dayStartHour = 0, tzOffset = null) {
  return getDayEnd(timestamp, dayStartHour, tzOffset)
       - getDayStart(timestamp, dayStartHour, tzOffset);
}

// ===== بخش ۳: time — مدت رکورد =====
/**
 * محاسبه مدت خالص یک رکورد با کسر pauseها.
 */
export function calcDuration(record, now = Date.now()) {
  const end = record.endTime ?? now;
  let total = end - record.startTime;
  const pauses = record.pauses ?? [];
  for (const p of pauses) {
    const pEnd = p.end ?? end;
    const d = pEnd - p.start;
    if (d > 0) total -= d;
  }
  return Math.max(0, total);
}

/**
 * کم‌کردن pauseها از یک بازه.
 */
export function subtractPauses(interval, pauses) {
  if (!pauses || pauses.length === 0) return [interval];
  const sorted = [...pauses].sort((a, b) => a.start - b.start);
  const result = [];
  let cursor = interval.start;
  for (const p of sorted) {
    const pEnd = p.end ?? interval.end;
    if (p.start > cursor) {
      result.push({ start: cursor, end: Math.min(p.start, interval.end) });
    }
    cursor = Math.max(cursor, pEnd);
    if (cursor >= interval.end) break;
  }
  if (cursor < interval.end) {
    result.push({ start: cursor, end: interval.end });
  }
  return result.filter((i) => i.end > i.start);
}

// ===== بخش ۴: time — اجتماع بازه‌ها =====
/**
 * اجتماع بازه‌های هم‌پوشان/چسبیده.
 */
export function unionIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/**
 * مجموع طول اجتماع بازه‌ها.
 */
export function totalDuration(intervals) {
  return unionIntervals(intervals).reduce((s, i) => s + (i.end - i.start), 0);
}

/**
 * گرفتن بازه‌های فعال یک رکورد (با کسر pause).
 */
export function recordActiveIntervals(record, now = Date.now()) {
  const end = record.endTime ?? now;
  if (end <= record.startTime) return [];
  return subtractPauses({ start: record.startTime, end }, record.pauses ?? []);
}

// ===== بخش ۵: time — splitByDay =====
/**
 * تقسیم بازه‌های فعال یک رکورد به بازه‌های هر «روز آماری».
 */
export function splitByDay(record, dayStartHour = 0, now = Date.now()) {
  const tzOffset = record.tzOffset ?? null;
  const segments = [];
  const active = recordActiveIntervals(record, now);
  for (const interval of active) {
    let cursor = interval.start;
    while (cursor < interval.end) {
      const dayStart = getDayStart(cursor, dayStartHour, tzOffset);
      const dayEnd = getDayEnd(cursor, dayStartHour, tzOffset);
      const segEnd = Math.min(interval.end, dayEnd);
      if (segEnd > cursor) {
        segments.push({
          dayStart,
          start: cursor,
          end: segEnd,
          duration: segEnd - cursor
        });
      }
      cursor = segEnd;
    }
  }
  return segments;
}

// ===== بخش ۶: time — تست‌های خودکار =====
/**
 * اجرای تست‌های خودکار time. خروجی: [{name, pass, detail}].
 */
export function runTimeTests() {
  const results = [];
  const push = (name, pass, detail = '') => results.push({ name, pass, detail });

  {
    const t = new Date(2026, 8, 19, 10, 30, 0).getTime();
    const start = getDayStart(t, 0);
    const expected = new Date(2026, 8, 19, 0, 0, 0).getTime();
    push('getDayStart با dayStartHour=0', start === expected, String(start - expected));
  }
  {
    const t = new Date(2026, 8, 19, 3, 0, 0).getTime();
    const start = getDayStart(t, 6);
    const expected = new Date(2026, 8, 18, 6, 0, 0).getTime();
    push('getDayStart با dayStartHour=6 در ساعت ۳ بامداد', start === expected, String(start - expected));
  }
  {
    const t = new Date(2026, 8, 19, 10, 0, 0).getTime();
    const start = getDayStart(t, 6);
    const expected = new Date(2026, 8, 19, 6, 0, 0).getTime();
    push('getDayStart با dayStartHour=6 در ساعت ۱۰ صبح', start === expected, String(start - expected));
  }
  {
    const r = { startTime: 1000, endTime: 5000, pauses: [] };
    push('calcDuration ساده', calcDuration(r) === 4000, String(calcDuration(r)));
  }
  {
    const r = { startTime: 0, endTime: 10000, pauses: [{ start: 2000, end: 4000 }] };
    push('calcDuration با pause', calcDuration(r) === 8000, String(calcDuration(r)));
  }
  {
    const r = { startTime: 0, endTime: 10000, pauses: [{ start: 8000, end: null }] };
    push('calcDuration با pause باز', calcDuration(r) === 8000, String(calcDuration(r)));
  }
  {
    const intervals = [
      { start: 9 * 3600_000, end: 10 * 3600_000 },
      { start: 9 * 3600_000, end: 10 * 3600_000 },
      { start: 9.5 * 3600_000, end: 11 * 3600_000 }
    ];
    push('اجتماع بازه‌ها (مثال T9)', totalDuration(intervals) === 2 * 3600_000, String(totalDuration(intervals)));
  }
  {
    const start = new Date(2026, 8, 18, 23, 0, 0).getTime();
    const end = new Date(2026, 8, 19, 7, 0, 0).getTime();
    const r = { startTime: start, endTime: end, pauses: [], tzOffset: null };
    const segs = splitByDay(r, 0);
    const ok = segs.length === 2
      && Math.abs(segs[0].duration - 1 * 3600_000) < 1000
      && Math.abs(segs[1].duration - 7 * 3600_000) < 1000;
    push('splitByDay رکورد عبوری از نیمه‌شب', ok, JSON.stringify(segs.map((s) => s.duration)));
  }
  {
    const start = new Date(2026, 8, 19, 10, 0, 0).getTime();
    const end = new Date(2026, 8, 19, 12, 0, 0).getTime();
    const r = {
      startTime: start, endTime: end,
      pauses: [{ start: start + 3600_000, end: start + 2 * 3600_000 }],
      tzOffset: null
    };
    const total = splitByDay(r, 0).reduce((s, x) => s + x.duration, 0);
    push('splitByDay با pause (۱ ساعت خالص)', total === 3600_000, String(total));
  }

  return results;
}

// ===== بخش ۷: jalali — محاسبات پایه =====
function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
];

function jalCal(jy) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jm, jump = 0, leap, leapG, march, n, i;
  if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error('سال شمسی نامعتبر: ' + jy);
  for (i = 1; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
        + div(153 * mod(gm + 9, 12) + 2, 5)
        + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn) {
  let gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let jd, jm, k;
  k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

// ===== بخش ۸: jalali — تبدیل میلادی ↔ شمسی =====
/**
 * تبدیل تاریخ شمسی به میلادی.
 */
export function jalaliToGregorian(jy, jm, jd) {
  const g = d2g(j2d(jy, jm, jd));
  return { gy: g.gy, gm: g.gm, gd: g.gd };
}

/**
 * تبدیل تاریخ میلادی به شمسی.
 */
export function gregorianToJalali(gy, gm, gd) {
  return d2j(g2d(gy, gm, gd));
}

/**
 * تبدیل Date میلادی به شمسی.
 */
export function dateToJalali(date) {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * ساخت Date میلادی از تاریخ شمسی (ساعت محلی).
 */
export function jalaliToDate(jy, jm, jd, hh = 0, mm = 0, ss = 0) {
  const g = jalaliToGregorian(jy, jm, jd);
  return new Date(g.gy, g.gm - 1, g.gd, hh, mm, ss, 0);
}

// ===== بخش ۹: jalali — نام ماه/روز و قالب‌بندی =====
export const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export const JALALI_WEEKDAYS = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'
];

/**
 * قالب‌بندی تاریخ شمسی به‌صورت «۲۸ شهریور ۱۴۰۵».
 */
export function formatJalaliDate(date) {
  const j = dateToJalali(date);
  return `${j.jd} ${JALALI_MONTHS[j.jm - 1]} ${j.jy}`;
}

/**
 * بررسی کبیسه بودن سال شمسی.
 * توجه: در jalaali-js، مقدار leap صفر یعنی سال کبیسه.
 */
export function isJalaliLeap(jy) {
  return jalCal(jy).leap === 0;
}

// ===== بخش ۱۰: jalali — تست‌های خودکار =====
/**
 * اجرای تست‌های خودکار jalali. خروجی: [{name, pass, detail}].
 */
export function runJalaliTests() {
  const results = [];
  const push = (name, pass, detail = '') => results.push({ name, pass, detail });

  {
    const g = jalaliToGregorian(1405, 1, 1);
    push('۱ فروردین ۱۴۰۵ → ۲۱ مارس ۲۰۲۶',
      g.gy === 2026 && g.gm === 3 && g.gd === 21,
      JSON.stringify(g));
  }
  {
    const g = jalaliToGregorian(1405, 7, 1);
    push('۱ مهر ۱۴۰۵ → ۲۳ سپتامبر ۲۰۲۶',
      g.gy === 2026 && g.gm === 9 && g.gd === 23,
      JSON.stringify(g));
  }
  {
    push('۱۴۰۳ کبیسه است', isJalaliLeap(1403) === true, String(isJalaliLeap(1403)));
  }
  {
    const g = jalaliToGregorian(1403, 12, 30);
    const j = gregorianToJalali(g.gy, g.gm, g.gd);
    push('رفت‌و‌برگشت ۳۰ اسفند ۱۴۰۳',
      j.jy === 1403 && j.jm === 12 && j.jd === 30,
      JSON.stringify({ g, j }));
  }
  {
    const j = gregorianToJalali(2026, 9, 19);
    push('۱۹ سپتامبر ۲۰۲۶ → ۲۸ شهریور ۱۴۰۵',
      j.jy === 1405 && j.jm === 6 && j.jd === 28,
      JSON.stringify(j));
  }
  {
    push('۱۴۰۴ کبیسه نیست', isJalaliLeap(1404) === false, String(isJalaliLeap(1404)));
  }

  return results;
}

// ===== بخش ۱۱: timerEngine (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.

// ===== بخش ۱۲: undo (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.

// ===== بخش ۱۳: analytics (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.
