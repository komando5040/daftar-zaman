/* ============================================================
   فایل: src/pages.js
   فهرست:
     بخش ۱: وابستگی‌ها
     بخش ۲: صفحه خانه
     بخش ۳: صفحه تاریخچه
     بخش ۴: صفحه فعالیت‌ها
     بخش ۵: صفحه تنظیمات
     بخش ۶: صفحه Developer
   ============================================================ */

// ===== بخش ۱: وابستگی‌ها =====
import { APP_VERSION, THEME_OPTIONS, WEEK_DAYS } from './config.js';
import { getAllSettings, setSetting, getAllActivities, countActivities, countRecords, countActiveRecords } from './db.js';
import { formatJalaliDate, runTimeTests, runJalaliTests } from './core.js';
import { getErrors, clearErrors } from './services.js';
import { showToast } from './components.js';
import { toPersianDigits } from './format.js';

// ===== بخش ۲: صفحه خانه =====
/**
 * رندر صفحه خانه (فاز ۰).
 */
export function renderHome(container) {
  const today = new Date();
  container.innerHTML = `
    <header class="page-header">
      <div class="page-title">خانه</div>
      <div class="page-subtitle">${formatJalaliDate(today)}</div>
    </header>
    <section class="card">
      <p class="muted">این صفحه در فاز ۱ فعال می‌شود: کارت فعالیت جاری، شبکه فعالیت‌های موردعلاقه، نوار خلاصه امروز.</p>
    </section>
  `;
}

// ===== بخش ۳: صفحه تاریخچه =====
/**
 * رندر صفحه امروز/تاریخچه (فاز ۰).
 */
export function renderHistory(container) {
  container.innerHTML = `
    <header class="page-header">
      <div class="page-title">امروز</div>
      <div class="page-subtitle">${formatJalaliDate(new Date())}</div>
    </header>
    <section class="card">
      <p class="muted">این صفحه در فاز ۱ فعال می‌شود: فهرست رکوردهای روز، ردیف‌های ثبت‌نشده، دکمه ثبت دستی.</p>
    </section>
  `;
}

// ===== بخش ۴: صفحه فعالیت‌ها =====
/**
 * رندر صفحه فعالیت‌ها (فاز ۰).
 */
export async function renderActivities(container) {
  let count = 0;
  try {
    const list = await getAllActivities();
    count = list.length;
  } catch (_) {}

  container.innerHTML = `
    <header class="page-header">
      <div class="page-title">فعالیت‌ها</div>
      <div class="page-subtitle">${toPersianDigits(count)} فعالیت ثبت شده</div>
    </header>
    <section class="card">
      <p class="muted">این صفحه در فاز ۱ فعال می‌شود: افزودن/ویرایش فعالیت، رنگ، آیکون، علاقه‌مندی، آرشیو و ترتیب.</p>
    </section>
  `;
}

// ===== بخش ۵: صفحه تنظیمات =====
let versionClickCount = 0;
let versionClickTimer = null;

/**
 * رندر صفحه تنظیمات.
 */
