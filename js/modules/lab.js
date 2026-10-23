/* ODONTO SMART — Laboratorio dental: órdenes de trabajo, fechas y estados (retraso automático). */
OS.views.lab = (() => {
  const U = OS.util; const ui = OS.ui; const S = OS.store; const D = OS.domain; const { esc } = U;

  function render(el, params) {
    const f = params.filter || 'activos';
    const orders = S.data.labOrders.slice().sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    const list = orders.filter((o) => f === 'todos' || (f === 'activos' ? !o.receivedDate : D.labStatus(o) === f));
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Laboratorio</span><h1>Trabajos de laboratorio</h1><p>${orders.filter((o) => !o.receivedDate).length} en curso · ${orders.filter((o) => D.labStatus(o) === 'lab_retrasado').length} retrasados</p></div>
      <div class="page-actions"><button class="btn" id="l-labs">${ui.icon('flask')}<span>Laboratorios</span></button><button class="btn btn-primary" id="l-new">${ui.icon('plus')}<span>Nuevo trabajo</span></button></div></div>
      <div class="chip-row" id="l-f">${[['activos', 'En curso'], ['lab_retrasado', 'Retrasados'], ['lab_recibido', 'Recibidos'], ['todos', 'Todos']].map(([k, l]) => `<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      ${list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Paciente</th><th>Pieza</th><th>Trabajo</th><th>Laboratorio</th><th>Enviado</th><th>Estimado</th><th>Recibido</th><th class="r">Costo</th><th>Estado</th><th></th></tr></thead><tbody>
        ${list.map((o) => `<tr><td><button class="link" data-pat="${o.patientId}">${esc(D.patientName(o.patientId))}</button></td><td class="mono" data-l="Pieza">${esc(o.tooth || '—')}</td><td><b>${esc(o.work)}</b></td><td data-l="Laboratorio">${esc(S.get('labs', o.labId)?.name || '—')}</td><td data-l="Enviado">${U.fmtDate(o.sentDate)}</td><td data-l="Estimado">${U.fmtDate(o.dueDate)}</td><td data-l="Recibido">${U.fmtDate(o.receivedDate)}</td><td class="r" data-l="Costo">${U.money(o.cost)}</td><td>${ui.badge(D.labStatus(o))}</td>
          <td class="r"><div class="row gap" style="justify-content:flex-end">${!o.receivedDate ? `<button class="btn btn-sm" data-rcv="${o.id}">${ui.icon('check')}<span>Recibido</span></button>` : ''}<button class="icon-btn" data-edit="${o.id}" aria-label="Editar">${ui.icon('edit')}</button></div></td></tr>`).join('')}</tbody></table></div>`
        : ui.empty('No hay trabajos aquí', 'Registra los trabajos que envías al laboratorio para seguir sus fechas.')}`;
    el.querySelector('#l-f').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) OS.app.refresh({ filter: b.dataset.f }); };
    el.querySelector('#l-new').onclick = () => form();
    el.querySelector('#l-labs').onclick = labs;
    el.querySelectorAll('[data-pat]').forEach((b) => (b.onclick = () => OS.app.go('patient', { id: b.dataset.pat })));
    el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(S.get('labOrders', b.dataset.edit))));
    el.querySelectorAll('[data-rcv]').forEach((b) => (b.onclick = () => { const o = S.get('labOrders', b.dataset.rcv); S.update('labOrders', o.id, { receivedDate: U.today(), status: 'recibido' }, `Laboratorio recibido: ${o.work}`); ui.toast('Trabajo marcado como recibido.'); OS.app.refresh(); }));
  }

  async function form(o) {
    let pid = o?.patientId; if (!pid) { pid = await OS.app.pickPatient('Trabajo de laboratorio para…'); if (!pid) return; }
    const v = o || { sentDate: U.today(), dueDate: U.addDays(U.today(), 10), status: 'enviado', labId: S.data.labs[0]?.id };
    const m = ui.modal({ title: o ? 'Editar trabajo' : 'Nuevo trabajo de laboratorio', subtitle: esc(D.patientName(pid)), size: 'md',
      body: `<form id="lf" class="form-grid">${ui.field('Trabajo', ui.input('work', v.work, 'required placeholder="Ej.: Corona de porcelana"'), { span: 2, req: true })}${ui.field('Pieza', ui.input('tooth', v.tooth))}
        ${ui.field('Laboratorio', ui.select('labId', [['', '—'], ...S.data.labs.map((l) => [l.id, l.name])], v.labId))}${ui.field('Fecha de envío', ui.input('sentDate', v.sentDate, 'type="date"'))}${ui.field('Fecha estimada', ui.input('dueDate', v.dueDate, 'type="date"'))}
        ${ui.field('Fecha recibida', ui.input('receivedDate', v.receivedDate, 'type="date"'))}${ui.field('Estado', ui.select('status', [['enviado', 'Enviado'], ['proceso', 'En proceso'], ['recibido', 'Recibido']], v.status))}
        ${ui.field('Costo', ui.input('cost', U.thousands(v.cost), 'inputmode="numeric"'))}</form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'lf' }] });
    m.el.querySelector('#lf').onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(e.target); if (!d.work) return; d.cost = U.parseMoney(d.cost); if (d.receivedDate) d.status = 'recibido';
      if (o) S.update('labOrders', o.id, d, `Laboratorio: ${d.work}`); else S.insert('labOrders', { patientId: pid, ...d }, `Laboratorio: ${d.work} (${D.patientName(pid)})`);
      m.markClean(); m.close(true); ui.toast('Trabajo de laboratorio guardado.'); OS.app.refresh();
    };
  }

  function labs() {
    const draw = () => `<div class="table-wrap"><table class="tbl"><thead><tr><th>Laboratorio</th><th>Teléfono</th><th>Trabajos</th></tr></thead><tbody>${S.data.labs.map((l) => `<tr><td>${esc(l.name)}</td><td class="mono">${esc(l.phone || '')}</td><td>${S.data.labOrders.filter((o) => o.labId === l.id).length}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin laboratorios.</td></tr>'}</tbody></table></div>
      <form id="lbf" class="form-grid">${ui.field('Nuevo laboratorio', ui.input('name', '', 'required'))}${ui.field('Teléfono', ui.input('phone', ''))}<button class="btn btn-primary" type="submit">${ui.icon('plus')}<span>Agregar</span></button></form>`;
    const m = ui.modal({ title: 'Laboratorios', size: 'md', guard: false, body: draw() });
    const wire = () => { m.el.querySelector('#lbf').onsubmit = (e) => { e.preventDefault(); const d = U.formData(e.target); if (!d.name) return; S.insert('labs', d, `Laboratorio ${d.name}`); m.el.querySelector('.modal-body').innerHTML = draw(); wire(); }; };
    wire();
  }

  return { render, perm: 'laboratorio' };
})();
