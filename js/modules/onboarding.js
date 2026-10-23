/* ODONTO SMART — asistente de primer uso: "Configura tu consultorio". */
OS.views.onboarding = (() => {
  const U = OS.util; const ui = OS.ui; const S = OS.store; const { esc } = U;
  const STEPS = ['Consultorio', 'Logo', 'Tu usuario', 'Profesional y horarios', 'Presupuestos', 'Primer paciente', 'Listo'];
  let step = 0; let draft = {};

  function start() { step = 0; draft = { clinic: { ...S.data.clinic }, user: {}, prof: { title: 'Dra.' }, patient: {} }; draw(); }

  function draw() {
    const c = draft.clinic;
    const body = [
      () => `<div class="form-grid">
        ${ui.field('Nombre del consultorio', ui.input('name', c.name, 'required placeholder="Ej.: Sonrisa Clara Odontología"'), { span: 2, req: true })}
        ${ui.field('RUC', ui.input('ruc', c.ruc, 'placeholder="80012345-6"'))}
        ${ui.field('Teléfono', ui.input('phone', c.phone, 'inputmode="tel"'))}
        ${ui.field('Dirección', ui.input('address', c.address), { span: 2 })}
        ${ui.field('Ciudad', ui.input('city', c.city))}
        ${ui.field('WhatsApp del consultorio', ui.input('whatsapp', c.whatsapp, 'inputmode="tel" placeholder="0981 123 456"'), { hint: 'Se normaliza con +595 automáticamente.' })}
        ${ui.field('Email', ui.input('email', c.email, 'type="email"'))}
        ${ui.field('Redes sociales', ui.input('social', c.social, 'placeholder="@miconsultorio"'))}</div>`,
      () => `<div class="logo-drop" id="ob-logo">${c.logo ? `<img src="${c.logo}" alt="Logo">` : ui.logoMark(64)}<p>${c.logo ? 'Este logo aparecerá en presupuestos, recibos y recetas.' : 'Sube el logo de tu consultorio (PNG, JPG o SVG).'}</p>
        <label class="btn btn-soft">${ui.icon('upload')}<span>${c.logo ? 'Cambiar logo' : 'Elegir archivo'}</span><input type="file" id="ob-file" accept="image/png,image/jpeg,image/svg+xml" hidden></label></div><p class="hint">Puedes hacerlo más tarde desde Configuración → Mi consultorio.</p>`,
      () => `<p class="muted">Este será el usuario administrador, con acceso total. La contraseña se guarda cifrada.</p><div class="form-grid">
        ${ui.field('Tu nombre', ui.input('uname', draft.user.name || '', 'required'), { req: true })}
        ${ui.field('Usuario', ui.input('username', draft.user.username || '', 'required autocomplete="username" placeholder="ej.: laura"'), { req: true })}
        ${ui.field('Contraseña', '<input name="password" id="f-password" type="password" autocomplete="new-password" required minlength="8">', { req: true, hint: 'Mínimo 8 caracteres, con letras y números.' })}
        ${ui.field('Repetir contraseña', '<input name="password2" id="f-password2" type="password" autocomplete="new-password" required>', { req: true })}</div>`,
      () => `<div class="form-grid cols-3">
        ${ui.field('Título', ui.select('ptitle', ['Dra.', 'Dr.', 'Od.', 'Lic.'], draft.prof.title))}
        ${ui.field('Nombre del profesional', ui.input('pname', draft.prof.name || draft.user.name || '', 'required'), { span: 2, req: true })}
        ${ui.field('Especialidad', ui.input('pspec', draft.prof.specialty || 'Odontología general'), { span: 2 })}
        ${ui.field('Registro profesional', ui.input('preg', draft.prof.registry || ''))}</div>
        <h4 class="eyebrow">Horario de atención</h4>
        <div class="table-wrap"><table class="tbl"><tbody>${c.hours.map((h, i) => `<tr><td><b style="text-transform:capitalize">${h.day}</b></td><td><label class="check"><input type="checkbox" name="closed${i}" ${h.closed ? 'checked' : ''}><span>Cerrado</span></label></td><td><input type="time" name="open${i}" value="${h.open}"></td><td><input type="time" name="close${i}" value="${h.close}"></td></tr>`).join('')}</tbody></table></div>`,
      () => `<div class="form-grid">
        ${ui.field('Validez del presupuesto (días)', ui.input('validity', c.quoteValidityDays, 'type="number" min="1" max="180"'))}
        ${ui.field('Moneda (prefijo)', ui.input('currencyPrefix', c.currencyPrefix, 'maxlength="4"'), { hint: 'Guaraníes: G.' })}
        ${ui.field('Formas de pago', ui.input('paymentTerms', c.paymentTerms), { span: 2 })}
        ${ui.field('Nota al pie del presupuesto', ui.textarea('quoteNotes', c.quoteNotes, 'rows="3"'), { span: 2 })}</div>`,
      () => `<p class="muted">Opcional: carga tu primer paciente ahora o hazlo después.</p><div class="form-grid">
        ${ui.field('Nombre', ui.input('fn', draft.patient.firstName || ''))}${ui.field('Apellido', ui.input('ln', draft.patient.lastName || ''))}
        ${ui.field('Cédula', ui.input('ci', draft.patient.ci || ''))}${ui.field('WhatsApp', ui.input('wa', draft.patient.whatsapp || '', 'inputmode="tel"'))}</div>`,
      () => `<div class="empty" style="color:var(--ink)"><svg viewBox="0 0 120 64" aria-hidden="true"><path d="M10 30c14 24 86 24 100 0" fill="none" stroke="var(--primary)" stroke-width="5" stroke-linecap="round"/><circle cx="98" cy="10" r="5" fill="var(--aqua)"/></svg><h2>🎉 ¡Tu consultorio está listo!</h2><p class="muted">${esc(c.name)} ya puede usar ODONTO SMART. Te recomendamos hacer una copia de seguridad semanal en un USB.</p></div>
        <div class="form-section"><h4>Tu código de recuperación</h4><p class="small">Si olvidas la contraseña, este código te permite crear una nueva. <b>Se muestra una sola vez</b>: guárdalo en un lugar seguro.</p>
          <div class="codebox mono">${esc(draft.recCode || '')}</div><div class="row gap"><button type="button" class="btn btn-sm" id="ob-cp">${ui.icon('copy')}<span>Copiar</span></button><button type="button" class="btn btn-sm" id="ob-dl">${ui.icon('download')}<span>Descargar como archivo</span></button></div>
          <label class="check"><input type="checkbox" id="ob-saved"><span>Ya guardé mi código de recuperación</span></label></div>`,
    ][step]();
    document.getElementById('app').innerHTML = `<main class="wizard"><div class="brand-lockup">${ui.logoMark(40)}<div><b>Configura tu consultorio</b><span>Paso ${step + 1} de ${STEPS.length} · ${STEPS[step]}</span></div></div>
      <div class="step-dots" aria-hidden="true">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <form class="wizard-card" id="ob-form" novalidate><h1>${STEPS[step]}</h1>${body}<p class="form-error" id="ob-err" hidden></p>
      <div class="wizard-foot">${step > 0 && step < 6 ? `<button type="button" class="btn btn-ghost" id="ob-back">${ui.icon('back')}<span>Atrás</span></button>` : '<span></span>'}
      <div class="row gap">${step === 1 || step === 5 ? '<button type="button" class="btn btn-ghost" id="ob-skip">Omitir</button>' : ''}<button class="btn btn-primary" type="submit">${step === 6 ? 'Ir a mi consultorio' : step === 5 ? 'Finalizar' : 'Continuar'}${ui.icon('chevron')}</button></div></div></form></main>`;
    const f = document.getElementById('ob-form');
    f.querySelector('input:not([type=checkbox]):not([type=file])')?.focus();
    document.getElementById('ob-back')?.addEventListener('click', () => { collect(f, true); step--; draw(); });
    document.getElementById('ob-skip')?.addEventListener('click', () => { if (step === 5) draft.patient = {}; next(); });
    document.getElementById('ob-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 2 * 1024 * 1024) { err('El logo supera 2 MB. Usa una imagen más liviana.'); return; }
      c.logo = await U.readFile(file); c.logoPng = await U.toPng(c.logo); draw();
    });
    document.getElementById('ob-cp')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(draft.recCode); ui.toast('Código copiado.'); } catch { ui.toast('Selecciona el código y cópialo con Ctrl+C.', 'warn'); } });
    document.getElementById('ob-dl')?.addEventListener('click', () => OS.files.save('codigo-recuperacion-odontosmart.txt', `ODONTO SMART — código de recuperación\nUsuario: ${draft.user.username}\nCódigo: ${draft.recCode}\n\nGuárdalo en un lugar seguro. No lo compartas.\n`, 'text/plain'));
    f.onsubmit = (e) => { e.preventDefault(); if (step === 6 && !document.getElementById('ob-saved').checked) return err('Marca que ya guardaste tu código de recuperación para continuar.'); if (collect(f)) next(); };
  }
  function err(t) { const el = document.getElementById('ob-err'); el.hidden = !t; el.textContent = t || ''; }

  function collect(f, lenient) {
    const v = U.formData(f); const c = draft.clinic;
    if (step === 0) { Object.assign(c, { name: v.name, ruc: v.ruc, phone: v.phone, address: v.address, city: v.city, whatsapp: v.whatsapp, email: v.email, social: v.social }); if (!lenient && !v.name) return err('Escribe el nombre del consultorio.'), false; if (!lenient && v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return err('El email no parece válido.'), false; }
    if (step === 2) { draft.user = { name: v.uname, username: v.username, password: v.password }; if (lenient) return true; if (!v.uname || !v.username) return err('Completa tu nombre y usuario.'), false; if (!/^[a-zA-Z0-9._-]{3,30}$/.test(v.username)) return err('El usuario debe tener entre 3 y 30 caracteres, sin espacios.'), false; if (OS.auth.policy(v.password)) return err(OS.auth.policy(v.password)), false; if (v.password !== v.password2) return err('Las contraseñas no coinciden.'), false; }
    if (step === 3) { draft.prof = { title: v.ptitle, name: v.pname, specialty: v.pspec, registry: v.preg }; c.hours = c.hours.map((h, i) => ({ ...h, closed: v['closed' + i], open: v['open' + i], close: v['close' + i] })); if (!lenient && !v.pname) return err('Escribe el nombre del profesional.'), false; }
    if (step === 4) { c.quoteValidityDays = Number(v.validity) || 15; c.currencyPrefix = v.currencyPrefix || 'G.'; c.paymentTerms = v.paymentTerms; c.quoteNotes = v.quoteNotes; }
    if (step === 5) { draft.patient = { firstName: v.fn, lastName: v.ln, ci: v.ci, whatsapp: v.wa, phone: v.wa }; if (!lenient && (v.fn || v.ln) && !(v.fn && v.ln)) return err('Completa nombre y apellido, o presiona Omitir.'), false; }
    err(''); return true;
  }

  async function next() {
    if (step === 5) {
      try {
        const d = draft;
        S.data.clinic = { ...d.clinic, doctorName: `${d.prof.title} ${d.prof.name}`, registry: d.prof.registry };
        const prof = S.insert('professionals', { ...d.prof, phone: d.clinic.phone, color: '#0E7C86', active: true }, `Profesional ${d.prof.name}`);
        const admin = await OS.auth.createUser({ username: d.user.username, name: d.user.name, roleId: 'admin', password: d.user.password, professionalId: prof.id });
        d.recCode = await OS.auth.setRecoveryCode(admin.id);
        OS.seed.base();
        if (d.patient.firstName) S.insert('patients', { ...d.patient, status: 'activo', professionalId: prof.id, sex: '', birthDate: '', email: '', address: '', notes: '' }, `Paciente ${d.patient.firstName} ${d.patient.lastName}`);
        S.data.meta.onboarded = true; S.log('Creó', 'clinic', null, 'Configuración inicial del consultorio');
        await S.persistNow();
      } catch (e) { step = 2; draw(); err(e.message); return; }
    }
    if (step === 6) { await OS.auth.login(draft.user.username, draft.user.password); draft.user.password = null; draft.recCode = null; OS.app.boot(); return; }
    step++; draw();
  }

  return { start, render: () => {} };
})();
