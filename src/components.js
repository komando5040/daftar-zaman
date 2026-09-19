/* ============================================================
   فایل: src/components.js
   فهرست:
     بخش ۱: وابستگی‌ها
     بخش ۲: toast — نمایش
     بخش ۳: toast — بستن
     بخش ۴: sheet — وضعیت
     بخش ۵: sheet — باز کردن
     بخش ۶: sheet — بستن
     بخش ۷: sheet — سازگاری با کیبورد
     بخش ۸: activityButton (فاز ۱)
     بخش ۹: timeInput (فاز ۱)
   ============================================================ */

// ===== بخش ۱: وابستگی‌ها =====
// (در این فایل وابستگی خارجی لازم نیست)

// ===== بخش ۲: toast — نمایش =====
let toastEl = null;
let toastTimeout = null;

/**
 * نمایش یک توست پایین صفحه.
 * ورودی: پیام, {actionLabel, onAction, duration}.
 */
export function showToast(message, options = {}) {
  const { actionLabel, onAction, duration = 3000 } = options;
  closeToast();
  
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  el.appendChild(text);
  
  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      try { onAction(); } finally { closeToast(); }
    });
    el.appendChild(btn);
  }
  
  root.appendChild(el);
  toastEl = el;
  requestAnimationFrame(() => el.classList.add('toast-show'));
  
  if (duration > 0) {
    toastTimeout = setTimeout(closeToast, duration);
  }
}

// ===== بخش ۳: toast — بستن =====
/**
 * بستن توست فعلی.
 */
export function closeToast() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  if (toastEl && toastEl.parentNode) {
    toastEl.classList.remove('toast-show');
    const el = toastEl;
    toastEl = null;
    setTimeout(() => el.remove(), 200);
  }
}

// ===== بخش ۴: sheet — وضعیت =====
let overlayEl = null;
let sheetEl = null;
let prevOverflow = '';
let escHandler = null;

// ===== بخش ۵: sheet — باز کردن =====
/**
 * باز کردن یک Sheet با محتوای دلخواه.
 * ورودی: {title, content (HTMLElement), onClose}.
 * خروجی: {close}.
 */
export function openSheet({ title = '', content, onClose } = {}) {
  closeSheet(true);
  
  const root = document.getElementById('sheet-root');
  
  overlayEl = document.createElement('div');
  overlayEl.className = 'sheet-overlay';
  
  sheetEl = document.createElement('div');
  sheetEl.className = 'sheet';
  sheetEl._onClose = onClose;
  
  const header = document.createElement('div');
  header.className = 'sheet-header';
  
  const titleEl = document.createElement('h2');
  titleEl.className = 'sheet-title';
  titleEl.textContent = title;
  header.appendChild(titleEl);
  
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sheet-close';
  closeBtn.setAttribute('aria-label', 'بستن');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => closeSheet());
  header.appendChild(closeBtn);
  
  sheetEl.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'sheet-body';
  if (content) body.appendChild(content);
  sheetEl.appendChild(body);
  
  overlayEl.appendChild(sheetEl);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeSheet();
  });
  
  root.appendChild(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('sheet-show'));
  
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  
  escHandler = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', escHandler);
  
  installViewportHandler();
  
  return { close: () => closeSheet() };
}

// ===== بخش ۶: sheet — بستن =====
/**
 * بستن Sheet فعلی.
 */
export function closeSheet(silent = false) {
  if (!overlayEl) return;
  const overlay = overlayEl;
  const cb = sheetEl && sheetEl._onClose;
  
  overlay.classList.remove('sheet-show');
  overlayEl = null;
  sheetEl = null;
  document.body.style.overflow = prevOverflow || '';
  prevOverflow = '';
  
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
  
  setTimeout(() => overlay.remove(), 200);
  if (!silent && typeof cb === 'function') cb();
}

// ===== بخش ۷: sheet — سازگاری با کیبورد =====
function installViewportHandler() {
  if (!window.visualViewport) return;
  const vv = window.visualViewport;
  const handler = () => {
    if (!overlayEl) {
      vv.removeEventListener('resize', handler);
      return;
    }
    overlayEl.style.setProperty('--vvh', vv.height + 'px');
    overlayEl.style.setProperty('--vvt', vv.offsetTop + 'px');
  };
  vv.addEventListener('resize', handler);
  vv.addEventListener('scroll', handler);
  handler();
}

// ===== بخش ۸: activityButton (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.

// ===== بخش ۹: timeInput (فاز ۱) =====
// این بخش در فاز ۱ پیاده‌سازی می‌شود.