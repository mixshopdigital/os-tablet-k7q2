/* ODONTO SMART — licencias personales firmadas (mismo esquema que ContadorPy Pro, con claves propias).
   Formato:  OSM1.<datos en base64url>.<firma ECDSA P-256 / SHA-256 en base64url>
   Datos:    { v, id, n (licenciatario), e (correo), p (plan), f (emitida), x (vence o null) }
   La app solo contiene la clave PÚBLICA: puede verificar licencias, nunca emitirlas.
   Las licencias se emiten con generador-licencias-odontosmart.html y la clave privada del vendedor. */
OS.license = (() => {
  const U = OS.util; const { esc } = U;

  const PUBLIC_KEY = { kty: 'EC', crv: 'P-256', x: 'JDe5hqQcERUryLFiY_8wWFq8jaX5NE7RPolgvyRPb9s', y: '9OxheBKt1bdOysH_T4qPf3z-ty0OcsXEz193Jk2VIJE' };
  /** Licencias dadas de baja (n.° de licencia). Agregar aquí y republicar/actualizar la app. */
  const REVOKED = [];
  const PLANS = {
    individual: { name: 'Individual', edition: 'ODONTO SMART INDIVIDUAL', maxProfessionals: 1, desc: '1 profesional' },
    pro: { name: 'Pro', edition: 'ODONTO SMART', maxProfessionals: 3, desc: '3 profesionales incluidos' },
    trial: { name: 'Prueba gratuita', edition: 'ODONTO SMART · PRUEBA GRATUITA', maxProfessionals: 3, desc: '7 días · hasta 3 profesionales' },
    clinica: { name: 'Clínica', edition: 'ODONTO SMART CLÍNICA', maxProfessionals: Infinity, desc: 'profesionales ilimitados' },
  };

  const TRIAL_DAYS = 7; const TRIAL_KEY = 'osm_trial_start'; const SELLER_WA = '595994638426';
  let current = { status: 'none', lic: null };
  const waLink = (t) => `https://wa.me/${SELLER_WA}?text=${encodeURIComponent(t)}`;
  const lsGet = () => { try { return localStorage.getItem(TRIAL_KEY); } catch { return null; } };
  const lsSet = (v) => { try { localStorage.setItem(TRIAL_KEY, v); } catch { /* sin almacenamiento local */ } };
  /** Fecha de inicio de la prueba: la más antigua entre los datos y el almacenamiento local (difícil de reiniciar sin querer). */
  const trialStart = () => { const a = OS.store.data.meta.trialStart; const b = lsGet(); return [a, b].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '')).sort()[0] || null; };
  function trialState() {
    const st = trialStart(); if (!st) return null;
    const t = U.today(); const meta = OS.store.data.meta;
    const lic = { v: 1, id: 'PRUEBA', n: 'Prueba gratuita', e: '', p: 'trial', f: st, x: U.addDays(st, TRIAL_DAYS), trial: true };
    if (meta.maxSeen && U.daysBetween(t, meta.maxSeen) > 2) return { status: 'clock', lic };
    if (t >= lic.x) return { status: 'trialexpired', lic };
    if (!meta.maxSeen || t > meta.maxSeen) meta.maxSeen = t;
    return { status: 'trial', lic };
  }
  async function startTrial() {
    const t = U.today(); OS.store.data.meta.trialStart = t; lsSet(t);
    OS.store.log('Inició prueba gratuita', 'license', 'PRUEBA', `7 días desde ${t}`);
    await OS.store.persistNow(); current = trialState(); return current;
  }

  const b64u = {
    dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const t = atob(s); const b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; },
  };
  const clean = (t) => String(t || '').replace(/\s+/g, '');

  /** Verifica firma y contenido. Resuelve { ok, lic, reason }. */
  async function verify(token) {
    const m = clean(token).match(/^OSM1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
    if (!m) return { ok: false, reason: clean(token).startsWith('CPY1.') ? 'Esa es una licencia de ContadorPy Pro, no de ODONTO SMART.' : 'El código no tiene el formato de una licencia de ODONTO SMART. Copia el texto completo, desde «OSM1.» hasta el final.' };
    try {
      if (!window.crypto?.subtle) return { ok: false, reason: 'Este navegador no permite verificar licencias. Usa Microsoft Edge o Google Chrome actualizados.' };
      const key = await crypto.subtle.importKey('jwk', PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      const good = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, b64u.dec(m[2]), new TextEncoder().encode(m[1]));
      if (!good) return { ok: false, reason: 'La licencia no es válida: la firma no coincide. Verifica que la copiaste completa y sin cambios.' };
      const lic = JSON.parse(new TextDecoder().decode(b64u.dec(m[1])));
      if (lic.v !== 1 || !lic.id || !lic.n || !lic.e || !PLANS[lic.p]) return { ok: false, reason: 'La licencia está incompleta.' };
      return { ok: true, lic: { ...lic, token: clean(token) } };
    } catch { return { ok: false, reason: 'No se pudo leer la licencia. Copia el texto completo nuevamente.' }; }
  }

  function evaluate(lic) {
    if (!lic) return 'none';
    if (REVOKED.includes(lic.id)) return 'revoked';
    const meta = OS.store.data.meta; const t = U.today();
    if (meta.maxSeen && U.daysBetween(t, meta.maxSeen) > 2) return 'clock';
    if (lic.x && t > lic.x) return 'expired';
    return 'valid';
  }

  /** Carga y valida la licencia guardada. Se llama una vez al iniciar. */
  async function load() {
    const meta = OS.store.data.meta; const tok = meta.license;
    if (!tok) { current = trialState() || { status: 'none', lic: null }; return current; }
    const r = await verify(tok);
    current = r.ok ? { status: evaluate(r.lic), lic: r.lic } : { status: 'invalid', lic: null };
    if (current.status === 'valid') {
      const t = U.today(); if (!meta.maxSeen || t > meta.maxSeen) meta.maxSeen = t;
      OS.store.data.clinic.edition = current.lic.p; OS.store.persist();
    }
    return current;
  }

  async function install(token) {
    const r = await verify(token); if (!r.ok) return r;
    const st = evaluate(r.lic);
    if (st === 'revoked') return { ok: false, reason: `La licencia ${r.lic.id} fue dada de baja. Comunícate con quien te vendió ODONTO SMART.` };
    if (st === 'expired') return { ok: false, reason: `Esta licencia venció el ${U.fmtDate(r.lic.x)}. Pide una renovación.` };
    if (st === 'clock') return { ok: false, reason: 'La fecha de esta computadora parece incorrecta. Corrígela y vuelve a intentar.' };
    const prev = current.lic?.trial ? null : current.lic;
    const meta = OS.store.data.meta;
    meta.license = r.lic.token; meta.licenseHistory = [...(meta.licenseHistory || []), { id: r.lic.id, at: Date.now() }].slice(-20);
    OS.store.data.clinic.edition = r.lic.p;
    current = { status: 'valid', lic: r.lic };
    OS.store.log(prev ? 'Renovó licencia' : 'Activó licencia', 'license', r.lic.id, `${r.lic.id} · ${r.lic.n} · plan ${PLANS[r.lic.p].name}${r.lic.x ? ` · vence ${U.fmtDate(r.lic.x)}` : ''}`);
    await OS.store.persistNow();
    return { ok: true, lic: r.lic, renewed: !!prev && prev.e === r.lic.e };
  }

  const plan = () => { const b = PLANS[current.lic?.p] || PLANS.individual; const xp = Number(current.lic?.xp) || 0; return { ...b, maxProfessionals: b.maxProfessionals + xp, desc: xp ? `${b.desc} + ${xp} adicional${xp > 1 ? 'es' : ''}` : b.desc }; };
  const holder = () => (current.lic ? (current.lic.trial ? 'Versión de prueba gratuita' : `${current.lic.n} · Licencia ${current.lic.id}`) : '');
  const daysLeft = () => (current.lic?.x ? U.daysBetween(U.today(), current.lic.x) : null);
  /** ¿Se puede tener otro profesional activo? */
  function canAddProfessional() {
    const max = plan().maxProfessionals; const active = OS.store.data.professionals.filter((p) => p.active !== false).length;
    return { ok: active < max, max, active };
  }

  // ---------- Pantallas de la puerta de licencia ----------
  function screen(inner) {
    document.getElementById('app').innerHTML = `<main class="login"><div class="login-card" style="width:min(520px,100%)">
      <div class="brand-lockup">${OS.ui.logoMark(44)}<div><b>ODONTO SMART</b><span>Gestión inteligente para tu consultorio odontológico.</span></div></div>${inner}</div></main>`;
  }
  function wireActivate(onDone, renewal) {
    const ta = document.getElementById('lic-t'); const btn = document.getElementById('lic-ok'); const msg = document.getElementById('lic-msg');
    ta.focus();
    btn.onclick = async () => {
      btn.disabled = true; msg.hidden = true;
      const prevEmail = current.lic?.e;
      const r = await install(ta.value);
      btn.disabled = false;
      if (!r.ok) { msg.hidden = false; msg.textContent = r.reason; return; }
      if (renewal && prevEmail && prevEmail !== r.lic.e) OS.ui.toast('La nueva licencia está a nombre de otro correo; se reemplazó la anterior.', 'warn', 6000);
      OS.ui.toast(renewal ? `Licencia renovada${r.lic.x ? ` hasta el ${U.fmtDate(r.lic.x)}` : ''}.` : `Licencia activada a nombre de ${r.lic.n}.`);
      onDone();
    };
  }

  function activationScreen(onDone) {
    screen(`<h1>Bienvenida a ODONTO SMART</h1>
      <div class="trial-offer"><b>${OS.ui.icon('spark')} Probalo gratis durante 7 días</b><span class="small muted">Sin tarjeta y sin compromiso. Tenés todos los módulos y hasta 3 profesionales. Tus datos quedan guardados cuando actives tu licencia.</span>
        <button class="btn btn-primary btn-lg btn-block" id="lic-trial">${OS.ui.icon('zap')}<span>Empezar prueba gratuita</span></button></div>
      <p class="muted small" style="text-align:center">¿Ya compraste? Pegá tu código de licencia (empieza con <span class="mono">OSM1.</span>).</p>
      <p class="form-error" id="lic-msg" hidden></p>
      ${OS.ui.field('Tu licencia', '<textarea id="lic-t" rows="3" class="mono" style="font-size:.8em" placeholder="OSM1.…" spellcheck="false"></textarea>')}
      <button class="btn btn-lg btn-block" id="lic-ok">${OS.ui.icon('shield')}<span>Activar licencia</span></button>
      <a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink('Hola, quiero información sobre ODONTO SMART.')}">${OS.ui.icon('whatsapp')}<span>Consultar por WhatsApp</span></a>
      <p class="fine">La licencia es personal e intransferible.</p>`);
    wireActivate(onDone, false);
    document.getElementById('lic-trial').onclick = async () => { await startTrial(); OS.ui.toast('¡Listo! Tu prueba gratuita de 7 días comenzó.'); onDone(); };
  }

  function blockedScreen(onDone) {
    const l = current.lic; const st = current.status;
    const title = { trialexpired: 'Terminó tu prueba gratuita', expired: 'Tu licencia venció', revoked: 'Licencia dada de baja', clock: 'Revisa la fecha de la computadora', invalid: 'Licencia no válida' }[st];
    const text = {
      trialexpired: 'Los 7 días de prueba gratuita terminaron. Tus datos están guardados y a salvo. Para seguir usando ODONTO SMART pegá tu licencia: si todavía no la tenés, escribinos por WhatsApp.',
      expired: `La licencia ${l?.id || ''} a nombre de ${l?.n || ''} venció el ${U.fmtDate(l?.x)}. Tus datos están guardados y a salvo. Para seguir usando ODONTO SMART, pega tu licencia de renovación.`,
      revoked: `La licencia ${l?.id || ''} fue dada de baja. Tus datos siguen guardados en este equipo. Comunícate con quien te vendió ODONTO SMART.`,
      clock: 'La fecha de esta computadora es anterior a la última vez que se usó ODONTO SMART. Corrige la fecha y la hora de Windows y vuelve a abrir el programa.',
      invalid: 'La licencia guardada no se pudo verificar. Pega nuevamente tu licencia.',
    }[st];
    screen(`<h1>${title}</h1><p>${esc(text)}</p>
      ${st !== 'clock' ? `<p class="form-error" id="lic-msg" hidden></p>${OS.ui.field(st === 'expired' ? 'Licencia de renovación' : 'Licencia', '<textarea id="lic-t" rows="5" class="mono" style="font-size:.8em" placeholder="OSM1.…" spellcheck="false"></textarea>')}
      <button class="btn btn-primary btn-lg btn-block" id="lic-ok">${OS.ui.icon('shield')}<span>${st === 'expired' ? 'Activar renovación' : 'Activar licencia'}</span></button>` : '<button class="btn btn-primary btn-block" id="lic-retry">Volver a intentar</button>'}
      ${OS.store.data.patients.length ? `<button class="btn btn-ghost btn-block" id="lic-bk">${OS.ui.icon('download')}<span>Descargar mis datos (backup)</span></button>` : ''}`);
    if (st === 'trialexpired') document.getElementById('app').querySelector('.login-card').insertAdjacentHTML('beforeend', `<a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink('Hola, terminó mi prueba de ODONTO SMART y quiero activar mi licencia.')}">${OS.ui.icon('whatsapp')}<span>Pedir mi licencia por WhatsApp</span></a>`);
    if (st !== 'clock') wireActivate(onDone, true);
    document.getElementById('lic-retry')?.addEventListener('click', () => location.reload());
    document.getElementById('lic-bk')?.addEventListener('click', () => OS.files.backupNow());
  }

  /** Puerta: si hay licencia válida continúa; si no, muestra la pantalla que corresponde. */
  async function gate(onPass) {
    await load();
    if (current.status === 'valid' || current.status === 'trial') return onPass();
    if (current.status === 'none') return activationScreen(onPass);
    return blockedScreen(onPass);
  }

  // ---------- Panel en Configuración ----------
  function panel() {
    const l = current.lic; if (!l) return '';
    const d = daysLeft(); const p = plan(); const pc = canAddProfessional();
    if (l.trial) return `<section class="panel"><div class="panel-head"><h3>${OS.ui.icon('zap')}Prueba gratuita</h3>${OS.ui.badge('proxima', `Te quedan ${d} ${d === 1 ? 'día' : 'días'}`)}</div>
      <p>Estás usando ODONTO SMART en modo de prueba (hasta el ${U.fmtDate(U.addDays(l.x, -1))}). Cuando quieras seguir, activá tu licencia: <b>todos tus datos se conservan</b>.</p>
      ${OS.auth.can('config') ? `<div style="display:grid;gap:8px;margin-top:8px"><textarea id="lic-new" rows="3" class="mono" style="font-size:.8em" placeholder="Pegá acá tu licencia OSM1.…"></textarea><p class="form-error" id="lic-new-msg" hidden></p><button class="btn btn-primary" id="lic-new-ok">Activar mi licencia</button>
        <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink('Hola, estoy probando ODONTO SMART y quiero mi licencia.')}">${OS.ui.icon('whatsapp')}<span>Pedir mi licencia por WhatsApp</span></a></div>` : ''}</section>`;
    return `<section class="panel"><div class="panel-head"><h3>${OS.ui.icon('shield')}Licencia</h3>${OS.ui.badge(d !== null && d <= 30 ? 'proxima' : 'activo', d !== null && d <= 30 ? `Vence en ${d} días` : 'Activa')}</div>
      <dl class="kv"><dt>Licenciatario</dt><dd><b>${esc(l.n)}</b></dd><dt>Correo</dt><dd>${esc(l.e)}</dd><dt>N.° de licencia</dt><dd class="mono">${esc(l.id)}</dd>
        <dt>Plan</dt><dd>${esc(p.edition)} · ${esc(p.desc)}</dd><dt>Profesionales activos</dt><dd>${pc.active} de ${pc.max === Infinity ? 'ilimitados' : pc.max}</dd>
        <dt>Emitida</dt><dd>${U.fmtDate(l.f)}</dd><dt>Vence</dt><dd>${l.x ? U.fmtDate(l.x) : 'Sin vencimiento'}</dd></dl>
      <p class="muted small">La licencia es personal e intransferible. El nombre del licenciatario aparece en pantalla, en los PDF y en las exportaciones.</p>
      ${OS.auth.can('config') ? `<details><summary class="link">Renovar o cambiar de plan</summary><div style="display:grid;gap:8px;margin-top:8px"><textarea id="lic-new" rows="4" class="mono" style="font-size:.8em" placeholder="Pega aquí la nueva licencia OSM1.…"></textarea><p class="form-error" id="lic-new-msg" hidden></p><button class="btn btn-primary" id="lic-new-ok">Activar nueva licencia</button></div></details>` : ''}</section>`;
  }
  function wirePanel(root) {
    root.querySelector('#lic-new-ok')?.addEventListener('click', async () => {
      const r = await install(root.querySelector('#lic-new').value);
      if (!r.ok) { const m = root.querySelector('#lic-new-msg'); m.hidden = false; m.textContent = r.reason; return; }
      OS.ui.toast(`Licencia activada: plan ${PLANS[r.lic.p].name}${r.lic.x ? ` hasta el ${U.fmtDate(r.lic.x)}` : ''}.`);
      OS.app.renderShell(); OS.app.go('settings', { tab: 'licencia' }, true);
    });
  }

  return { verify, load, install, startTrial, waLink, gate, plan, holder, daysLeft, canAddProfessional, panel, wirePanel, PLANS, REVOKED, get current() { return current; } };
})();