export async function renderSettings(container) {
  const s = await getAllSettings();
  container.innerHTML = `
    <header class="page-header">
      <div class="page-title">تنظیمات</div>
    </header>

    <section class="card">
      <h3 class="card-title">نمایش</h3>
      <label class="row">
        <span>تم</span>
        <select id="set-theme" class="select">
          ${THEME_OPTIONS.map((o) =>
            `<option value="${o.value}" ${s.theme === o.value ? 'selected' : ''}>${o.label}</option>`
          ).join('')}
        </select>
      </label>
      <label class="row">
        <span>شروع هفته</span>
        <select id="set-week" class="select">
          ${WEEK_DAYS.map((d) =>
            `<option value="${d.value}" ${s.weekStartDay === d.value ? 'selected' : ''}>${d.label}</option>`
          ).join('')}
        </select>
      </label>
      <label class="row">
        <span>ساعت شروع روز</span>
        <input id="set-day-start" type="number" min="0" max="23" value="${s.dayStartHour}" class="input num" />
      </label>
      <label class="row">
        <span>آستانه تایمر فراموش‌شده (ساعت)</span>
        <input id="set-forgotten" type="number" min="1" max="24" value="${s.forgottenTimerHours}" class="input num" />
      </label>
    </section>

    <section class="card">
      <h3 class="card-title">داده</h3>
      <p class="muted">پشتیبان‌گیری و بازیابی در فاز ۱ فعال می‌شود.</p>
      <div class="row">
        <span>وضعیت ذخیره‌سازی پایدار</span>
        <span id="set-persist" class="badge">…</span>
      </div>
      <button id="btn-persist" type="button" class="btn">درخواست ذخیره‌سازی پایدار</button>
    </section>

    <section class="card">
      <h3 class="card-title">درباره</h3>
      <div class="row">
        <span>نسخه اپ</span>
        <span id="app-version" class="badge num">${toPersianDigits(APP_VERSION)}</span>
      </div>
      <button id="btn-check-update" type="button" class="btn">بررسی به‌روزرسانی</button>
    </section>
  `;

  container.querySelector('#set-theme').addEventListener('change', async (e) => {
    await setSetting('theme', e.target.value);
    applyTheme(e.target.value);
  });
  container.querySelector('#set-week').addEventListener('change', async (e) => {
    await setSetting('weekStartDay', Number(e.target.value));
  });
  container.querySelector('#set-day-start').addEventListener('change', async (e) => {
    const v = Math.max(0, Math.min(23, Number(e.target.value) || 0));
    await setSetting('dayStartHour', v);
  });
  container.querySelector('#set-forgotten').addEventListener('change', async (e) => {
    const v = Math.max(1, Math.min(24, Number(e.target.value) || 4));
    await setSetting('forgottenTimerHours', v);
  });
  container.querySelector('#btn-persist').addEventListener('click', requestPersist);
  container.querySelector('#btn-check-update').addEventListener('click', checkForUpdate);

  const vEl = container.querySelector('#app-version');
  vEl.addEventListener('click', () => {
    versionClickCount++;
    clearTimeout(versionClickTimer);
    versionClickTimer = setTimeout(() => { versionClickCount = 0; }, 1500);
    if (versionClickCount >= 7) {
      versionClickCount = 0;
      window.location.hash = '#/dev';
    }
  });

  await refreshPersistStatus(container);
}

function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themeSetting = theme;
}

async function requestPersist() {
  try {
    if (!navigator.storage || !navigator.storage.persist) {
      showToast('مرورگر از ذخیره‌سازی پایدار پشتیبانی نمی‌کند.');
      return;
    }
    const ok = await navigator.storage.persist();
    await setSetting('storagePersisted', ok);
    showToast(ok ? 'ذخیره‌سازی پایدار فعال شد.' : 'مرورگر درخواست را نپذیرفت.');
    const c = document.getElementById('app');
    await refreshPersistStatus(c);
  } catch (e) {
    showToast('خطا در درخواست ذخیره‌سازی پایدار.');
  }
}

async function refreshPersistStatus(container) {
  const el = container.querySelector('#set-persist');
  if (!el) return;
  try {
    if (!navigator.storage || !navigator.storage.persisted) {
      el.textContent = 'نامعلوم';
      return;
    }
    const persisted = await navigator.storage.persisted();
    el.textContent = persisted ? 'فعال' : 'غیرفعال';
  } catch (_) {
    el.textContent = 'نامعلوم';
  }
}

async function checkForUpdate() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { showToast('سرویس‌ورکر ثبت نشده.'); return; }
    await reg.update();
    showToast('بررسی به‌روزرسانی انجام شد.');
  } catch (_) {
    showToast('خطا در بررسی به‌روزرسانی.');
  }
}

