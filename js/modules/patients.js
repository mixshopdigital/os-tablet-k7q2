/* ODONTO SMART — Pacientes: listado con filtros y alta/edición. */
OS.views.patients = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const FILTERS = [['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos'], ['nuevos', 'Nuevos'], ['deuda', 'Con deuda'], ['control', 'Próximo control'], ['sin_cita', 'Sin próxima cita']];

  function rows(filter, q, prof) {
    const t = U.today();
    return S.data.patients.map((p) => ({ p, last: D.lastVisit(p.id), next: D.nextAppt(p.id), bal: D.balance(p.id).balance, quote: D.quotesOf(p.id).filter((x) => x.status === 'aceptado').pop() }))
      .filter(({ p, last, next, bal }) => {
        if (q && !U.norm(`${p.firstName} ${p.lastName} ${p.ci} ${p.phone} ${p.whatsapp}`).replace(/\s/g, '').includes(U.norm(q).replace(/\s/g, ''))) return false;
        if (prof && p.professionalId !== prof) return false;
        switch (filter) {
          case 'activos': return p.status !== 'inactivo';
          case 'inactivos': return p.status === 'inactivo';
          case 'nuevos': return D.isNew(p);
          case 'deuda': return bal > 0;
          case 'control': return last && U.addMonths(last, 6) <= U.addDays(t, 30) && !next;
          case 'sin_cita': return p.status !== 'inactivo' && !next;
          default: return true;
        }
      }).sort((a, b) => a.p.firstName.localeCompare(b.p.firstName) || a.p.lastName.localeCompare(b.p.lastName));
  }

  function render(el, params) {
    const filter = params.filter || 'todos'; const prof = params.prof || '';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Pacientes</span><h1>Pacientes del consultorio</h1><p>${S.data.patients.length} registrados · ${S.data.patients.filter((p) => p.status !== 'inactivo').length} activos</p></div>
      <div class="page-actions">${OS.auth.can('config') ? `<button class="btn btn-ghost" id="p-imp">${ui.icon('upload')}<span>Importar</span></button>` : ''}<button class="btn btn-ghost" id="p-exp">${ui.icon('download')}<span>Exportar</span></button><button class="btn btn-primary" id="p-new">${ui.icon('plus')}<span>Nuevo paciente</span></button></div></div>
      <div class="toolbar"><div class="search">${ui.icon('search')}<input id="p-q" type="search" placeholder="Buscar paciente, cédula o teléfono" value="${esc(params.q || '')}" aria-label="Buscar paciente"></div>
        <select id="p-prof" style="max-width:220px" aria-label="Filtrar por profesional"><option value="">Todos los profesionales</option>${S.data.professionals.map((x) => `<option value="${x.id}" ${x.id === prof ? 'selected' : ''}>${esc(D.profName(x.id))}</option>`).join('')}</select></div>
      <div class="chip-row" id="p-filters">${FILTERS.map(([k, l]) => `<button class="chip ${k === filter ? 'active' : ''}" data-f="${k}">${l}<b>${rows(k, '', prof).length}</b></button>`).join('')}</div>
      <div id="p-table"></div>`;
    const draw = () => {
      const list = rows(filter, el.querySelector('#p-q').value.trim(), prof);
      el.querySelector('#p-table').innerHTML = list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Paciente</th><th>Cédula</th><th>Teléfono</th><th class="hide-sm">Última visita</th><th>Próxima cita</th><th class="hide-sm">Tratamiento</th><th class="r">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>
        ${list.map(({ p, last, next, bal, quote }) => `<tr class="click" data-id="${p.id}"><td><div class="cell-person">${ui.avatar(D.fullName(p), p.photo, 34)}<span><b>${esc(D.fullName(p))}</b><small>${p.birthDate ? `${U.age(p.birthDate)} años` : ''}${p.demo ? ' · demo' : ''}</small></span></div></td>
          <td data-l="CI" class="num">${esc(p.ci || '—')}</td><td data-l="Tel." class="nowrap">${esc(U.prettyPhone(p.phone))}</td><td data-l="Última visita" class="hide-sm">${U.fmtDate(last)}</td>
          <td data-l="Próxima cita">${next ? `${U.fmtDate(next.date)} ${next.time}` : '<span class="muted">Sin cita</span>'}</td><td class="hide-sm" data-l="Tratamiento">${esc(quote?.items.find((i) => !i.done)?.name || '—')}</td>
          <td data-l="Saldo" class="r ${bal > 0 ? 'money-pos' : ''}">${OS.auth.can('cobros') ? U.money(bal) : '—'}</td><td>${ui.badge(p.status === 'inactivo' ? 'inactivo' : D.isNew(p) ? 'nuevo' : 'activo')}</td>
          <td class="r" data-stop>${OS.wa.button(p.id, { label: 'WhatsApp', small: true })}</td></tr>`).join('')}</tbody></table></div>`
        : ui.empty('No encontramos pacientes', 'Cambia el filtro o crea un paciente nuevo.', '<button class="btn btn-primary" id="p-new2">Nuevo paciente</button>');
      el.querySelector('#p-new2')?.addEventListener('click', () => form());
    };
    draw();
    el.querySelector('#p-q').addEventListener('input', U.debounce(draw, 120));
    el.querySelector('#p-prof').onchange = (e) => OS.app.refresh({ prof: e.target.value });
    el.querySelector('#p-filters').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) OS.app.refresh({ filter: b.dataset.f, q: el.querySelector('#p-q').value }); };
    el.querySelector('#p-table').addEventListener('click', (e) => { if (e.target.closest('[data-stop]')) return; const r = e.target.closest('[data-id]'); if (r) OS.app.go('patient', { id: r.dataset.id }); });
    el.querySelector('#p-new').onclick = () => form();
    el.querySelector('#p-exp').onclick = exportMenu;
    el.querySelector('#p-imp')?.addEventListener('click', () => OS.views.settings.importWizard());
  }

  function exportMenu() {
    const cols = [{ label: 'Nombre', get: 'firstName' }, { label: 'Apellido', get: 'lastName' }, { label: 'Cédula', get: 'ci' }, { label: 'Fecha de nacimiento', get: (p) => U.fmtDate(p.birthDate) }, { label: 'Teléfono', get: 'phone' }, { label: 'WhatsApp', get: 'whatsapp' }, { label: 'Email', get: 'email' }, { label: 'Dirección', get: 'address' }, { label: 'Estado', get: 'status' }, { label: 'Última visita', get: (p) => U.fmtDate(D.lastVisit(p.id)) }, { label: 'Saldo', get: (p) => D.balance(p.id).balance }];
    const m = ui.modal({ title: 'Exportar pacientes', size: 'sm', guard: false, body: '<p class="muted">Incluye datos de contacto, última visita y saldo.</p>', actions: [{ label: 'CSV', kind: 'ghost', id: 'x-csv', icon: 'download' }, { label: 'Excel', kind: 'primary', id: 'x-xls', icon: 'download' }] });
    m.el.querySelector('#x-csv').onclick = () => { OS.files.exportCSV(`pacientes_${U.today()}.csv`, S.data.patients, cols); S.log('Exportó', 'patients', null, 'Pacientes CSV'); m.close(true); };
    m.el.querySelector('#x-xls').onclick = () => { OS.files.exportExcel(`pacientes_${U.today()}`, S.data.patients, cols, 'Pacientes'); S.log('Exportó', 'patients', null, 'Pacientes Excel'); m.close(true); };
  }

  /** Alta / edición de paciente. onSaved(paciente) opcional. */
  function form(p = null, onSaved) {
    const v = p || { status: 'activo', professionalId: OS.auth.current()?.professionalId || S.data.professionals[0]?.id || '' };
    const m = ui.modal({
      title: p ? 'Editar paciente' : 'Nuevo paciente', size: 'lg',
      body: `<form id="pf" class="form-sections" novalidate>
        <div class="form-section"><h4>Datos personales</h4><div class="form-grid cols-3">
          ${ui.field('Nombre', ui.input('firstName', v.firstName, 'required autocomplete="off"'), { req: true })}${ui.field('Apellido', ui.input('lastName', v.lastName, 'required autocomplete="off"'), { req: true })}${ui.field('Cédula', ui.input('ci', v.ci, 'inputmode="numeric"'))}
          ${ui.field('Fecha de nacimiento', ui.input('birthDate', v.birthDate, 'type="date"'))}${ui.field('Sexo', ui.select('sex', [['', '—'], ['F', 'Femenino'], ['M', 'Masculino'], ['X', 'Otro']], v.sex))}${ui.field('Ocupación', ui.input('occupation', v.occupation))}</div></div>
        <div class="form-section"><h4>Contacto</h4><div class="form-grid cols-3">
          ${ui.field('Teléfono', ui.input('phone', v.phone, 'inputmode="tel" placeholder="0981 123 456"'))}${ui.field('WhatsApp', ui.input('whatsapp', v.whatsapp, 'inputmode="tel"'), { hint: 'Si lo dejas vacío se usa el teléfono.' })}${ui.field('Email', ui.input('email', v.email, 'type="email"'))}
          ${ui.field('Dirección', ui.input('address', v.address), { span: 3 })}</div></div>
        <div class="form-section"><h4>Consultorio</h4><div class="form-grid cols-3">
          ${ui.field('Profesional a cargo', ui.select('professionalId', S.data.professionals.map((x) => [x.id, D.profName(x.id)]), v.professionalId))}${ui.field('Estado', ui.select('status', [['activo', 'Activo'], ['inactivo', 'Inactivo']], v.status))}
          ${ui.field('Foto', '<input type="file" name="photoFile" id="f-photoFile" accept="image/*">')}${ui.field('Observaciones', ui.textarea('notes', v.notes, 'rows="2"'), { span: 3 })}</div></div>
        <p class="form-error" id="pf-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: p ? 'Guardar cambios' : 'Crear paciente', kind: 'primary', submit: true, form: 'pf', icon: 'check' }],
    });
    const f = m.el.querySelector('#pf');
    f.onsubmit = async (e) => {
      e.preventDefault();
      const d = U.formData(f); delete d.photoFile;
      const err = (t) => { const x = m.el.querySelector('#pf-err'); x.hidden = false; x.textContent = t; };
      if (!d.firstName || !d.lastName) return err('Escribe nombre y apellido del paciente.');
      if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) return err('El email no parece válido.');
      if (d.birthDate && d.birthDate > U.today()) return err('La fecha de nacimiento no puede ser futura.');
      if (d.ci && S.data.patients.some((x) => x.ci === d.ci && x.id !== p?.id)) return err(`Ya existe un paciente con la cédula ${d.ci}.`);
      if (!d.whatsapp) d.whatsapp = d.phone;
      const file = f.querySelector('#f-photoFile').files[0];
      if (file) { if (file.size > 3 * 1024 * 1024) return err('La foto supera 3 MB.'); d.photo = await U.toPng(await U.readFile(file), 240); }
      let rec;
      if (p) rec = S.update('patients', p.id, d, `Datos de ${d.firstName} ${d.lastName}`);
      else { rec = S.insert('patients', d, `Paciente ${d.firstName} ${d.lastName}`); S.notify('paciente', `Nuevo paciente: ${d.firstName} ${d.lastName}`, ['patient', { id: rec.id }]); }
      m.markClean(); m.close(true);
      ui.toast(p ? 'Datos del paciente actualizados.' : `${d.firstName} ${d.lastName} fue registrado.`);
      if (onSaved) onSaved(rec); else if (!p) OS.app.go('patient', { id: rec.id }); else OS.app.refresh();
    };
  }

  return { render, form, perm: 'pacientes' };
})();
