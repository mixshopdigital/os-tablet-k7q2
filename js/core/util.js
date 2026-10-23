/* ODONTO SMART — utilidades compartidas (formato, fechas, teléfonos, HTML seguro).
   Todo el código se expone bajo el espacio de nombres global OS para funcionar
   igual desde file://, desde un servidor local o empaquetado en Electron. */
window.OS = window.OS || {};
OS.views = OS.views || {}; // cada módulo registra aquí su pantalla

OS.util = (() => {
  const pad = (n) => String(n).padStart(2, '0');

  /** Escapa texto para insertarlo en HTML. */
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Identificador corto, único y ordenable. */
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  // ---------- Fechas (internamente ISO YYYY-MM-DD, en pantalla DD/MM/YYYY) ----------
  const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => toISO(new Date());
  const parseISO = (s) => { if (!s) return null; const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (iso, n) => { const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const addMonths = (iso, n) => { const d = parseISO(iso); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return toISO(d); };
  const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
  const fmtDate = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
  const fmtDateTime = (ts) => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const longDate = (iso) => { const d = parseISO(iso); return `${DAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
  const monthLabel = (iso) => { const d = parseISO(iso); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
  const startOfWeek = (iso) => { const d = parseISO(iso); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return toISO(d); };
  const age = (birth) => { if (!birth) return null; const b = parseISO(birth); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
  const timeToMin = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m; };
  const minToTime = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const monthsAgo = (iso) => { if (!iso) return null; return Math.floor(daysBetween(iso, today()) / 30); };
  const relTime = (iso) => {
    if (!iso) return '—';
    const d = daysBetween(iso, today());
    if (d === 0) return 'hoy'; if (d === 1) return 'ayer'; if (d === -1) return 'mañana';
    if (d > 0 && d < 30) return `hace ${d} días`; if (d < 0 && d > -30) return `en ${-d} días`;
    const m = Math.round(Math.abs(d) / 30); return d > 0 ? `hace ${m} ${m === 1 ? 'mes' : 'meses'}` : `en ${m} ${m === 1 ? 'mes' : 'meses'}`;
  };

  // ---------- Moneda ----------
  const money = (n, prefix) => {
    const p = prefix ?? (OS.store?.data?.clinic?.currencyPrefix || 'G.');
    const v = Math.round(Number(n) || 0);
    return `${v < 0 ? '-' : ''}${p} ${Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };
  /** Convierte "1.250.000" o "1250000" a número. */
  const parseMoney = (s) => Number(String(s ?? '').replace(/[^\d-]/g, '')) || 0;
  const thousands = (n) => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // ---------- Teléfonos / WhatsApp (Paraguay +595 por defecto) ----------
  const normalizePhone = (raw, country = '595') => {
    let d = String(raw || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.startsWith('00')) d = d.slice(2);
    if (d.startsWith(country)) return d;
    if (d.startsWith('0')) return country + d.slice(1);
    if (d.length <= 9) return country + d;
    return d;
  };
  const prettyPhone = (raw) => {
    const n = normalizePhone(raw);
    if (!n) return '—';
    if (n.startsWith('595') && n.length === 12) return `+595 ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
    return '+' + n;
  };

  // ---------- Texto ----------
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const fillTemplate = (tpl, vars) => String(tpl || '').replace(/\[([^\]]+)\]/g, (m, k) => {
    const key = norm(k).trim();
    const hit = Object.keys(vars).find((v) => norm(v) === key);
    return hit !== undefined ? vars[hit] : m;
  });
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const sum = (arr, fn = (x) => x) => arr.reduce((a, x) => a + (Number(fn(x)) || 0), 0);
  const groupBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {});
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /** Lee un formulario como objeto plano (checkbox → boolean). */
  const formData = (form) => {
    const o = {};
    form.querySelectorAll('[name]').forEach((el) => {
      if (el.type === 'checkbox') { if (el.dataset.multi) { (o[el.name] = o[el.name] || []); if (el.checked) o[el.name].push(el.value); } else o[el.name] = el.checked; }
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value.trim();
    });
    return o;
  };

  /** Archivo → dataURL. */
  const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file); });
  const readText = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(file); });

  /** Rasteriza un SVG/imagen a PNG dataURL (jsPDF no dibuja SVG). */
  const toPng = (dataUrl, maxSide = 600) => new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
      const w = Math.max(1, Math.round((img.width || maxSide) * scale)); const h = Math.max(1, Math.round((img.height || maxSide) * scale));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      try { res(c.toDataURL('image/png')); } catch { res(null); }
    };
    img.onerror = () => res(null);
    img.src = dataUrl;
  });

  const fmtSize = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  return { esc, uid, pad, toISO, today, parseISO, addDays, addMonths, daysBetween, fmtDate, fmtDateTime, nowTime, longDate, monthLabel, startOfWeek, age, timeToMin, minToTime, monthsAgo, relTime, MONTHS, DAYS, money, parseMoney, thousands, normalizePhone, prettyPhone, initials, norm, fillTemplate, plural, sum, groupBy, debounce, formData, readFile, readText, toPng, fmtSize };
})();
