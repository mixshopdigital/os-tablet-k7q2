/* ODONTO SMART — Configuración: consultorio, WhatsApp, usuarios y roles, copias de seguridad,
   importación/exportación, apariencia, auditoría, privacidad, acceso móvil y planes. */
OS.views.settings = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const TABS = [['consultorio', 'Mi consultorio', 'home'], ['whatsapp', 'WhatsApp', 'whatsapp'], ['usuarios', 'Usuarios y permisos', 'lock'], ['backup', 'Copias de seguridad', 'download'], ['datos', 'Importar / exportar', 'swap'], ['apariencia', 'Apariencia y seguridad', 'sun'], ['auditoria', 'Auditoría', 'shield'], ['privacidad', 'Privacidad', 'shield'], ['mobile', 'Acceso móvil', 'phone'], ['licencia', 'Licencia', 'shield']];
  const PERMS = [['pacientes', 'Pacientes'], ['clinica', 'Clínica (historia, odontograma, recetas)'], ['agenda', 'Agenda'], ['presupuestos', 'Presupuestos y tratamientos'], ['cobros', 'Cobros'], ['inventario', 'Inventario'], ['laboratorio', 'Laboratorio'], ['documentos', 'Documentos'], ['reportes', 'Reportes'], ['seguimientos', 'Seguimientos'], ['profesionales', 'Profesionales'], ['ia', 'Asistente IA'], ['config', 'Configuración']];

  function render(el, params) {
    const tab = params.tab || 'consultorio';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Configuración</span><h1>Configuración</h1><p>Personaliza ODONTO SMART para tu consultorio.</p></div></div>
      <nav class="tabs" id="s-tabs">${TABS.map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav><div id="s-body" style="display:grid;gap:16px"></div>`;
    ui.tabs(el.querySelector('#s-tabs'), (k) => OS.app.refresh({ tab: k }));
    (({ consultorio, whatsapp, usuarios, backup, datos, apariencia, auditoria, privacidad, mobile, licencia })[tab] || consultorio)(el.querySelector('#s-body'));
  }

  // ---------- Mi consultorio ----------
  function consultorio(b) {
    const c = S.data.clinic;
    b.innerHTML = `<div class="grid-main"><form class="panel" id="cf"><div class="panel-head"><h3>${ui.icon('home')}Datos del consultorio</h3></div>
      <div class="form-section"><div class="logo-drop">${c.logo ? `<img src="${c.logoPng || c.logo}" alt="Logo del consultorio">` : ui.logoMark(64)}<div class="row gap wrap" style="justify-content:center"><label class="btn btn-soft">${ui.icon('upload')}<span>${c.logo ? 'Cambiar logo' : 'Subir logo'}</span><input type="file" id="cf-logo" accept="image/png,image/jpeg,image/svg+xml" hidden></label>${c.logo ? '<button type="button" class="btn btn-ghost" id="cf-nologo">Quitar</button>' : ''}</div><small class="hint">PNG, JPG o SVG. Se usa en presupuestos, recibos, recetas y en el inicio de sesión.</small></div></div>
      <div class="form-section"><div class="form-grid">${ui.field('Nombre', ui.input('name', c.name, 'required'), { span: 2, req: true })}${ui.field('RUC', ui.input('ruc', c.ruc))}${ui.field('Teléfono', ui.input('phone', c.phone))}
        ${ui.field('Dirección', ui.input('address', c.address))}${ui.field('Ciudad', ui.input('city', c.city))}${ui.field('Email', ui.input('email', c.email, 'type="email"'))}${ui.field('Redes sociales', ui.input('social', c.social))}
        ${ui.field('Odontólogo/a responsable', ui.input('doctorName', c.doctorName))}${ui.field('Registro profesional', ui.input('registry', c.registry))}</div></div>
      <div class="form-section"><h4>Presupuestos y documentos</h4><div class="form-grid">${ui.field('Validez del presupuesto (días)', ui.input('quoteValidityDays', c.quoteValidityDays, 'type="number" min="1"'))}${ui.field('Moneda (prefijo)', ui.input('currencyPrefix', c.currencyPrefix, 'maxlength="4"'))}
        ${ui.field('Formas de pago', ui.input('paymentTerms', c.paymentTerms), { span: 2 })}${ui.field('Nota al pie del presupuesto', ui.textarea('quoteNotes', c.quoteNotes, 'rows="2"'), { span: 2 })}
        ${ui.field('Firma digitalizada (imagen)', '<input type="file" id="cf-sign" accept="image/png,image/jpeg">', { hint: c.signature ? 'Firma cargada. Sube otra para reemplazarla.' : 'Aparece sobre la línea "Profesional" en recetas y presupuestos.' })}</div></div>
      <div class="form-section"><h4>Horarios</h4><div class="table-wrap"><table class="tbl"><tbody>${c.hours.map((h, i) => `<tr><td style="text-transform:capitalize"><b>${h.day}</b></td><td><label class="check"><input type="checkbox" name="closed${i}" ${h.closed ? 'checked' : ''}><span>Cerrado</span></label></td><td><input type="time" name="open${i}" value="${h.open}" aria-label="Abre ${h.day}"></td><td><input type="time" name="close${i}" value="${h.close}" aria-label="Cierra ${h.day}"></td></tr>`).join('')}</tbody></table></div></div>
      <div class="row"><button class="btn btn-primary right" type="submit">${ui.icon('check')}<span>Guardar consultorio</span></button></div></form>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('eye')}Así se verá en tus PDF</h3></div><div class="paper-wrap" style="max-height:none;padding:10px">${OS.pdf.html({ title: 'PRESUPUESTO', number: 'P-0000', date: U.today(), patient: { name: 'Paciente de ejemplo', ci: '1.234.567' }, blocks: [{ type: 'table', head: ['Pieza', 'Tratamiento', 'Importe'], align: ['center', 'left', 'right'], rows: [['16', 'Restauración de resina', U.money(400000)]] }, { type: 'totals', rows: [['TOTAL', U.money(400000), true]] }] })}</div>
        <button class="btn btn-ghost" id="cf-test">${ui.icon('download')}<span>Descargar PDF de prueba</span></button></section></div>`;
    const f = b.querySelector('#cf');
    b.querySelector('#cf-logo').onchange = async (e) => { const file = e.target.files[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) return ui.toast('El logo supera 2 MB.', 'warn'); const logo = await U.readFile(file); S.data.clinic.logo = logo; S.data.clinic.logoPng = await U.toPng(logo); S.log('Modificó', 'clinic', null, 'Logo del consultorio'); S.changed('clinic'); ui.toast('Logo actualizado.'); OS.app.renderShell(); OS.app.go('settings', { tab: 'consultorio' }, true); };
    b.querySelector('#cf-nologo')?.addEventListener('click', () => { S.data.clinic.logo = null; S.data.clinic.logoPng = null; S.changed('clinic'); OS.app.refresh(); });
    b.querySelector('#cf-test').onclick = () => { const model = { title: 'PRESUPUESTO', number: 'P-0000', date: U.today(), patient: { name: 'Paciente de ejemplo', ci: '1.234.567' }, blocks: [{ type: 'table', head: ['Pieza', 'Tratamiento', 'Importe'], align: ['center', 'left', 'right'], rows: [['16', 'Restauración de resina', U.money(400000)]] }, { type: 'totals', rows: [['TOTAL', U.money(400000), true]] }, { type: 'signature', labels: ['Profesional'] }] }; OS.files.save('prueba_presupuesto.pdf', OS.pdf.blob(model), 'application/pdf'); };
    f.onsubmit = async (e) => {
      e.preventDefault(); const v = U.formData(f);
      if (!v.name) return ui.toast('El nombre del consultorio es obligatorio.', 'warn');
      const hours = c.hours.map((h, i) => ({ ...h, closed: v['closed' + i], open: v['open' + i], close: v['close' + i] }));
      Object.keys(v).filter((k) => /^(closed|open|close)\d$/.test(k)).forEach((k) => delete v[k]);
      const sign = b.querySelector('#cf-sign').files[0];
      if (sign) S.data.clinic.signature = await U.toPng(await U.readFile(sign), 500);
      Object.assign(S.data.clinic, v, { hours, quoteValidityDays: Number(v.quoteValidityDays) || 15 });
      S.log('Modificó', 'clinic', null, 'Datos del consultorio'); S.changed('clinic'); ui.toast('Consultorio actualizado.'); OS.app.renderShell(); OS.app.go('settings', { tab: 'consultorio' }, true);
    };
  }

  // ---------- WhatsApp ----------
  function whatsapp(b) {
    const c = S.data.clinic;
    b.innerHTML = `<div class="grid-2"><form class="panel" id="wf"><div class="panel-head"><h3>${ui.icon('whatsapp')}WhatsApp del consultorio</h3></div>
      ${ui.field('Número del consultorio', ui.input('whatsapp', c.whatsapp, 'inputmode="tel"'), { hint: `Se guarda como +${U.normalizePhone(c.whatsapp) || '595…'}` })}
      ${ui.field('Código de país por defecto', ui.input('country', c.country || '595', 'inputmode="numeric" maxlength="3"'), { hint: 'Paraguay: 595. Se agrega a los números que empiezan con 0.' })}
      <div class="row"><button class="btn btn-primary right" type="submit">Guardar</button></div></form>
      <section class="panel"><h3>${ui.icon('help')} Cómo funciona</h3><ul class="list-plain small">
        <li>• Cada paciente tiene botón de WhatsApp: abre la conversación en WhatsApp Desktop, WhatsApp Web o el teléfono con el mensaje ya escrito.</li>
        <li>• Botones rápidos: confirmar cita, recordar pago, enviar presupuesto, recordar control y mensaje personalizado.</li>
        <li>• El PDF del presupuesto se descarga y se adjunta con el clip de WhatsApp. El enlace oficial (wa.me) no permite adjuntar archivos automáticamente.</li>
        <li>• Envío automático y masivo: requiere WhatsApp Business API (Meta) y un servidor. No está incluido en esta versión.</li></ul>
        <a class="btn btn-wa" href="${esc(OS.wa.link(c.whatsapp, 'Prueba de ODONTO SMART') || '#')}" target="_blank" rel="noopener" ${c.whatsapp ? '' : 'hidden'}>${ui.icon('whatsapp')}<span>Probar con el número del consultorio</span></a></section></div>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('message')}Plantillas</h3><button class="btn btn-sm" data-go-tpl>${ui.icon('edit')}<span>Editar plantillas</span></button></div><ul class="list-plain small">${S.data.messageTemplates.map((t) => `<li><b>${esc(t.name)}:</b> <span class="muted">${esc(t.body)}</span></li>`).join('')}</ul></section>`;
    b.querySelector('#wf').onsubmit = (e) => { e.preventDefault(); const v = U.formData(e.target); S.data.clinic.whatsapp = v.whatsapp; S.data.clinic.country = v.country.replace(/\D/g, '') || '595'; S.log('Modificó', 'settings', null, 'WhatsApp del consultorio'); S.changed('clinic'); ui.toast('WhatsApp guardado.'); OS.app.refresh(); };
    b.querySelector('[data-go-tpl]').onclick = () => OS.app.go('followups', { tab: 'plantillas' });
  }

  // ---------- Usuarios y roles ----------
  function usuarios(b) {
    if (!OS.auth.can('*') && OS.auth.role()?.id !== 'admin') { b.innerHTML = ui.empty('Solo para administradores', 'Pide a la administradora del consultorio que gestione los usuarios.'); return; }
    const roles = S.data.roles;
    b.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('users')}Usuarios</h3><button class="btn btn-sm btn-primary" id="u-new">${ui.icon('plus')}<span>Nuevo usuario</span></button></div>
      <div class="table-wrap"><table class="tbl cards"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Profesional vinculado</th><th>Estado</th><th></th></tr></thead><tbody>${S.data.users.map((u) => `<tr><td><b>${esc(u.name)}</b></td><td class="mono" data-l="Usuario">${esc(u.username)}</td><td data-l="Rol">${esc(roles.find((r) => r.id === u.roleId)?.name || '—')}</td><td data-l="Profesional">${esc(u.professionalId ? D.profName(u.professionalId) : '—')}</td><td>${ui.badge(u.active ? 'activo' : 'inactivo')}</td><td class="r"><button class="btn btn-sm btn-ghost" data-u="${u.id}">${ui.icon('edit')}<span>Editar</span></button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('shield')}Permisos por rol</h3><button class="btn btn-sm" id="r-new">${ui.icon('plus')}<span>Nuevo rol</span></button></div>
        <div class="table-wrap"><table class="tbl perm-table"><thead><tr><th>Módulo</th>${roles.map((r) => `<th>${esc(r.name)}</th>`).join('')}</tr></thead><tbody>${PERMS.map(([k, l]) => `<tr><td>${l}</td>${roles.map((r) => `<td><input type="checkbox" data-r="${r.id}" data-p="${k}" ${r.permissions.includes('*') || r.permissions.includes(k) ? 'checked' : ''} ${r.id === 'admin' ? 'disabled' : ''} aria-label="${esc(r.name)}: ${l}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="hint">El Administrador siempre tiene acceso total. Los cambios aplican la próxima vez que el usuario navega.</p></section>`;
    b.querySelector('#u-new').onclick = () => userForm();
    b.querySelectorAll('[data-u]').forEach((x) => (x.onclick = () => userForm(S.get('users', x.dataset.u))));
    b.querySelectorAll('[data-r]').forEach((cb) => (cb.onchange = () => { const r = S.data.roles.find((x) => x.id === cb.dataset.r); r.permissions = cb.checked ? [...new Set([...r.permissions, cb.dataset.p])] : r.permissions.filter((p) => p !== cb.dataset.p); S.log('Modificó', 'roles', r.id, `Permiso ${cb.dataset.p} de ${r.name}: ${cb.checked ? 'sí' : 'no'}`); S.changed('roles'); }));
    b.querySelector('#r-new').onclick = () => {
      const m = ui.modal({ title: 'Nuevo rol', size: 'sm', body: `<form id="rnf">${ui.field('Nombre del rol', ui.input('name', '', 'required placeholder="Ej.: Higienista"'))}</form>`, actions: [{ label: 'Crear', kind: 'primary', submit: true, form: 'rnf' }] });
      m.el.querySelector('#rnf').onsubmit = (e) => { e.preventDefault(); const n = U.formData(e.target).name; if (!n) return; S.data.roles.push({ id: U.uid('rol'), name: n, permissions: ['pacientes', 'agenda'] }); S.log('Creó', 'roles', null, `Rol ${n}`); S.changed('roles'); m.markClean(); m.close(true); OS.app.refresh(); };
    };
  }
  function userForm(u) {
    const m = ui.modal({ title: u ? 'Editar usuario' : 'Nuevo usuario', size: 'md',
      body: `<form id="uf2" class="form-grid">${ui.field('Nombre', ui.input('name', u?.name, 'required'), { req: true })}${ui.field('Usuario', ui.input('username', u?.username, u ? 'disabled' : 'required autocomplete="off"'), { req: !u })}
        ${ui.field('Rol', ui.select('roleId', S.data.roles.map((r) => [r.id, r.name]), u?.roleId || 'recepcion'))}${ui.field('Profesional vinculado', ui.select('professionalId', [['', '—'], ...S.data.professionals.map((p) => [p.id, D.profName(p.id)])], u?.professionalId || ''))}
        ${ui.field(u ? 'Nueva contraseña (opcional)' : 'Contraseña', '<input type="password" name="password" id="f-password" autocomplete="new-password" minlength="8">', { hint: 'Mínimo 8 caracteres, con letras y números. Se guarda cifrada.' })}
        ${u ? `<label class="check field"><input type="checkbox" name="active" ${u.active ? 'checked' : ''} ${u.id === OS.auth.current().id ? 'disabled' : ''}><span>Usuario activo</span></label>` : ''}<p class="form-error field span-2" id="uf2-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'uf2' }] });
    m.el.querySelector('#uf2').onsubmit = async (e) => {
      e.preventDefault(); const v = U.formData(e.target); const err = (t) => { const x = m.el.querySelector('#uf2-err'); x.hidden = false; x.textContent = t; };
      try {
        if (u) {
          if (u.roleId === 'admin' && v.roleId !== 'admin' && S.data.users.filter((x) => x.roleId === 'admin' && x.active).length < 2) return err('Debe quedar al menos un administrador activo.');
          S.update('users', u.id, { name: v.name, roleId: v.roleId, professionalId: v.professionalId || null, ...(u.id !== OS.auth.current().id ? { active: v.active } : {}) }, `Usuario ${u.username}`);
          if (v.password) await OS.auth.setPassword(u.id, v.password);
        } else await OS.auth.createUser({ username: v.username, name: v.name, roleId: v.roleId, password: v.password, professionalId: v.professionalId || null });
        m.markClean(); m.close(true); ui.toast('Usuario guardado.'); OS.app.refresh();
      } catch (ex) { err(ex.message); }
    };
  }

  // ---------- Copias de seguridad ----------
  function backup(b) {
    const m = S.data.meta;
    b.innerHTML = `<div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('download')}Backup ahora</h3></div>
      <p>Último backup descargado: <b>${m.lastBackup ? U.fmtDateTime(m.lastBackup) : 'nunca'}</b></p>
      <p class="muted small">Se genera un archivo .json con todos los datos (pacientes, historia clínica, odontogramas, cobros, documentos). Guárdalo en un USB, una carpeta o un disco externo. Contiene información clínica: guárdalo en un lugar seguro.</p>
      <button class="btn btn-primary" id="bk-now">${ui.icon('download')}<span>Backup ahora</span></button></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('upload')}Restaurar copia</h3></div><p class="muted small">Reemplaza todos los datos actuales por los del archivo. Antes de restaurar se guarda una copia interna automática.</p>
        <label class="btn">${ui.icon('upload')}<span>Elegir archivo de backup…</span><input type="file" id="bk-file" accept=".json,application/json" hidden></label></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('refresh')}Backup automático</h3></div>
        <div class="chip-row">${[['diario', 'Diario'], ['semanal', 'Semanal'], ['manual', 'Manual']].map(([k, l]) => `<button class="chip ${m.autoBackup === k ? 'active' : ''}" data-auto="${k}">${l}</button>`).join('')}</div>
        <p class="muted small">${S.hasSnapshots ? 'Guarda copias internas en este equipo (últimas 7) y te recuerda descargar una copia externa. En la versión de escritorio, la copia se escribe además en la carpeta que elijas.' : 'Este entorno no permite copias internas: usa "Backup ahora".'}</p>
        ${(m.snapshots || []).length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Copia interna</th><th>Motivo</th><th></th></tr></thead><tbody>${m.snapshots.map((s) => `<tr><td>${U.fmtDateTime(s.key)}</td><td>${esc(s.reason)}</td><td class="r"><button class="btn btn-sm btn-ghost" data-snap="${s.key}">Restaurar</button></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${S.hasSnapshots ? `<button class="btn btn-sm" id="bk-snap">${ui.icon('plus')}<span>Crear copia interna ahora</span></button>` : ''}</section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('shield')}Dónde están tus datos</h3></div><dl class="kv"><dt>Almacenamiento</dt><dd>${esc(S.adapterName === 'escritorio' ? 'Archivo local de la aplicación de escritorio' : S.adapterName === 'navegador' ? 'Base local del navegador (IndexedDB) en este equipo' : 'Memoria temporal: haz backup antes de cerrar')}</dd><dt>Pacientes</dt><dd>${S.data.patients.length}</dd><dt>Documentos</dt><dd>${S.data.documents.length} (${U.fmtSize(U.sum(S.data.documents, (d) => d.size || 0))})</dd></dl></section></div>`;
    b.querySelector('#bk-now').onclick = async () => { await OS.files.backupNow(); OS.app.refresh(); };
    b.querySelector('#bk-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (!(await ui.confirm({ title: 'Restaurar copia', text: `Se reemplazarán TODOS los datos actuales por los de "${f.name}". ¿Continuar?`, ok: 'Restaurar', kind: 'danger' }))) { e.target.value = ''; return; }
      try { await OS.files.restoreFromFile(f); ui.toast('Copia restaurada. Vuelve a iniciar sesión.'); OS.auth.logout(); OS.app.boot(); } catch (ex) { ui.toast(ex.message, 'danger'); }
    };
    b.querySelectorAll('[data-auto]').forEach((x) => (x.onclick = () => { S.data.meta.autoBackup = x.dataset.auto; S.log('Modificó', 'settings', null, `Backup automático: ${x.dataset.auto}`); S.changed('meta'); OS.app.refresh(); }));
    b.querySelector('#bk-snap')?.addEventListener('click', async () => { await S.snapshot('Manual'); ui.toast('Copia interna creada.'); OS.app.refresh(); });
    b.querySelectorAll('[data-snap]').forEach((x) => (x.onclick = async () => {
      if (!(await ui.confirm({ title: 'Restaurar copia interna', text: `Volverás a los datos del ${U.fmtDateTime(Number(x.dataset.snap))}. Los cambios posteriores se perderán.`, ok: 'Restaurar', kind: 'danger' }))) return;
      const json = await S.readSnapshot(Number(x.dataset.snap)); if (!json) return ui.toast('No se encontró la copia.', 'danger');
      const snaps = S.data.meta.snapshots; await S.replaceAll(JSON.parse(json)); S.data.meta.snapshots = snaps; await S.persistNow();
      ui.toast('Copia interna restaurada. Vuelve a iniciar sesión.'); OS.auth.logout(); OS.app.boot();
    }));
  }

  // ---------- Importar / exportar ----------
  function datos(b) {
    const exports = [
      ['Pacientes', () => [S.data.patients, [{ label: 'Nombre', get: 'firstName' }, { label: 'Apellido', get: 'lastName' }, { label: 'Cédula', get: 'ci' }, { label: 'Teléfono', get: 'phone' }, { label: 'WhatsApp', get: 'whatsapp' }, { label: 'Email', get: 'email' }, { label: 'Nacimiento', get: (p) => U.fmtDate(p.birthDate) }, { label: 'Estado', get: 'status' }]]],
      ['Agenda', () => [S.data.appointments, [{ label: 'Fecha', get: (a) => U.fmtDate(a.date) }, { label: 'Hora', get: 'time' }, { label: 'Paciente', get: (a) => D.patientName(a.patientId) }, { label: 'Tratamiento', get: 'treatment' }, { label: 'Profesional', get: (a) => D.profName(a.professionalId) }, { label: 'Estado', get: 'status' }]]],
      ['Pagos', () => [S.data.payments, [{ label: 'Fecha', get: (p) => U.fmtDate(p.date) }, { label: 'Recibo', get: 'receiptNo' }, { label: 'Paciente', get: (p) => D.patientName(p.patientId) }, { label: 'Método', get: 'method' }, { label: 'Monto', get: (p) => p.amount }]]],
      ['Tratamientos', () => [S.data.quotes.flatMap((q) => q.items.map((i) => ({ q, i }))), [{ label: 'Presupuesto', get: (x) => x.q.number }, { label: 'Paciente', get: (x) => D.patientName(x.q.patientId) }, { label: 'Estado', get: (x) => x.q.status }, { label: 'Pieza', get: (x) => x.i.tooth }, { label: 'Tratamiento', get: (x) => x.i.name }, { label: 'Cantidad', get: (x) => x.i.qty }, { label: 'Precio', get: (x) => x.i.price }, { label: 'Realizado', get: (x) => (x.i.done ? 'Sí' : 'No') }]]],
      ['Inventario', () => [S.data.inventory, [{ label: 'Producto', get: 'name' }, { label: 'Categoría', get: 'category' }, { label: 'Stock', get: 'stock' }, { label: 'Mínimo', get: 'min' }, { label: 'Vencimiento', get: (i) => U.fmtDate(i.expiry) }]]],
    ];
    b.innerHTML = `<div class="grid-2"><section class="panel" style="grid-column:1/-1"><div class="panel-head"><h3>${ui.icon('download')}Historia clínica completa (para leer)</h3></div><p class="muted small">Un solo archivo de Excel con una hoja por tema: pacientes, antecedentes médicos, evolución clínica, odontograma actual, historial por pieza, citas, presupuestos, pagos, recetas y consentimientos. Sirve para leer, imprimir o entregar una copia. <b>No reemplaza al backup</b>: para restaurar la app usá «Copias de seguridad». La ficha completa de un solo paciente en PDF está en su ficha, pestaña Historia clínica.</p><button class="btn btn-primary" id="xl-full">${ui.icon('download')}<span>Descargar historia clínica completa (Excel)</span></button></section><section class="panel"><div class="panel-head"><h3>${ui.icon('download')}Exportar</h3></div><div class="table-wrap"><table class="tbl"><tbody>${exports.map(([n], i) => `<tr><td><b>${n}</b></td><td class="r"><button class="btn btn-sm btn-ghost" data-csv="${i}">CSV</button> <button class="btn btn-sm btn-ghost" data-xls="${i}">Excel</button></td></tr>`).join('')}</tbody></table></div><p class="hint">Los reportes en PDF se generan desde Reportes.</p></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('upload')}Importar pacientes</h3></div><p class="muted small">Desde un archivo CSV (en Excel: Archivo → Guardar como → CSV). El asistente detecta las columnas, te deja relacionarlas y revisa errores antes de importar.</p><button class="btn btn-primary" id="imp">${ui.icon('upload')}<span>Abrir asistente de importación</span></button></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('spark')}Datos de demostración</h3></div>${S.data.meta.demo ? `<p class="muted small">El sistema tiene datos ficticios de ejemplo. Elimínalos antes de cargar pacientes reales. Se conservan usuarios, profesionales, catálogo y configuración.</p><button class="btn btn-danger" id="demo-del">${ui.icon('trash')}<span>Eliminar datos demo</span></button>` : '<p class="muted small">No hay datos demo cargados.</p>'}</section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('alert')}Borrar todo</h3></div><p class="muted small">Elimina toda la información de este equipo y vuelve a la bienvenida. Descarga un backup antes.</p><button class="btn btn-ghost" id="wipe" style="color:var(--danger)">${ui.icon('trash')}<span>Borrar todos los datos</span></button></section></div>`;
    b.querySelectorAll('[data-csv]').forEach((x) => (x.onclick = () => { const [n, fn] = exports[x.dataset.csv]; const [r, c] = fn(); OS.files.exportCSV(`${n.toLowerCase()}_${U.today()}.csv`, r, c); S.log('Exportó', n, null, 'CSV'); }));
    b.querySelectorAll('[data-xls]').forEach((x) => (x.onclick = () => { const [n, fn] = exports[x.dataset.xls]; const [r, c] = fn(); OS.files.exportExcel(`${n.toLowerCase()}_${U.today()}`, r, c, n); S.log('Exportó', n, null, 'Excel'); }));
    b.querySelector('#xl-full').onclick = () => {
      const d = S.data; const pn = (r) => D.patientName(r.patientId); const st = (k) => (D.STATES[k] || {}).label || k || '';
      const yn = (v) => (v ? 'Sí' : 'No');
      const sheets = [
        { name: 'Pacientes', rows: d.patients, cols: [{ label: 'Nombre', get: 'firstName' }, { label: 'Apellido', get: 'lastName' }, { label: 'Cédula', get: 'ci' }, { label: 'Nacimiento', get: (p) => U.fmtDate(p.birthDate) }, { label: 'Teléfono', get: 'phone' }, { label: 'WhatsApp', get: 'whatsapp' }, { label: 'Email', get: 'email' }, { label: 'Dirección', get: 'address' }, { label: 'Saldo', get: (p) => D.balance(p.id).balance }] },
        { name: 'Antecedentes médicos', rows: d.patients, cols: [{ label: 'Paciente', get: (p) => D.fullName(p) }, ...[['allergies', 'Alergias'], ['medications', 'Medicamentos'], ['diseases', 'Enfermedades'], ['background', 'Antecedentes'], ['surgeries', 'Cirugías'], ['other', 'Observaciones']].map(([k, l]) => ({ label: l, get: (p) => (d.medical[p.id] || {})[k] || '' })), ...[['diabetes', 'Diabetes'], ['hypertension', 'Hipertensión'], ['cardio', 'Cardiopatías'], ['coagulation', 'Coagulación'], ['pregnant', 'Embarazo']].map(([k, l]) => ({ label: l, get: (p) => yn((d.medical[p.id] || {})[k]) }))] },
        { name: 'Evolución clínica', rows: [...d.clinicalNotes].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'Fecha', get: (n) => U.fmtDate(n.date) }, { label: 'Paciente', get: pn }, { label: 'Profesional', get: (n) => D.profName(n.professionalId) }, { label: 'Motivo', get: 'reason' }, { label: 'Diagnóstico', get: 'diagnosis' }, { label: 'Procedimiento', get: 'procedure' }, { label: 'Materiales', get: 'materials' }, { label: 'Indicaciones', get: 'indications' }] },
        { name: 'Odontograma actual', rows: d.patients.flatMap((p) => [...D.UPPER, ...D.LOWER].map((t) => ({ p, t, s: D.toothState(p.id, t) })).filter((x) => x.s.whole || Object.keys(x.s.surfaces).length)), cols: [{ label: 'Paciente', get: (x) => D.fullName(x.p) }, { label: 'Pieza', get: (x) => x.t }, { label: 'Estado', get: (x) => [x.s.whole && st(x.s.whole), ...Object.entries(x.s.surfaces).map(([k, v]) => `${st(v)} (${k})`)].filter(Boolean).join(', ') }] },
        { name: 'Historial por pieza', rows: [...d.toothRecords].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'Fecha', get: (r) => U.fmtDate(r.date) }, { label: 'Paciente', get: pn }, { label: 'Pieza', get: 'tooth' }, { label: 'Estado', get: (r) => st(r.state) }, { label: 'Caras', get: (r) => Object.keys(r.surfaces || {}).join(', ') }, { label: 'Detalle', get: 'note' }, { label: 'Profesional', get: (r) => D.profName(r.professionalId) }] },
        { name: 'Citas', rows: [...d.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), cols: [{ label: 'Fecha', get: (a) => U.fmtDate(a.date) }, { label: 'Hora', get: 'time' }, { label: 'Paciente', get: pn }, { label: 'Tratamiento', get: 'treatment' }, { label: 'Profesional', get: (a) => D.profName(a.professionalId) }, { label: 'Estado', get: 'status' }] },
        { name: 'Presupuestos', rows: [...d.quotes].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'N.º', get: 'number' }, { label: 'Fecha', get: (q) => U.fmtDate(q.date) }, { label: 'Paciente', get: pn }, { label: 'Estado', get: (q) => D.quoteStatus(q) }, { label: 'Tratamientos', get: (q) => (q.items || []).map((i) => `${i.tooth ? 'Pieza ' + i.tooth + ': ' : ''}${i.name}`).join('; ') }, { label: 'Total', get: (q) => D.quoteTotals(q).total }, { label: 'Pagado', get: (q) => D.paidFor(q.id) }] },
        { name: 'Pagos', rows: [...d.payments].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'Fecha', get: (p) => U.fmtDate(p.date) }, { label: 'Recibo', get: 'receiptNo' }, { label: 'Paciente', get: pn }, { label: 'Método', get: 'method' }, { label: 'Concepto', get: 'note' }, { label: 'Monto', get: (p) => p.amount }] },
        { name: 'Recetas', rows: [...d.prescriptions].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'Fecha', get: (r) => U.fmtDate(r.date) }, { label: 'N.º', get: 'number' }, { label: 'Paciente', get: pn }, { label: 'Profesional', get: (r) => D.profName(r.professionalId) }, { label: 'Medicamentos', get: (r) => (r.items || []).map((i) => [i.drug, i.presentation, i.dose, i.frequency, i.duration].filter(Boolean).join(' ')).join('; ') }, { label: 'Indicaciones', get: 'indications' }] },
        { name: 'Consentimientos', rows: [...d.consents].sort((a, b) => a.date.localeCompare(b.date)), cols: [{ label: 'Fecha', get: (c) => U.fmtDate(c.date) }, { label: 'N.º', get: 'number' }, { label: 'Paciente', get: pn }, { label: 'Documento', get: 'name' }, { label: 'Firmado', get: (c) => yn(c.signed) }] },
      ];
      OS.files.exportExcelBook(`historia_clinica_completa_${U.today()}`, sheets); S.log('Exportó', 'Historia clínica completa', null, 'Excel');
    };
    b.querySelector('#imp').onclick = importWizard;
    b.querySelector('#demo-del')?.addEventListener('click', async () => { if (await ui.confirm({ title: 'Eliminar datos demo', text: 'Se eliminarán los 10 pacientes ficticios y todo lo relacionado (citas, cobros, odontogramas, inventario y laboratorio de ejemplo).', ok: 'Eliminar datos demo', kind: 'danger' })) { OS.seed.removeDemo(); ui.toast('Datos demo eliminados.'); OS.app.renderShell(); OS.app.go('settings', { tab: 'datos' }, true); } });
    b.querySelector('#wipe').onclick = async () => { if (await ui.confirm({ title: 'Borrar todos los datos', text: 'Esta acción elimina pacientes, historia clínica, cobros, usuarios y configuración de este equipo. No se puede deshacer.', ok: 'Borrar todo', kind: 'danger' })) { OS.auth.logout(); await S.wipe(); OS.app.boot(); } };
  }

  function importWizard() {
    const FIELDS = [['firstName', 'Nombre'], ['lastName', 'Apellido'], ['fullName', 'Nombre completo (se separa)'], ['ci', 'Cédula'], ['phone', 'Teléfono'], ['whatsapp', 'WhatsApp'], ['email', 'Email'], ['birthDate', 'Fecha de nacimiento'], ['address', 'Dirección'], ['notes', 'Observaciones']];
    const guess = (h) => { const n = U.norm(h); return n.includes('apellido') ? 'lastName' : /nombre.*completo|paciente/.test(n) ? 'fullName' : n.includes('nombre') ? 'firstName' : /cedula|^ci$|documento/.test(n) ? 'ci' : n.includes('whats') ? 'whatsapp' : /tel|cel|movil/.test(n) ? 'phone' : n.includes('mail') ? 'email' : /nacim|fecha/.test(n) ? 'birthDate' : /direcc|domic/.test(n) ? 'address' : /obs|nota/.test(n) ? 'notes' : ''; };
    const toISO = (s) => { if (!s) return ''; if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/); if (!m) return ''; const y = m[3].length === 2 ? `19${m[3]}` : m[3]; return `${y}-${U.pad(m[2])}-${U.pad(m[1])}`; };
    let rows = []; let head = []; let map = [];
    const m = ui.modal({ title: 'Importar pacientes', subtitle: 'Paso 1 de 4 · Seleccionar archivo', size: 'xl', guard: false, body: '<div id="iw"></div>' });
    const box = m.el.querySelector('#iw'); const sub = m.el.querySelector('.modal-head p');
    const step1 = () => { sub.textContent = 'Paso 1 de 4 · Seleccionar archivo'; box.innerHTML = `<div class="logo-drop">${ui.icon('upload')}<p>Elige un archivo CSV con una fila de encabezados.</p><label class="btn btn-primary">${ui.icon('upload')}<span>Elegir CSV</span><input type="file" id="iw-f" accept=".csv,text/csv,text/plain" hidden></label></div>`;
      box.querySelector('#iw-f').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; const all = OS.files.parseCSV(await U.readText(f)); if (all.length < 2) return ui.toast('El archivo no tiene filas para importar.', 'warn'); head = all[0]; rows = all.slice(1); map = head.map(guess); step2(); }; };
    const step2 = () => { sub.textContent = `Paso 2 y 3 de 4 · Detectamos ${head.length} columnas y ${rows.length} filas. Relaciona los campos.`;
      box.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th>Columna del archivo</th><th>Ejemplo</th><th>Campo en ODONTO SMART</th></tr></thead><tbody>${head.map((h, i) => `<tr><td><b>${esc(h)}</b></td><td class="muted">${esc(rows[0][i] || '')}</td><td><select data-i="${i}"><option value="">— No importar —</option>${FIELDS.map(([k, l]) => `<option value="${k}" ${map[i] === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><div class="row gap"><button class="btn btn-ghost" id="iw-b">Atrás</button><button class="btn btn-primary right" id="iw-n">Revisar datos</button></div>`;
      box.querySelectorAll('[data-i]').forEach((s) => (s.onchange = () => { map[s.dataset.i] = s.value; }));
      box.querySelector('#iw-b').onclick = step1; box.querySelector('#iw-n').onclick = step3; };
    const build = () => rows.map((r, n) => { const o = { _row: n + 2 }; map.forEach((k, i) => { if (k) o[k] = (r[i] || '').trim(); }); if (o.fullName && !o.firstName) { const parts = o.fullName.split(/\s+/); o.firstName = parts.shift() || ''; o.lastName = o.lastName || parts.join(' '); } delete o.fullName; o.birthDate = toISO(o.birthDate); const errs = []; if (!o.firstName) errs.push('sin nombre'); if (o.ci && S.data.patients.some((p) => p.ci === o.ci)) errs.push('cédula ya existe'); if (o.email && !/^\S+@\S+\.\S+$/.test(o.email)) errs.push('email inválido'); return { o, errs }; });
    const step3 = () => { const list = build(); const ok = list.filter((x) => !x.errs.length); sub.textContent = `Paso 4 de 4 · ${ok.length} filas listas, ${list.length - ok.length} con errores`;
      box.innerHTML = `<div class="table-wrap" style="max-height:50vh"><table class="tbl"><thead><tr><th>Fila</th><th>Nombre</th><th>Apellido</th><th>Cédula</th><th>Teléfono</th><th>Revisión</th></tr></thead><tbody>${list.map(({ o, errs }) => `<tr><td>${o._row}</td><td>${esc(o.firstName || '')}</td><td>${esc(o.lastName || '')}</td><td>${esc(o.ci || '')}</td><td>${esc(o.phone || o.whatsapp || '')}</td><td>${errs.length ? `<span class="badge badge-danger">✕ ${esc(errs.join(', '))}</span>` : '<span class="badge badge-ok">✓ OK</span>'}</td></tr>`).join('')}</tbody></table></div>
        <div class="row gap"><button class="btn btn-ghost" id="iw-b">Atrás</button><button class="btn btn-primary right" id="iw-go" ${ok.length ? '' : 'disabled'}>${ui.icon('check')}<span>Importar ${ok.length} pacientes</span></button></div>`;
      box.querySelector('#iw-b').onclick = step2;
      box.querySelector('#iw-go').onclick = () => { ok.forEach(({ o }) => { delete o._row; S.insert('patients', { lastName: '', status: 'activo', professionalId: S.data.professionals[0]?.id || '', whatsapp: o.whatsapp || o.phone || '', ...o }); }); S.log('Importó', 'patients', null, `${ok.length} pacientes desde CSV`); S.changed('patients'); m.close(true); ui.toast(`${ok.length} pacientes importados.`); OS.app.go('patients'); }; };
    step1();
  }

  // ---------- Apariencia y seguridad ----------
  function apariencia(b) {
    const st = S.data.settings;
    b.innerHTML = `<div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('sun')}Tema</h3></div><div class="chip-row">${[['light', '☀️ Claro'], ['dark', '🌙 Oscuro'], ['system', 'Según el sistema']].map(([k, l]) => `<button class="chip ${st.theme === k ? 'active' : ''}" data-th="${k}">${l}</button>`).join('')}</div>
      <h3 style="margin-top:8px">Tamaño de letra</h3><div class="chip-row">${[[0.92, 'Compacto'], [1, 'Normal'], [1.1, 'Grande'], [1.2, 'Muy grande']].map(([k, l]) => `<button class="chip ${Number(st.fontScale) === k ? 'active' : ''}" data-fs="${k}">${l}</button>`).join('')}</div></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('lock')}Bloqueo automático</h3></div><p class="muted small">La sesión se bloquea tras un período sin actividad y pide la contraseña.</p><div class="chip-row">${[[5, '5 min'], [15, '15 min'], [30, '30 min'], [60, '1 hora'], [0, 'Nunca']].map(([k, l]) => `<button class="chip ${Number(st.autoLockMin) === k ? 'active' : ''}" data-lk="${k}">${l}</button>`).join('')}</div>
        <h3 style="margin-top:8px">Mi contraseña</h3><form id="pw" class="form-grid">${ui.field('Nueva contraseña', '<input type="password" name="p1" id="f-p1" autocomplete="new-password" minlength="6" required>')}${ui.field('Repetir', '<input type="password" name="p2" id="f-p2" autocomplete="new-password" required>')}<button class="btn" type="submit">Cambiar contraseña</button></form>
        <h3 style="margin-top:8px">Código de recuperación</h3><p class="muted small">Sirve para crear una contraseña nueva si olvidas la actual. Al generar uno nuevo, el anterior deja de servir.</p><button class="btn btn-sm" id="rc-new">${ui.icon('refresh')}<span>Generar nuevo código</span></button></section></div>`;
    b.querySelectorAll('[data-th]').forEach((x) => (x.onclick = () => { st.theme = x.dataset.th; S.changed('settings'); OS.app.applyTheme(); OS.app.renderShell(); OS.app.go('settings', { tab: 'apariencia' }, true); }));
    b.querySelectorAll('[data-fs]').forEach((x) => (x.onclick = () => { st.fontScale = Number(x.dataset.fs); S.changed('settings'); OS.app.applyTheme(); OS.app.refresh(); }));
    b.querySelectorAll('[data-lk]').forEach((x) => (x.onclick = () => { st.autoLockMin = Number(x.dataset.lk); S.log('Modificó', 'settings', null, `Bloqueo automático: ${x.dataset.lk} min`); S.changed('settings'); OS.auth.armIdle(); OS.app.refresh(); }));
    b.querySelector('#rc-new').onclick = async () => { const code = await OS.auth.setRecoveryCode(OS.auth.current().id); showRecoveryCode(code); };
    b.querySelector('#pw').onsubmit = async (e) => { e.preventDefault(); const v = U.formData(e.target); if (v.p1 !== v.p2) return ui.toast('Las contraseñas no coinciden.', 'warn'); try { await OS.auth.setPassword(OS.auth.current().id, v.p1); e.target.reset(); ui.toast('Contraseña actualizada.'); } catch (ex) { ui.toast(ex.message, 'warn'); } };
  }

  // ---------- Auditoría ----------
  function auditoria(b) {
    const q = OS.app.current.params.q || '';
    const list = S.data.audit.filter((a) => !q || U.norm(`${a.userName} ${a.action} ${a.detail}`).includes(U.norm(q))).slice(0, 300);
    b.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('shield')}Registro de actividad</h3><div class="search" style="max-width:300px">${ui.icon('search')}<input id="au-q" placeholder="Filtrar por usuario o acción" value="${esc(q)}"></div></div>
      <div class="table-wrap"><table class="tbl cards"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${list.map((a) => `<tr><td class="nowrap mono" data-l="Fecha">${U.fmtDateTime(a.date)}</td><td data-l="Usuario">${esc(a.userName)}</td><td data-l="Acción"><b>${esc(a.action)}</b></td><td>${esc(a.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Sin registros.</td></tr>'}</tbody></table></div>
      <button class="btn btn-ghost btn-sm" id="au-exp">${ui.icon('download')}<span>Exportar auditoría (CSV)</span></button></section>`;
    b.querySelector('#au-q').addEventListener('change', (e) => OS.app.refresh({ q: e.target.value }));
    b.querySelector('#au-exp').onclick = () => OS.files.exportCSV(`auditoria_${U.today()}.csv`, S.data.audit, [{ label: 'Fecha', get: (a) => U.fmtDateTime(a.date) }, { label: 'Usuario', get: 'userName' }, { label: 'Acción', get: 'action' }, { label: 'Entidad', get: 'entity' }, { label: 'Detalle', get: 'detail' }]);
  }

  // ---------- Privacidad ----------
  function privacidad(b) {
    const c = S.data.clinic;
    b.innerHTML = `<section class="panel" style="max-width:820px"><h3>${ui.icon('shield')} Aviso de privacidad (borrador editable)</h3>
      <p>${esc(c.name || 'El consultorio')} trata los datos personales y de salud de sus pacientes con la finalidad exclusiva de brindar atención odontológica, gestionar turnos, presupuestos y cobros, y cumplir obligaciones legales. Los datos se almacenan en los equipos del consultorio, con acceso restringido por usuario y contraseña, registro de actividad y copias de seguridad.</p>
      <p>El paciente puede solicitar el acceso, la rectificación o la actualización de sus datos dirigiéndose al consultorio${c.email ? ` (${esc(c.email)})` : ''}. Las imágenes clínicas solo se usan con fines distintos a la atención si el paciente lo autoriza por escrito (ver consentimiento "Uso de imágenes").</p>
      <p class="note note-warn">${ui.icon('alert')}<span>Este texto es un punto de partida. ODONTO SMART no está certificado ni aprobado por ninguna autoridad. Verifica con un asesor legal la normativa vigente en Paraguay sobre datos personales, datos de salud y conservación de historias clínicas.</span></p>
      <h3>Medidas incluidas en el sistema</h3><ul class="list-plain small"><li>• Contraseñas cifradas con PBKDF2-SHA256 y sal aleatoria; nunca en texto plano.</li><li>• Roles y permisos por módulo; bloqueo automático por inactividad.</li><li>• Registro de auditoría de altas, cambios, exportaciones y accesos.</li><li>• Datos guardados solo en este equipo; ninguna función principal envía información a Internet.</li><li>• El asistente de IA es opcional y solo envía lo que el profesional decide, previa confirmación.</li></ul>
      <p class="muted small">Pendiente para la versión de escritorio: cifrado de la base de datos en reposo (SQLCipher) y del archivo de backup con contraseña.</p></section>`;
  }

  // ---------- Acceso móvil ----------
  function mobile(b) {
    b.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('phone')}ODONTO SMART MOBILE</h3>${ui.badge('borrador', 'Fase 3 · no disponible en esta versión')}</div>
      <p>La computadora del consultorio es la fuente principal de datos. El acceso desde el teléfono se resolverá sin "conexiones mágicas":</p>
      <div class="arch-diagram">  Teléfono (navegador)                 PC del consultorio (ODONTO SMART.exe)
  ───────────────────────              ──────────────────────────────────────────
  https://192.168.x.x:4580  ──Wi-Fi──▶ Servidor local HTTPS (solo lectura en Fase 3a)
  emparejado con código QR             ├─ Autenticación por usuario + token de dispositivo
  vista móvil: agenda, pacientes,      ├─ API REST mínima (agenda, pacientes, saldos)
  saldos, presupuestos, WhatsApp       └─ SQLite local (nunca expuesto directamente)

  Fase 3b (opcional): sincronización cifrada de extremo a extremo con un servidor
  propio para consultar desde fuera del consultorio.</div>
      <ul class="list-plain small"><li>• <b>Opción A (prioridad):</b> servidor local dentro de la red Wi-Fi del consultorio, cifrado TLS con certificado propio, emparejamiento por QR y permisos por usuario.</li><li>• <b>Opción B:</b> sincronización cifrada con una cuenta. Requiere servidor, costos de hosting y políticas de privacidad adicionales.</li><li>• <b>Opción C:</b> aplicación web móvil contra una API segura (misma API de la opción A expuesta con VPN o túnel autenticado).</li></ul>
      <p class="note note-info">${ui.icon('alert')}<span>Hoy ya puedes abrir esta misma aplicación en el navegador del teléfono: la interfaz se adapta a pantallas pequeñas. Los datos de cada dispositivo son independientes hasta que exista la sincronización.</span></p></section>`;
  }

  // ---------- Licencia y planes ----------
  function licencia(b) {
    const cur = OS.license.current.lic?.p;
    const pc = OS.license.canAddProfessional();
    b.innerHTML = `${OS.license.panel()}<section class="panel"><div class="panel-head"><h3>${ui.icon('star')}Qué incluye tu ODONTO SMART</h3></div>
      <ul class="list-plain"><li>✓ Hasta ${pc.max === Infinity ? 'ilimitados' : pc.max} profesionales (${pc.active} activos)</li><li>✓ Pacientes ilimitados, odontograma, periodontograma y fotos antes/después</li><li>✓ Presupuestos en PDF, cobros, cuotas y recibos</li><li>✓ Agenda, mensajes de WhatsApp y seguimiento de pacientes</li><li>✓ Inventario, laboratorio, reportes, copias de seguridad y funcionamiento sin internet</li></ul>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="${OS.license.waLink('Hola, quiero renovar o ampliar mi ODONTO SMART (más profesionales).')}">${ui.icon('whatsapp')}<span>Renovar o agregar profesionales</span></a></section>`;
    OS.license.wirePanel(b);
  }

  /** Muestra un código de recuperación una sola vez, con copia y descarga. */
  function showRecoveryCode(code, onDone) {
    const u = OS.auth.current();
    const m = ui.modal({ title: 'Tu código de recuperación', size: 'sm', guard: false, onClose: () => onDone?.(),
      body: `<p class="small">Si olvidas la contraseña, este código te permite crear una nueva. <b>Se muestra una sola vez</b>: guárdalo en un lugar seguro, fuera de esta computadora si puedes.</p>
        <div class="codebox mono">${esc(code)}</div><div class="row gap"><button class="btn btn-sm" id="rc-cp">${ui.icon('copy')}<span>Copiar</span></button><button class="btn btn-sm" id="rc-dl">${ui.icon('download')}<span>Descargar como archivo</span></button></div>`,
      actions: [{ label: 'Ya lo guardé', kind: 'primary', close: true }] });
    m.el.querySelector('#rc-cp').onclick = async () => { try { await navigator.clipboard.writeText(code); ui.toast('Código copiado.'); } catch { ui.toast('Selecciona el código y cópialo con Ctrl+C.', 'warn'); } };
    m.el.querySelector('#rc-dl').onclick = () => OS.files.save('codigo-recuperacion-odontosmart.txt', `ODONTO SMART — código de recuperación\nUsuario: ${u?.username || ''}\nCódigo: ${code}\n\nGuárdalo en un lugar seguro. No lo compartas.\n`, 'text/plain');
  }

  return { render, importWizard, showRecoveryCode, perm: 'config' };
})();
