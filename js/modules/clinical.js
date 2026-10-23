/* ODONTO SMART — Historia clínica (antecedentes médicos) y evolución clínica. */
OS.views.clinical = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  // Vista del menú: pacientes con alertas médicas y últimas evoluciones.
  function render(el) {
    const withAlerts = S.data.patients.filter((p) => D.medicalAlerts(p.id).length);
    const notes = S.data.clinicalNotes.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Historia clínica</span><h1>Expedientes clínicos</h1><p>Antecedentes, alertas y evolución de cada paciente.</p></div>
      <div class="page-actions"><button class="btn btn-primary" id="c-open">${ui.icon('clinical')}<span>Abrir historia de un paciente</span></button></div></div>
      <div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('alert')}Pacientes con alertas médicas</h3></div>
        ${withAlerts.length ? `<div class="pp-list" style="max-height:none">${withAlerts.map((p) => `<button class="pp-item" data-id="${p.id}" data-tab="historia">${ui.avatar(D.fullName(p), p.photo, 32)}<span><b>${esc(D.fullName(p))}</b><small>${D.medicalAlerts(p.id).map((a) => `${a.type}: ${a.text}`).map(esc).join(' · ')}</small></span></button>`).join('')}</div>` : '<p class="muted">Ningún paciente tiene alertas registradas.</p>'}</section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('clock')}Últimas evoluciones</h3></div>
        ${notes.length ? `<div class="timeline">${notes.map((n) => `<div class="tl-item"><span class="tl-date">${U.fmtDate(n.date)} · ${esc(D.profName(n.professionalId))}</span><button class="link" data-id="${n.patientId}" data-tab="evolucion" style="text-align:left">${esc(D.patientName(n.patientId))}</button><span class="small">${esc(n.reason)}${n.procedure ? ` — ${esc(n.procedure)}` : ''}</span></div>`).join('')}</div>` : '<p class="muted">Sin evoluciones.</p>'}</section></div>`;
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) OS.app.go('patient', { id: b.dataset.id, tab: b.dataset.tab }); });
    el.querySelector('#c-open').onclick = async () => { const id = await OS.app.pickPatient('Historia clínica de…'); if (id) OS.app.go('patient', { id, tab: 'historia' }); };
  }

  // Formulario de antecedentes dentro de la ficha.
  function historyFor(el, pid) {
    const m = S.data.medical[pid] || {}; const can = OS.auth.can('clinica');
    const flags = [['diabetes', 'Diabetes'], ['hypertension', 'Hipertensión'], ['cardio', 'Cardiopatías'], ['coagulation', 'Problemas de coagulación'], ['pregnant', 'Embarazo']];
    el.innerHTML = `<form id="mh" class="panel"><div class="panel-head"><h3>${ui.icon('clinical')}Datos médicos</h3><span class="muted small">${m.updatedAt ? `Actualizado ${U.fmtDateTime(m.updatedAt)}` : 'Sin datos cargados'}</span></div>
      <div class="form-section"><h4>Alertas importantes</h4><div class="form-grid">
        ${ui.field('Alergias', ui.textarea('allergies', m.allergies, 'rows="2" placeholder="Ej.: Penicilina, látex"'), { hint: 'Se muestra como ⚠ ALERGIA en la ficha.' })}
        ${ui.field('Medicamentos actuales', ui.textarea('medications', m.medications, 'rows="2"'), { hint: 'Se muestra como ⚠ MEDICACIÓN.' })}</div></div>
      <div class="form-section"><h4>Condiciones</h4><div class="checks">${flags.map(([k, l]) => `<label class="check"><input type="checkbox" name="${k}" ${m[k] ? 'checked' : ''} ${can ? '' : 'disabled'}><span>${l}</span></label>`).join('')}</div></div>
      <div class="form-section"><h4>Antecedentes</h4><div class="form-grid">
        ${ui.field('Enfermedades', ui.textarea('diseases', m.diseases, 'rows="2"'))}${ui.field('Antecedentes', ui.textarea('background', m.background, 'rows="2"'))}
        ${ui.field('Cirugías', ui.textarea('surgeries', m.surgeries, 'rows="2"'))}${ui.field('Otras observaciones', ui.textarea('other', m.other, 'rows="2"'))}</div></div>
      ${can ? `<div class="row gap"><span class="muted small" id="mh-state"></span><button class="btn btn-ghost right" type="button" id="mh-pdf">${ui.icon('download')}<span>Historia clínica PDF</span></button><button class="btn btn-primary" type="submit">${ui.icon('check')}<span>Guardar historia clínica</span></button></div>` : ''}</form>`;
    const f = el.querySelector('#mh');
    if (!can) f.querySelectorAll('textarea').forEach((t) => (t.readOnly = true));
    el.querySelector('#mh-pdf')?.addEventListener('click', () => OS.pdf.present(OS.pdf.historyModel(pid), { patientId: pid, category: 'Estudios' }));
    f.addEventListener('input', () => { const st = el.querySelector('#mh-state'); if (st) st.textContent = 'Cambios sin guardar'; });
    f.onsubmit = (e) => {
      e.preventDefault(); const v = U.formData(f);
      S.data.medical[pid] = { ...v, updatedAt: Date.now() };
      S.log('Modificó', 'medical_history', pid, `Historia clínica de ${D.patientName(pid)}`); S.changed('medical');
      ui.toast('Historia clínica guardada.'); OS.app.refresh();
    };
  }

  // Evolución clínica (línea de tiempo).
  function evolutionFor(el, pid) {
    const notes = S.data.clinicalNotes.filter((n) => n.patientId === pid).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
    const docs = (n) => S.data.documents.filter((d) => d.noteId === n.id);
    el.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('clock')}Evolución clínica</h3>${OS.auth.can('clinica') ? `<button class="btn btn-primary btn-sm" id="ev-new">${ui.icon('plus')}<span>Nueva evolución</span></button>` : ''}</div>
      ${notes.length ? `<div class="timeline">${notes.map((n) => `<article class="tl-item"><span class="tl-date">${U.fmtDate(n.date)} · ${esc(D.profName(n.professionalId))}</span><b>${esc(n.reason)}</b>
        <dl>${[['Diagnóstico', n.diagnosis], ['Procedimiento', n.procedure], ['Observaciones', n.observations], ['Indicaciones', n.indications], ['Materiales', n.materials]].filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
        ${docs(n).length ? `<div class="row gap wrap">${docs(n).map((d) => `<button class="btn btn-sm btn-ghost" data-doc="${d.id}">${ui.icon('image')}<span>${esc(d.name)}</span></button>`).join('')}</div>` : ''}
        ${OS.auth.can('clinica') ? `<div><button class="link small" data-edit="${n.id}">Editar</button></div>` : ''}</article>`).join('')}</div>` : ui.empty('Sin evolución registrada', 'Registra la primera consulta del paciente.')}</section>`;
    el.querySelector('#ev-new')?.addEventListener('click', () => form({ patientId: pid }, () => OS.app.refresh()));
    el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(S.get('clinicalNotes', b.dataset.edit), () => OS.app.refresh())));
    el.querySelectorAll('[data-doc]').forEach((b) => (b.onclick = () => OS.views.documents.view(b.dataset.doc)));
  }

  /** Formulario de evolución. Desde la agenda llega con appointmentId y motivo precargados. */
  function form(n, onSaved) {
    const isNew = !n.id; const pid = n.patientId; const me = OS.auth.current();
    const v = { date: U.today(), professionalId: me?.professionalId || S.data.professionals[0]?.id, ...n };
    const plan = D.quotesOf(pid).filter((q) => q.status === 'aceptado').flatMap((q) => q.items.filter((i) => !i.done).map((i) => ({ q, i })));
    const m = ui.modal({
      title: isNew ? 'Nueva evolución' : 'Editar evolución', subtitle: esc(D.patientName(pid)), size: 'lg',
      body: `<form id="evf" class="form-sections"><div class="form-section"><div class="form-grid cols-3">
        ${ui.field('Fecha', ui.input('date', v.date, 'type="date" required'))}${ui.field('Profesional', ui.select('professionalId', S.data.professionals.map((p) => [p.id, D.profName(p.id)]), v.professionalId))}${ui.field('Motivo', ui.input('reason', v.reason, 'required'), { req: true })}</div></div>
        <div class="form-section"><div class="form-grid">${ui.field('Diagnóstico', ui.textarea('diagnosis', v.diagnosis, 'rows="2"'))}${ui.field('Procedimiento', ui.textarea('procedure', v.procedure, 'rows="2"'))}
          ${ui.field('Observaciones', ui.textarea('observations', v.observations, 'rows="2"'))}${ui.field('Indicaciones', ui.textarea('indications', v.indications, 'rows="2"'))}
          ${ui.field('Materiales utilizados', ui.input('materials', v.materials))}${ui.field('Fotografías o documentos', '<input type="file" id="ev-files" multiple accept="image/*,application/pdf">')}</div></div>
        ${isNew && plan.length ? `<div class="form-section"><h4>Tratamientos del plan realizados en esta sesión</h4><div class="checks">${plan.map(({ q, i }) => `<label class="check"><input type="checkbox" name="done" data-multi="1" value="${q.id}|${i.id}"><span>${esc(i.name)}${i.tooth ? ` · ${esc(i.tooth)}` : ''}</span></label>`).join('')}</div></div>` : ''}
        <p class="form-error" id="ev-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar evolución', kind: 'primary', submit: true, form: 'evf', icon: 'check' }],
    });
    m.el.querySelector('#evf').onsubmit = async (e) => {
      e.preventDefault(); const d = U.formData(e.target); const doneItems = d.done || []; delete d.done;
      if (!d.reason) { const x = m.el.querySelector('#ev-err'); x.hidden = false; x.textContent = 'Escribe el motivo de la consulta.'; return; }
      const rec = isNew ? S.insert('clinicalNotes', { patientId: pid, appointmentId: v.appointmentId || null, ...d }, `Evolución de ${D.patientName(pid)}`) : S.update('clinicalNotes', n.id, d, `Evolución de ${D.patientName(pid)}`);
      for (const f of m.el.querySelector('#ev-files').files) {
        if (f.size > 8 * 1024 * 1024) { ui.toast(`${f.name} supera 8 MB y no se adjuntó.`, 'warn'); continue; }
        S.insert('documents', { patientId: pid, noteId: rec.id, category: f.type.startsWith('image') ? 'Fotografías' : 'Estudios', name: f.name, mime: f.type, dataUrl: await U.readFile(f), size: f.size, date: d.date, note: d.reason });
      }
      doneItems.forEach((key) => { const [qid, iid] = key.split('|'); const q = S.get('quotes', qid); if (!q) return; const it = q.items.find((i) => i.id === iid); S.update('quotes', qid, { items: q.items.map((i) => (i.id === iid ? { ...i, done: true, doneAt: d.date } : i)) }, `Marcó realizado en ${q.number}`); if (it?.tooth) D.recordTreatmentDone(pid, it.tooth, it.name, d.date); });
      m.markClean(); m.close(true); ui.toast('Evolución guardada.'); onSaved?.(rec);
    };
  }

  return { render, historyFor, evolutionFor, form, perm: 'clinica' };
})();
