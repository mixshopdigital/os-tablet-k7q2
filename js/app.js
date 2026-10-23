/* ODONTO SMART — arranque, sesión, estructura (menú, barra superior), navegación,
   búsqueda global, notificaciones, atajos de teclado y primer uso. */
OS.views = OS.views || {};

OS.app = (() => {
  const U = OS.util; const { esc } = U; const ui = OS.ui; const S = OS.store;
  const root = () => document.getElementById('app');

  const NAV = [
    { id: 'dashboard', label: 'Inicio', icon: 'home' },
    { id: 'patients', label: 'Pacientes', icon: 'users', perm: 'pacientes' },
    { id: 'agenda', label: 'Agenda', icon: 'calendar', perm: 'agenda' },
    { id: 'odontogram', label: 'Odontograma', icon: 'tooth', perm: 'clinica' },
    { id: 'clinical', label: 'Historia clínica', icon: 'clinical', perm: 'clinica' },
    { id: 'treatments', label: 'Tratamientos', icon: 'plan', perm: 'presupuestos' },
    { id: 'quotes', label: 'Presupuestos', icon: 'quote', perm: 'presupuestos' },
    { id: 'payments', label: 'Cobros', icon: 'card', perm: 'cobros' },
    { id: 'invoicing', label: 'Facturación', icon: 'quote', perm: 'cobros' },
    { id: 'inventory', label: 'Inventario', icon: 'box', perm: 'inventario' },
    { id: 'lab', label: 'Laboratorio', icon: 'flask', perm: 'laboratorio' },
    { id: 'documents', label: 'Documentos', icon: 'folder', perm: 'documentos' },
    { id: 'reports', label: 'Reportes', icon: 'chart', perm: 'reportes' },
    { id: 'messages', label: 'Mensajes de hoy', icon: 'whatsapp', perm: 'seguimientos' },
    { id: 'followups', label: 'Seguimientos', icon: 'message', perm: 'seguimientos' },
    { id: 'professionals', label: 'Profesionales', icon: 'doctor', perm: 'profesionales' },
    { id: 'ai', label: 'Odonto Smart AI', icon: 'ai', perm: 'ia' },
    { id: 'settings', label: 'Configuración', icon: 'settings', perm: 'config' },
  ];
  const MOBILE = ['dashboard', 'agenda', 'patients', 'payments'];

  let current = { view: 'dashboard', params: {} };
  const history = [];

  // ---------- Arranque ----------
  async function boot() {
    root().innerHTML = `<div class="boot">${ui.logoMark(56)}<div class="skel-lines"><span></span><span></span><span></span></div></div>`;
    const info = await S.init();
    applyTheme();
    S.on((what) => { if (what === 'notifications') renderBell(); });
    if (info.adapter === 'memoria') setTimeout(() => ui.toast('Este navegador no permite guardar datos de forma permanente. Usa "Backup ahora" antes de cerrar.', 'warn', 8000), 800);
    return OS.license.gate(afterLicense);
  }
  function afterLicense() {
    if (!S.data.meta.onboarded) return welcome();
    if (OS.auth.resume()) return enter();
    return loginScreen();
  }

  function applyTheme() {
    const t = S.data?.settings?.theme || 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.setProperty('--font-scale', S.data?.settings?.fontScale || 1);
  }

  // ---------- Bienvenida y primer uso ----------
  function welcome() {
    root().innerHTML = `<main class="welcome">
      <section class="welcome-card">
        <div class="brand-lockup">${ui.logoMark(52)}<div><b>ODONTO SMART</b><span>Gestión inteligente para tu consultorio odontológico.</span></div></div>
        <h1>Bienvenida a ODONTO SMART</h1>
        <p class="lead">Todo tu consultorio, organizado en un solo lugar.</p>
        <ul class="welcome-points">
          <li>${ui.icon('tooth')}<span>Odontograma, historia clínica y evolución en la ficha de cada paciente.</span></li>
          <li>${ui.icon('quote')}<span>Presupuestos en PDF con tu logo, listos para enviar por WhatsApp.</span></li>
          <li>${ui.icon('shield')}<span>Los datos quedan guardados en este equipo y funcionan sin Internet.</span></li>
        </ul>
        <div class="welcome-actions">
          <button class="btn btn-primary btn-lg" id="w-setup">${ui.icon('settings')}<span>Comenzar configuración</span></button>
          <button class="btn btn-ghost btn-lg" id="w-demo">${ui.icon('spark')}<span>Explorar con datos demo</span></button>
        </div>
        <p class="fine">El modo demo carga 10 pacientes ficticios. Puedes eliminarlos después desde Configuración.</p>
      </section>
      <aside class="welcome-art" aria-hidden="true">${smileArt()}</aside>
    </main>`;
    document.getElementById('w-setup').onclick = () => OS.views.onboarding.start();
    document.getElementById('w-demo').onclick = async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.querySelector('span').textContent = 'Preparando…';
      await OS.seed.demo();
      S.data.meta.onboarded = true; await S.persistNow();
      loginScreen({ user: 'demo', pass: 'demo1234' });
    };
  }
  function smileArt() {
    return `<svg viewBox="0 0 360 360"><defs><linearGradient id="wg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--aqua)" stop-opacity=".9"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs>
      <circle cx="180" cy="180" r="150" fill="none" stroke="var(--line)" stroke-width="1"/><circle class="ring-a" cx="180" cy="180" r="110" fill="none" stroke="var(--aqua)" stroke-width="1.500" stroke-dasharray="3 8"/>
      <path d="M90 190c50 60 130 60 180 0" fill="none" stroke="url(#wg)" stroke-width="14" stroke-linecap="round"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${118 + i * 21}" y="${150 - (i === 2 || i === 3 ? 6 : 0)}" width="17" height="${26 + (i === 2 || i === 3 ? 6 : 0)}" rx="6" fill="var(--surface)" stroke="var(--primary)" stroke-width="2"/>`).join('')}
      <circle cx="268" cy="98" r="8" fill="var(--aqua)"/><circle cx="96" cy="262" r="4" fill="var(--primary)"/><path d="M268 98 300 70M268 98l26 10" stroke="var(--aqua)" stroke-width="2"/></svg>`;
  }

  // ---------- Inicio de sesión ----------
  function loginScreen(prefill = {}) {
    const c = S.data.clinic;
    root().innerHTML = `<main class="login">
      <form class="login-card" id="login-form" autocomplete="on">
        <div class="brand-lockup">${c.logoPng || c.logo ? `<img class="clinic-logo" src="${c.logoPng || c.logo}" alt="">` : ui.logoMark(48)}<div><b>${esc(c.name || 'ODONTO SMART')}</b><span>${c.name ? 'con ODONTO SMART' : 'Gestión inteligente para tu consultorio'}</span></div></div>
        <h1>Iniciar sesión</h1>
        ${S.data.meta.demo ? `<p class="note note-info">${ui.icon('spark')}<span>MODO DEMO · usuario <b>demo</b> y contraseña <b>demo1234</b> (administradora). También existe <b>recepcion</b> / <b>demo1234</b>.</span></p>` : ''}
        ${ui.field('Usuario', `<input name="user" id="l-user" autocomplete="username" value="${esc(prefill.user || '')}" required>`)}
        ${ui.field('Contraseña', `<input name="pass" id="l-pass" type="password" autocomplete="current-password" value="${esc(prefill.pass || '')}" required>`)}
        <p class="form-error" id="l-err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${ui.icon('lock')}<span>Ingresar</span></button>
        <button class="link" type="button" id="l-forgot" style="justify-self:center">¿Olvidaste tu contraseña?</button>
        <p class="fine">${ui.icon('shield')} Tus datos se guardan solo en este equipo (${esc(S.adapterName)}).</p>
        ${OS.license.current.lic ? `<p class="fine">Licencia de ${esc(OS.license.current.lic.n)} · ${esc(OS.license.current.lic.id)}</p>` : ''}
      </form>
    </main>`;
    const f = document.getElementById('login-form');
    (prefill.user ? f.querySelector('button[type=submit]') : f.querySelector('#l-user')).focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      const r = await OS.auth.login(f.user.value, f.pass.value);
      if (r !== true) { const er = document.getElementById('l-err'); er.hidden = false; er.textContent = r?.wait ? `Demasiados intentos fallidos. Espera ${r.wait > 60 ? Math.ceil(r.wait / 60) + ' minutos' : r.wait + ' segundos'} y vuelve a intentar.` : 'Usuario o contraseña incorrectos. Revisa los datos e intenta nuevamente.'; f.pass.value = ''; f.pass.focus(); return; }
      enter();
    };
    document.getElementById('l-forgot').onclick = () => recoverModal(f.user.value);
  }

  /** Recuperar contraseña con el código de recuperación o con la licencia (solo administradores). */
  function recoverModal(username = '') {
    let mode = 'code';
    const m = ui.modal({ title: 'Recuperar contraseña', subtitle: 'Tus datos no se modifican: solo creas una contraseña nueva.', size: 'md', guard: false,
      body: `<div class="seg"><button type="button" class="active" data-m="code">Con mi código de recuperación</button><button type="button" data-m="lic">Con mi licencia</button></div>
        <form id="rcf" class="form-grid">${ui.field('Usuario', ui.input('username', username, 'required autocomplete="username"'), { span: 2 })}
          <div class="field span-2" id="rc-code">${'<span class="lbl">Código de recuperación</span><input name="code" id="f-code" class="mono" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off">'}</div>
          <div class="field span-2" id="rc-lic" hidden><span class="lbl">Licencia (solo para el administrador)</span><textarea name="license" id="f-license" rows="4" class="mono" style="font-size:.8em" placeholder="OSM1.…"></textarea></div>
          ${ui.field('Contraseña nueva', '<input type="password" name="p1" id="f-p1" autocomplete="new-password" required>', { hint: 'Mínimo 8 caracteres, con letras y números.' })}${ui.field('Repetir contraseña', '<input type="password" name="p2" id="f-p2" autocomplete="new-password" required>')}
          <p class="form-error field span-2" id="rc-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Crear contraseña nueva', kind: 'primary', submit: true, form: 'rcf' }] });
    m.el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { mode = b.dataset.m; m.el.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('active', x === b)); m.el.querySelector('#rc-code').hidden = mode !== 'code'; m.el.querySelector('#rc-lic').hidden = mode !== 'lic'; }));
    m.el.querySelector('#rcf').onsubmit = async (e) => {
      e.preventDefault(); const v = U.formData(e.target); const er = m.el.querySelector('#rc-err');
      if (v.p1 !== v.p2) { er.hidden = false; er.textContent = 'Las contraseñas no coinciden.'; return; }
      try { await OS.auth.recover({ username: v.username, code: mode === 'code' ? v.code : '', license: mode === 'lic' ? v.license : '', newPassword: v.p1 }); m.close(true); ui.toast('Contraseña actualizada. Ya puedes ingresar.'); loginScreen({ user: v.username }); }
      catch (ex) { er.hidden = false; er.textContent = ex.message; }
    };
  }

  function showLock() {
    if (document.getElementById('lock')) return;
    const u = OS.auth.current();
    const el = document.createElement('div'); el.id = 'lock'; el.className = 'lock';
    el.innerHTML = `<form class="login-card" id="lock-form">${ui.logoMark(44)}<h2>Sesión bloqueada</h2><p class="muted">Por seguridad, la sesión se bloqueó por inactividad.</p>
      <p><b>${esc(OS.auth.displayName(u))}</b></p>${ui.field('Contraseña', '<input id="lk-pass" type="password" autocomplete="current-password" required>')}
      <p class="form-error" id="lk-err" hidden>Contraseña incorrecta.</p>
      <div class="row gap"><button class="btn btn-primary" type="submit">${ui.icon('lock')}<span>Desbloquear</span></button><button class="btn btn-ghost" type="button" id="lk-out">${ui.icon('logout')}<span>Cambiar de usuario</span></button></div></form>`;
    document.body.appendChild(el); ui.closeAll();
    el.querySelector('#lk-pass').focus();
    el.querySelector('#lock-form').onsubmit = async (e) => { e.preventDefault(); if (await OS.auth.unlock(el.querySelector('#lk-pass').value)) el.remove(); else el.querySelector('#lk-err').hidden = false; };
    el.querySelector('#lk-out').onclick = () => { el.remove(); logout(); };
  }

  // ---------- Estructura principal ----------
  function enter() {
    OS.seed.base();
    OS.domain.refreshNotifications();
    OS.files.autoBackupCheck().catch(() => {});
    renderShell();
    go('dashboard', {}, true);
    OS.fx.maybeTour();
  }

  function allowed(id) { const n = NAV.find((x) => x.id === id); return !n?.perm || OS.auth.can(n.perm); }

  function renderShell() {
    const u = OS.auth.current(); const c = S.data.clinic;
    const nav = NAV.filter((n) => allowed(n.id));
    root().innerHTML = `<div class="shell">
      <aside class="sidebar" aria-label="Menú principal">
        <div class="side-brand">${ui.logoMark(34)}<div><b>ODONTO SMART</b><span>${esc(c.name || 'Mi consultorio')}</span></div></div>
        <nav class="side-nav">${nav.map((n) => `<button class="nav-item" data-go="${n.id}" title="${esc(n.label)}">${ui.icon(n.icon)}<span>${esc(n.label)}</span>${n.id === 'messages' ? `<b class="nav-badge" ${OS.views.messages.count() ? '' : 'hidden'}>${OS.views.messages.count()}</b>` : ''}</button>`).join('')}</nav>
        <div class="side-foot">${S.data.meta.demo ? `<span class="demo-pill">${ui.icon('spark')}MODO DEMO</span>` : ''}${trialChip()}<span class="tagline">Menos administración.<br>Más tiempo para tus pacientes.</span>${OS.license.current.lic ? `<span class="lic-owner" title="Licencia personal e intransferible">Licenciado a ${esc(OS.license.current.lic.n)}<br><span class="mono">${esc(OS.license.current.lic.id)}</span></span>` : ''}</div>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn only-mobile" id="tb-menu" aria-label="Más opciones">${ui.icon('menu')}</button>
          <div class="search" role="search">${ui.icon('search')}<input id="g-search" type="search" placeholder="Buscar paciente, tratamiento, presupuesto o cita…" autocomplete="off" aria-label="Búsqueda global"><kbd>Ctrl B</kbd><div class="search-results" id="g-results" hidden></div></div>
          <div class="top-actions">
            <button class="icon-btn" id="tb-tour" title="Tour guiado" aria-label="Tour guiado">${ui.icon('spark')}</button>
            <button class="icon-btn" id="tb-help" title="Ayuda" aria-label="Ayuda">${ui.icon('help')}</button>
            <button class="icon-btn" id="tb-theme" title="Tema claro / oscuro" aria-label="Cambiar tema">${ui.icon(isDark() ? 'sun' : 'moon')}</button>
            <div class="bell-wrap"><button class="icon-btn" id="tb-bell" aria-label="Notificaciones">${ui.icon('bell')}<b class="dot" id="bell-n" hidden></b></button><div class="pop" id="bell-pop" hidden></div></div>
            <div class="user-wrap"><button class="user-btn" id="tb-user">${ui.avatar(OS.auth.displayName(u), null, 32)}<span class="only-desktop"><b>${esc(OS.auth.displayName(u))}</b><small>${esc(OS.auth.role()?.name || '')}</small></span></button>
              <div class="pop pop-menu" id="user-pop" hidden><button data-act="shortcuts">${ui.icon('keyboard')}<span>Atajos de teclado</span></button>${OS.auth.can('config') ? `<button data-act="backup">${ui.icon('download')}<span>Backup ahora</span></button>` : ''}<button data-act="lock">${ui.icon('lock')}<span>Bloquear</span></button><button data-act="logout">${ui.icon('logout')}<span>Cerrar sesión</span></button></div></div>
          </div>
        </header>
        <div class="crumbs" id="crumbs"></div>
        ${licenseBanner()}
        <main class="view" id="view" tabindex="-1"></main>
        <div class="lic-mark" aria-hidden="true">${esc(OS.license.holder())}</div>
      </div>
      <nav class="tabbar" aria-label="Navegación móvil">${MOBILE.filter(allowed).map((id) => { const n = NAV.find((x) => x.id === id); return `<button data-go="${id}">${ui.icon(n.icon)}<span>${n.label}</span></button>`; }).join('')}<button id="tab-more">${ui.icon('menu')}<span>Más</span></button></nav>
    </div>`;
    wireShell();
    renderBell();
    document.querySelectorAll('[data-go-lic]').forEach((b) => (b.onclick = () => go('settings', { tab: 'licencia' })));
  }
  function trialChip() {
    const lc = OS.license.current.lic; if (!lc?.trial) return '';
    const n = OS.license.daysLeft();
    return `<div class="trial-chip ${n > 2 ? 'ok' : ''}"><b>${ui.icon('zap')} Prueba gratuita</b><span>${n === 1 ? 'Te queda 1 día' : `Te quedan ${n} días`}</span><button data-go-lic>Activar licencia</button></div>`;
  }
  function licenseBanner() {
    const lc = OS.license.current.lic;
    if (lc?.trial) { const n = OS.license.daysLeft(); return `<div class="note note-info lic-banner">${ui.icon('zap')}<span><b>Prueba gratuita:</b> te ${n === 1 ? 'queda 1 día' : `quedan ${n} días`}. Todo lo que cargues se conserva al activar tu licencia.</span><button class="btn btn-sm btn-primary" data-go-lic>Activar licencia</button></div>`; }
    const d = OS.license.daysLeft(); if (d === null || d > 30) return '';
    return `<div class="note note-warn lic-banner">${ui.icon('alert')}<span>Tu licencia vence ${d === 0 ? 'hoy' : `en ${d} ${d === 1 ? 'día' : 'días'}`} (${U.fmtDate(OS.license.current.lic.x)}). Pide la renovación para seguir usando ODONTO SMART sin interrupciones. Tus datos se conservan.</span></div>`;
  }
  const isDark = () => { const t = S.data.settings.theme; return t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); };

  function wireShell() {
    const $ = (s) => document.querySelector(s);
    document.querySelector('.shell').addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });
    $('#tb-theme').onclick = () => { S.data.settings.theme = isDark() ? 'light' : 'dark'; S.changed('settings'); applyTheme(); $('#tb-theme').innerHTML = ui.icon(isDark() ? 'sun' : 'moon'); };
    $('#tb-help').onclick = () => OS.views.help.open();
    $('#tb-tour').onclick = () => OS.fx.tour();
    const toggle = (pop) => { document.querySelectorAll('.pop').forEach((p) => { if (p !== pop) p.hidden = true; }); pop.hidden = !pop.hidden; };
    $('#tb-bell').onclick = (e) => { e.stopPropagation(); renderBell(true); toggle($('#bell-pop')); };
    $('#tb-user').onclick = (e) => { e.stopPropagation(); toggle($('#user-pop')); };
    document.addEventListener('click', (e) => { if (!e.target.closest('.pop')) document.querySelectorAll('.pop').forEach((p) => (p.hidden = true)); if (!e.target.closest('.search')) $('#g-results') && ($('#g-results').hidden = true); });
    $('#user-pop').addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act; if (!a) return;
      if (a === 'logout') logout(); if (a === 'lock') showLock(); if (a === 'shortcuts') OS.views.help.open('atajos'); if (a === 'backup') OS.files.backupNow();
    });
    $('#bell-pop').addEventListener('click', (e) => {
      const n = e.target.closest('[data-ntf]');
      if (e.target.closest('#ntf-all')) { S.data.notifications.forEach((x) => (x.read = true)); S.changed('notifications'); renderBell(true); return; }
      if (n) { const rec = S.data.notifications.find((x) => x.id === n.dataset.ntf); if (rec) { rec.read = true; S.changed('notifications'); if (rec.link) go(rec.link[0], rec.link[1]); } $('#bell-pop').hidden = true; }
    });
    const more = () => {
      const m = ui.modal({ title: 'Menú', size: 'sm', guard: false, body: `<div class="more-grid">${NAV.filter((n) => allowed(n.id)).map((n) => `<button class="more-item" data-more="${n.id}">${ui.icon(n.icon)}<span>${esc(n.label)}</span></button>`).join('')}</div>` });
      m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-more]'); if (b) { m.close(true); go(b.dataset.more); } });
    };
    $('#tab-more').onclick = more; $('#tb-menu').onclick = more;
    wireSearch();
  }

  function renderBell(full) {
    const n = document.getElementById('bell-n'); if (!n) return;
    const unread = S.data.notifications.filter((x) => !x.read).length;
    n.hidden = !unread; n.textContent = unread > 9 ? '9+' : unread;
    if (!full) return;
    const ICON = { stock: 'box', pago: 'money', presupuesto: 'quote', laboratorio: 'flask', cita: 'calendar', paciente: 'users', backup: 'download' };
    const list = S.data.notifications.slice(0, 25);
    document.getElementById('bell-pop').innerHTML = `<div class="pop-head"><b>Notificaciones</b>${unread ? '<button class="link" id="ntf-all">Marcar todas como leídas</button>' : ''}</div>
      ${list.length ? `<ul class="ntf-list">${list.map((x) => `<li><button data-ntf="${x.id}" class="${x.read ? '' : 'unread'}">${ui.icon(ICON[x.type] || 'bell')}<span><b>${esc(x.text)}</b><small>${U.fmtDateTime(x.date)}</small></span></button></li>`).join('')}</ul>` : '<p class="muted pad">No hay notificaciones.</p>'}`;
  }

  function logout() { OS.auth.logout(); ui.closeAll(); loginScreen(); }

  // ---------- Navegación ----------
  function go(view, params = {}, replace = false) {
    if (!OS.views[view]) view = 'dashboard';
    const nav = NAV.find((n) => n.id === view);
    const perm = OS.views[view].perm || nav?.perm;
    if (perm && !OS.auth.can(perm)) { ui.toast('Tu usuario no tiene permiso para esta sección.', 'warn'); return; }
    if (!replace && current.view) history.push(current);
    if (history.length > 30) history.shift();
    current = { view, params };
    ui.closeAll();
    render();
  }
  function back() { const prev = history.pop(); if (prev) { current = prev; render(); } else go('dashboard', {}, true); }
  function render() {
    const v = OS.views[current.view]; const el = document.getElementById('view'); if (!el) return;
    document.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('active', b.dataset.go === (v.navId || current.view)));
    const crumbs = v.crumbs ? v.crumbs(current.params) : [NAV.find((n) => n.id === current.view)?.label || ''];
    document.getElementById('crumbs').innerHTML = `${history.length ? `<button class="crumb-back" id="cr-back" aria-label="Volver">${ui.icon('back')}</button>` : ''}<span>Inicio</span>${crumbs.filter((c) => c && c !== 'Inicio').map((c) => `${ui.icon('chevron')}<span>${esc(c)}</span>`).join('')}`;
    document.getElementById('cr-back')?.addEventListener('click', back);
    el.className = 'view fade';
    try { v.render(el, current.params); OS.fx.countUp(el); }
    catch (err) { console.error(err); el.innerHTML = ui.empty('No pudimos mostrar esta sección', 'Ocurrió un problema inesperado. Vuelve a intentarlo o recarga la aplicación.', '<button class="btn btn-primary" data-go="dashboard">Ir al inicio</button>'); }
    el.scrollTop = 0; window.scrollTo(0, 0);
  }
  /** Re-renderiza la vista actual conservando parámetros (tras guardar datos). */
  const refresh = (patch) => { if (patch) Object.assign(current.params, patch); render(); };

  // ---------- Búsqueda global ----------
  function wireSearch() {
    const inp = document.getElementById('g-search'); const box = document.getElementById('g-results');
    let sel = -1;
    const run = () => {
      const q = U.norm(inp.value.trim()); sel = -1;
      if (q.length < 2) { box.hidden = true; return; }
      const D = OS.domain; const res = [];
      if (OS.auth.can('pacientes')) S.data.patients.filter((p) => U.norm(`${p.firstName} ${p.lastName} ${p.ci} ${p.phone} ${p.whatsapp}`).replace(/\s/g, '').includes(q.replace(/\s/g, '')) || U.norm(`${p.firstName} ${p.lastName}`).includes(q)).slice(0, 6)
        .forEach((p) => res.push({ group: 'Pacientes', icon: 'users', title: D.fullName(p), sub: `CI ${p.ci || '—'} · ${U.prettyPhone(p.phone)}`, go: ['patient', { id: p.id }] }));
      if (OS.auth.can('presupuestos')) S.data.quotes.filter((x) => U.norm(`${x.number} ${D.patientName(x.patientId)}`).includes(q)).slice(0, 4)
        .forEach((x) => res.push({ group: 'Presupuestos', icon: 'quote', title: `N.º ${x.number} · ${D.patientName(x.patientId)}`, sub: `${U.fmtDate(x.date)} · ${U.money(D.quoteTotals(x).total)}`, go: ['quote', { id: x.id }] }));
      if (OS.auth.can('agenda')) S.data.appointments.filter((a) => a.date >= U.addDays(U.today(), -30) && U.norm(`${D.patientName(a.patientId)} ${a.treatment} ${U.fmtDate(a.date)}`).includes(q)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4)
        .forEach((a) => res.push({ group: 'Citas', icon: 'calendar', title: `${U.fmtDate(a.date)} ${a.time} · ${D.patientName(a.patientId)}`, sub: a.treatment, go: ['agenda', { date: a.date, view: 'day' }] }));
      S.data.treatments.filter((t) => U.norm(t.name).includes(q)).slice(0, 3)
        .forEach((t) => res.push({ group: 'Tratamientos', icon: 'plan', title: t.name, sub: `${t.category} · ${U.money(t.price)}`, go: ['treatments', { tab: 'catalogo' }] }));
      box.hidden = false;
      if (!res.length) { box.innerHTML = '<p class="muted pad">Sin resultados. Prueba con nombre, cédula, teléfono o número de presupuesto.</p>'; return; }
      let g = ''; box.innerHTML = res.map((r, i) => { const head = r.group !== g ? `<h6>${(g = r.group)}</h6>` : ''; return `${head}<button class="sr" data-i="${i}">${ui.icon(r.icon)}<span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span></button>`; }).join('');
      box.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) { const r = res[b.dataset.i]; box.hidden = true; inp.value = ''; go(r.go[0], r.go[1]); } };
    };
    inp.addEventListener('input', U.debounce(run, 90));
    inp.addEventListener('focus', run);
    inp.addEventListener('keydown', (e) => {
      const items = [...box.querySelectorAll('.sr')]; if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.classList.toggle('sel', i === sel)); items[sel].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); (items[sel] || items[0]).click(); }
    });
  }

  // ---------- Atajos ----------
  document.addEventListener('keydown', (e) => {
    if (!OS.auth.current() || OS.auth.locked || !document.querySelector('.shell')) return;
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const typing = e.target.closest('input, textarea, select, [contenteditable]');
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); document.getElementById('g-search')?.focus(); return; }
    if (typing) return;
    const map = { p: () => OS.auth.can('pacientes') && OS.views.patients.form(), a: () => OS.auth.can('agenda') && OS.views.agenda.form({}), o: () => OS.auth.can('clinica') && go('odontogram'), r: () => OS.auth.can('presupuestos') && OS.views.quotes.create({}) };
    if (map[k]) { e.preventDefault(); map[k](); }
  });

  /** Selector de paciente reutilizable (con búsqueda). Resuelve id o null. */
  function pickPatient(title = 'Elegir paciente') {
    return new Promise((res) => {
      let done = false;
      const m = ui.modal({ title, size: 'sm', guard: false, onClose: () => { if (!done) res(null); }, body: `<div class="search inline">${ui.icon('search')}<input id="pp-q" placeholder="Nombre, cédula o teléfono" autocomplete="off"></div><div class="pp-list" id="pp-list"></div><button class="btn btn-ghost btn-block" id="pp-new">${ui.icon('plus')}<span>Nuevo paciente</span></button>` });
      const list = m.el.querySelector('#pp-list'); const q = m.el.querySelector('#pp-q');
      const draw = () => {
        const t = U.norm(q.value);
        const rows = S.data.patients.filter((p) => U.norm(`${p.firstName} ${p.lastName} ${p.ci} ${p.phone}`).includes(t)).sort((a, b) => a.firstName.localeCompare(b.firstName)).slice(0, 40);
        list.innerHTML = rows.map((p) => `<button class="pp-item" data-id="${p.id}">${ui.avatar(OS.domain.fullName(p), p.photo, 30)}<span><b>${esc(OS.domain.fullName(p))}</b><small>CI ${esc(p.ci || '—')}</small></span></button>`).join('') || '<p class="muted pad">Sin coincidencias.</p>';
      };
      q.addEventListener('input', draw); draw();
      list.onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { done = true; m.close(true); res(b.dataset.id); } };
      m.el.querySelector('#pp-new').onclick = () => { done = true; m.close(true); OS.views.patients.form(null, (p) => res(p.id)); };
    });
  }

  return { boot, go, back, refresh, render, showLock, applyTheme, logout, pickPatient, NAV, get current() { return current; }, renderShell };
})();

window.addEventListener('DOMContentLoaded', () => OS.app.boot());