// ===== بخش ۶: صفحه Developer =====
/**
 * رندر صفحه Developer.
 */
export async function renderDev(container) {
  const [activities, records, actives] = await Promise.all([
    countActivities().catch(() => 0),
    countRecords().catch(() => 0),
    countActiveRecords().catch(() => 0)
  ]);

  container.innerHTML = `
    <header class="page-header">
      <div class="page-title">Developer</div>
    </header>

    <section class="card">
      <h3 class="card-title">آمار</h3>
      <div class="row"><span>فعالیت‌ها</span><span class="badge num">${toPersianDigits(activities)}</span></div>
      <div class="row"><span>رکوردها</span><span class="badge num">${toPersianDigits(records)}</span></div>
      <div class="row"><span>در حال اجرا</span><span class="badge num">${toPersianDigits(actives)}</span></div>
    </section>

    <section class="card">
      <h3 class="card-title">تست‌های خودکار</h3>
      <button id="dev-run-tests" type="button" class="btn">اجرای تست‌ها</button>
      <div id="dev-test-results" class="test-results"></div>
    </section>

    <section class="card">
      <h3 class="card-title">لاگ خطاها</h3>
      <div id="dev-log" class="log-box"></div>
      <div class="row-actions">
        <button id="dev-copy-log" type="button" class="btn">کپی لاگ</button>
        <button id="dev-clear-log" type="button" class="btn btn-danger">پاک‌کردن لاگ</button>
      </div>
    </section>

    <section class="card">
      <h3 class="card-title">ابزارها</h3>
      <button id="dev-clear-sw" type="button" class="btn">پاک‌کردن کش SW</button>
    </section>
  `;

  container.querySelector('#dev-run-tests').addEventListener('click', runAllTests);
  container.querySelector('#dev-copy-log').addEventListener('click', copyLog);
  container.querySelector('#dev-clear-log').addEventListener('click', () => {
    clearErrors();
    refreshLog(container);
    showToast('لاگ پاک شد.');
  });
  container.querySelector('#dev-clear-sw').addEventListener('click', clearSW);

  refreshLog(container);
}

function runAllTests() {
  const results = [
    ...runTimeTests().map((r) => ({ ...r, group: 'time' })),
    ...runJalaliTests().map((r) => ({ ...r, group: 'jalali' }))
  ];
  const box = document.querySelector('#dev-test-results');
  if (!box) return;
  box.innerHTML = results.map((r) => `
    <div class="test-row ${r.pass ? 'pass' : 'fail'}">
      <span class="test-icon">${r.pass ? '✅' : '❌'}</span>
      <span class="test-name">${r.name}</span>
      ${r.detail && !r.pass ? `<span class="test-detail">${r.detail}</span>` : ''}
    </div>
  `).join('');
  const passCount = results.filter((r) => r.pass).length;
  showToast(`${toPersianDigits(passCount)} از ${toPersianDigits(results.length)} تست موفق.`);
}

function refreshLog(container) {
  const box = container.querySelector('#dev-log');
  if (!box) return;
  const list = getErrors();
  if (list.length === 0) {
    box.textContent = 'لاگ خالی است.';
    return;
  }
  box.innerHTML = list.slice().reverse().map((e) => {
    const d = new Date(e.at);
    const t = toPersianDigits(
      `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
    );
    return `<div class="log-row"><span class="log-time">${t}</span><span class="log-msg">${escapeHtml(e.message)}</span></div>`;
  }).join('');
}

async function copyLog() {
  const list = getErrors();
  const text = JSON.stringify(list, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast('لاگ کپی شد.');
  } catch (_) {
    showToast('کپی نشد. دستی انتخاب کن.');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function clearSW() {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    showToast('کش SW پاک شد. بارگذاری مجدد…');
    setTimeout(() => location.reload(), 800);
  } catch (_) {
    showToast('خطا در پاک‌کردن کش.');
  }
}