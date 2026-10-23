/* ODONTO SMART — componentes de interfaz reutilizables:
   iconos, modales, confirmaciones, toasts, estados vacíos, badges y campos. */
OS.ui = (() => {
  const { esc } = OS.util;

  // ---------- Iconos (trazo 1.75, 24×24) ----------
  const P = {
    home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    users: 'M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M22 20v-1.5a4 4 0 0 0-3-3.8M16 4.2a3.5 3.5 0 0 1 0 6.6',
    calendar: 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 2v4M16 2v4',
    tooth: 'M12 5.5C10.3 4 8.6 3.5 7 3.5 4.5 3.5 3 5.6 3 8.4c0 2.4 1 3.7 1.6 5.7.7 2.3.9 6.4 2.7 6.4 1.6 0 1.6-4.6 2.4-6 .5-.8 1-1.1 2.3-1.1s1.8.3 2.3 1.1c.8 1.4.8 6 2.4 6 1.8 0 2-4.1 2.7-6.4.6-2 1.6-3.3 1.6-5.7 0-2.8-1.5-4.9-4-4.9-1.6 0-3.3.5-5 2z',
    clinical: 'M9 3h6v3H9zM7 4.5H5.5A1.5 1.5 0 0 0 4 6v14a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20V6a1.5 1.5 0 0 0-1.5-1.5H17M12 10v6M9 13h6',
    plan: 'M8 6h12M8 12h12M8 18h12M3.5 6h.01M3.5 12h.01M3.5 18h.01',
    quote: 'M6 2.5h9l4 4V21a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 21zM14.5 2.5V7h4.5M9 12h6M9 16h6M9 8h2',
    card: 'M2.5 6.5a2 2 0 0 1 2-2h15a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2zM2.5 10h19M6 15h4',
    box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
    flask: 'M9 3h6M10 3v6L4.6 18.2A1.8 1.8 0 0 0 6.2 21h11.6a1.8 1.8 0 0 0 1.6-2.8L14 9V3M7 15h10',
    folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    message: 'M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z',
    doctor: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21v-1.5A5.5 5.5 0 0 1 10.5 14h3a5.5 5.5 0 0 1 5.5 5.5V21M9 14.5v3M15 14.5v2.2a1.3 1.3 0 1 0 0 0',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20.5 20.5 16 16',
    bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
    plus: 'M12 5v14M5 12h14',
    phone: 'M21 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 4.2 2 2 0 0 1 3.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L7.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    whatsapp: 'M3.5 20.5 5 16a8.5 8.5 0 1 1 3.2 3.2zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.2-1.6-2-1-1 .9c-1-.5-2-1.5-2.5-2.5l.9-1-1-2z',
    file: 'M14 2.5H6.5a1.5 1.5 0 0 0-1.5 1.5v16a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V7.5zM14 2.5v5h5',
    print: 'M6 9V3h12v6M6 18H4.5A1.5 1.5 0 0 1 3 16.5v-5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H18M6 14h12v7H6z',
    download: 'M12 3v12M7 10l5 5 5-5M4 19h16',
    upload: 'M12 21V9M7 14l5-5 5 5M4 5h16',
    x: 'M18 6 6 18M6 6l12 12',
    check: 'M20 6 9 17l-5-5',
    chevron: 'M9 6l6 6-6 6',
    back: 'M15 6l-6 6 6 6',
    alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    money: 'M2.5 6h19v12h-19zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 12h.01M18 12h.01',
    refresh: 'M21 4v6h-6M3 20v-6h6M5.5 9a8 8 0 0 1 13.2-3L21 10M3 14l2.3 4a8 8 0 0 0 13.2-3',
    ai: 'M9.5 2.5 11 7l4.5 1.5L11 10l-1.5 4.5L8 10 3.5 8.5 8 7zM17.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z',
    image: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
    rx: 'M5 3h6a4 4 0 0 1 0 8H5zM5 11v10M10 11l9 10M19 13l-6 6',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    menu: 'M4 6h16M4 12h16M4 18h16',
    keyboard: 'M2 6h20v12H2zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
    camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    gift: 'M3 9h18v4H3zM12 9v12M5 13v8h14v-8M12 9C9.5 9 7.500 8 7.500 6S10 3 12 6c2-3 4.500-2 4.500 0S14.500 9 12 9z',
    zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
    trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    star: 'M12 2.500l2.900 5.900 6.500.9-4.700 4.600 1.100 6.500L12 17.300l-5.800 3.100 1.100-6.500L2.600 9.300l6.500-.9z',
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  };
  P.list = P.plan; P.stethoscope = P.clinical;
  const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${P[name] || P.spark}"/></svg>`;

  /** Isotipo: sonrisa + pieza dental + punto tecnológico. */
  const logoMark = (size = 34) => `<svg width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true" class="logo-mark"><rect x="1" y="1" width="38" height="38" rx="11" fill="var(--brand-deep)"/><path d="M20 10.6c-1.9-1.5-3.8-2-5.4-2-2.9 0-4.6 2.3-4.6 5.4 0 2.6 1.1 4 1.8 6.2.8 2.6 1 7 3 7 1.8 0 1.8-5 2.7-6.6.5-.9 1.1-1.2 2.5-1.2s2 .3 2.5 1.2c.9 1.6.9 6.6 2.7 6.6 2 0 2.2-4.4 3-7 .7-2.2 1.8-3.6 1.8-6.2 0-3.1-1.7-5.4-4.6-5.4-1.6 0-3.5.5-5.4 2z" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M14.6 14.8c1.6 1.9 3.4 2.8 5.4 2.8s3.8-.9 5.4-2.8" fill="none" stroke="var(--aqua)" stroke-width="2.2" stroke-linecap="round"/><circle cx="30.5" cy="9.5" r="2.4" fill="var(--aqua)"/></svg>`;

  // ---------- Toasts ----------
  function toast(text, type = 'ok', ms = 3400) {
    let host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); document.body.appendChild(host); }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `${icon(type === 'danger' ? 'alert' : type === 'warn' ? 'alert' : 'check')}<span>${esc(text)}</span>`;
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, ms);
  }

  // ---------- Modales ----------
  const stack = [];
  /**
   * Abre un modal. opts: { title, subtitle, body (html), size: 'sm'|'md'|'lg'|'xl', actions:[{label, kind, id, icon}], onOpen(el), guard (confirmar si hay cambios sin guardar) }
   * Devuelve { el, close }.
   */
  function modal(opts) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal modal-${opts.size || 'md'}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || '')}">
      <header class="modal-head"><div><h2>${esc(opts.title || '')}</h2>${opts.subtitle ? `<p>${opts.subtitle}</p>` : ''}</div>
        <button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></header>
      <div class="modal-body">${opts.body || ''}</div>
      ${opts.actions?.length ? `<footer class="modal-foot">${opts.actions.map((a) => `<button type="${a.submit ? 'submit' : 'button'}" class="btn ${a.kind ? 'btn-' + a.kind : ''}" ${a.id ? `id="${a.id}"` : ''} ${a.close ? 'data-close' : ''} ${a.form ? `form="${a.form}"` : ''}>${a.icon ? icon(a.icon) : ''}<span>${esc(a.label)}</span></button>`).join('')}</footer>` : ''}
    </div>`;
    document.body.appendChild(wrap);
    let dirty = false;
    wrap.addEventListener('input', () => { dirty = true; });
    const api = {
      el: wrap,
      markClean: () => { dirty = false; },
      close: (force) => {
        if (!force && opts.guard !== false && dirty && wrap.querySelector('form')) {
          confirm({ title: '¿Descartar cambios?', text: 'Hay datos que todavía no guardaste.', ok: 'Descartar', kind: 'danger' }).then((y) => { if (y) api.close(true); });
          return;
        }
        wrap.classList.add('out'); setTimeout(() => wrap.remove(), 180);
        const i = stack.indexOf(api); if (i >= 0) stack.splice(i, 1);
        opts.onClose?.();
      },
    };
    stack.push(api);
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) api.close();
      if (e.target.closest('[data-close]')) api.close();
    });
    requestAnimationFrame(() => {
      wrap.classList.add('in');
      const f = wrap.querySelector('[autofocus], .modal-body input:not([type=hidden]):not([type=file]), .modal-body select, .modal-body textarea');
      f?.focus();
    });
    opts.onOpen?.(wrap, api);
    return api;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) { e.preventDefault(); stack[stack.length - 1].close(); } });
  const closeAll = () => [...stack].reverse().forEach((m) => m.close(true));

  /** Confirmación elegante (los diálogos nativos no se usan). Resuelve true/false. */
  function confirm({ title, text, ok = 'Confirmar', cancel = 'Cancelar', kind = 'primary' }) {
    return new Promise((res) => {
      let answered = false;
      const m = modal({ title, size: 'sm', body: `<p class="confirm-text">${esc(text || '')}</p>`, guard: false,
        actions: [{ label: cancel, kind: 'ghost', id: 'c-no' }, { label: ok, kind, id: 'c-yes' }],
        onClose: () => { if (!answered) res(false); } });
      m.el.querySelector('#c-yes').onclick = () => { answered = true; m.close(true); res(true); };
      m.el.querySelector('#c-no').onclick = () => { answered = true; m.close(true); res(false); };
      m.el.querySelector('#c-yes').focus();
    });
  }

  // ---------- Piezas visuales ----------
  const AV_COLORS = ['#0E7C86', '#2F6FD0', '#7A5AE0', '#C2477A', '#1E9E6A', '#C98A0B', '#4A6B8A', '#0B4F5E'];
  const avatar = (name, photo, size = 36) => {
    const c = AV_COLORS[[...String(name)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV_COLORS.length];
    return photo ? `<img class="avatar" src="${photo}" alt="" style="width:${size}px;height:${size}px">`
      : `<span class="avatar" style="width:${size}px;height:${size}px;background:${c};font-size:${Math.round(size * 0.38)}px" aria-hidden="true">${esc(OS.util.initials(name))}</span>`;
  };

  /** Estados con forma + texto + color (nunca solo color). */
  const STATUS = {
    pendiente: ['warn', 'Pendiente', '●'], confirmada: ['info', 'Confirmada', '◆'], atendida: ['ok', 'Atendida', '✓'], cancelada: ['danger', 'Cancelada', '✕'], ausente: ['muted', 'No asistió', '○'],
    activo: ['ok', 'Activo', '●'], inactivo: ['muted', 'Inactivo', '○'], nuevo: ['info', 'Nuevo', '★'],
    borrador: ['muted', 'Borrador', '○'], enviado: ['info', 'Enviado', '➜'], aceptado: ['ok', 'Aceptado', '✓'], rechazado: ['danger', 'Rechazado', '✕'], vencido: ['danger', 'Vencido', '!'],
    pagada: ['ok', 'Pagada', '✓'], proxima: ['warn', 'Próxima', '●'], vencida: ['danger', 'Vencida', '!'], futura: ['muted', 'Programada', '○'],
    lab_enviado: ['warn', 'Enviado', '➜'], lab_proceso: ['info', 'En proceso', '◐'], lab_recibido: ['ok', 'Recibido', '✓'], lab_retrasado: ['danger', 'Retrasado', '!'],
    firmado: ['ok', 'Firmado', '✓'], sin_firmar: ['warn', 'Sin firmar', '●'], realizado: ['ok', 'Realizado', '✓'], por_realizar: ['warn', 'Por realizar', '●'],
  };
  const badge = (key, label) => { const s = STATUS[key] || ['muted', label || key, '●']; return `<span class="badge badge-${s[0]}"><i aria-hidden="true">${s[2]}</i>${esc(label || s[1])}</span>`; };

  const EMPTY_ART = `<svg viewBox="0 0 160 120" aria-hidden="true"><defs><linearGradient id="eg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--aqua)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs>
      <circle cx="80" cy="62" r="50" fill="color-mix(in srgb, var(--primary) 10%, transparent)"/><circle cx="80" cy="62" r="36" fill="color-mix(in srgb, var(--aqua) 14%, transparent)"/>
      <path d="M80 36c-5-4-10-5-14-5-8 0-12 6-12 14 0 7 3 10 5 16 2 7 3 18 8 18 4 0 4-13 7-17 1.500-2.500 3-3 6-3s4.500.5 6 3c3 4 3 17 7 17 5 0 6-11 8-18 2-6 5-9 5-16 0-8-4-14-12-14-4 0-9 1-14 5z" fill="var(--surface)" stroke="url(#eg)" stroke-width="3.500" stroke-linejoin="round"/>
      <path d="M66 46c4 5 9 7 14 7s10-2 14-7" fill="none" stroke="var(--aqua)" stroke-width="3.500" stroke-linecap="round"/>
      <path d="M126 24l2.500 6 6 2.500-6 2.500-2.500 6-2.500-6-6-2.500 6-2.500z" fill="var(--aqua)"/><path d="M30 78l1.800 4.200 4.200 1.800-4.200 1.800L30 90l-1.800-4.200L24 84l4.200-1.800z" fill="var(--primary)"/><circle cx="132" cy="84" r="4" fill="var(--c-agenda, #7A4FD6)" opacity=".7"/></svg>`;
  const empty = (title, text, action = '') => `<div class="empty">${EMPTY_ART}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;

  /** Campo de formulario con etiqueta. */
  function field(label, input, { hint = '', span = 1, req = false } = {}) {
    return `<label class="field span-${span}"><span class="lbl">${esc(label)}${req ? ' <b class="req" aria-hidden="true">*</b>' : ''}</span>${input}${hint ? `<small class="hint">${esc(hint)}</small>` : ''}</label>`;
  }
  const input = (name, value = '', attrs = '') => `<input name="${name}" id="f-${name}" value="${esc(value)}" ${attrs}>`;
  const textarea = (name, value = '', attrs = '') => `<textarea name="${name}" id="f-${name}" ${attrs}>${esc(value)}</textarea>`;
  const select = (name, options, value = '', attrs = '') => `<select name="${name}" id="f-${name}" ${attrs}>${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;

  /** Cambia la vista activa de un grupo de pestañas simple. */
  function tabs(container, onChange) {
    container.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]'); if (!b || !container.contains(b)) return;
      container.querySelectorAll('[data-tab]').forEach((x) => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); });
      onChange(b.dataset.tab);
    });
  }

  /** Barra horizontal simple dibujada a escala (SVG). */
  function barChart(items, { height = 170, format = (v) => v, color = 'var(--primary)' } = {}) {
    if (!items.length) return '<p class="muted small">Sin datos para el período.</p>';
    const max = Math.max(1, ...items.map((i) => i.value));
    const w = 100 / items.length;
    return `<div class="vbars" style="height:${height}px">${items.map((i) => `<div class="vbar" style="width:${w}%" title="${esc(i.label)}: ${esc(format(i.value))}"><span class="vbar-val">${esc(format(i.value))}</span><span class="vbar-fill" style="height:${Math.max(2, (i.value / max) * 100)}%;background:${i.color || color}"></span><span class="vbar-lbl">${esc(i.label)}</span></div>`).join('')}</div>`;
  }
  function hBars(items, { format = (v) => v } = {}) {
    if (!items.length) return '<p class="muted small">Sin datos para el período.</p>';
    const max = Math.max(1, ...items.map((i) => i.value));
    return `<div class="hbars">${items.map((i) => `<div class="hbar"><span class="hbar-lbl">${esc(i.label)}</span><span class="hbar-track"><span class="hbar-fill" style="width:${(i.value / max) * 100}%"></span></span><span class="hbar-val">${esc(format(i.value))}</span></div>`).join('')}</div>`;
  }

  return { icon, logoMark, toast, modal, confirm, closeAll, avatar, badge, empty, field, input, textarea, select, tabs, barChart, hBars, STATUS };
})();
