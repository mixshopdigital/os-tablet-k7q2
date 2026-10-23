/* ODONTO SMART — Tratamientos: planes en curso de todos los pacientes y catálogo de precios. */
OS.views.treatments = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  function render(el, params) {
    const tab = params.tab || 'planes';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Tratamientos</span><h1>Tratamientos</h1><p>Planes en curso y catálogo de procedimientos con precios.</p></div>
      <div class="page-actions">${tab === 'catalogo' && OS.auth.can('config') ? `<button class="btn btn-primary" id="t-new">${ui.icon('plus')}<span>Nuevo procedimiento</span></button>` : `<button class="btn btn-primary" id="t-q">${ui.icon('plus')}<span>Nuevo plan / presupuesto</span></button>`}</div></div>
      <nav class="tabs" id="t-tabs"><button data-tab="planes" class="${tab === 'planes' ? 'active' : ''}">${ui.icon('plan')}Planes en curso</button><button data-tab="catalogo" class="${tab === 'catalogo' ? 'active' : ''}">${ui.icon('list')}Catálogo y precios</button></nav><div id="t-body"></div>`;
    ui.tabs(el.querySelector('#t-tabs'), (k) => OS.app.refresh({ tab: k }));
    el.querySelector('#t-new')?.addEventListener('click', () => form());
    el.querySelector('#t-q')?.addEventListener('click', () => OS.views.quotes.create({}));
    const body = el.querySelector('#t-body');
    if (tab === 'planes') {
      const plans = S.data.quotes.filter((q) => q.status === 'aceptado' && q.items.some((i) => !i.done));
      body.innerHTML = plans.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Paciente</th><th>Presupuesto</th><th>Pendiente</th><th>Avance</th><th>Próxima cita</th><th class="r">Saldo</th></tr></thead><tbody>
        ${plans.map((q) => { const done = q.items.filter((i) => i.done).length; const pct = Math.round((done / q.items.length) * 100); const nx = D.nextAppt(q.patientId); return `<tr class="click" data-q="${q.id}"><td><b>${esc(D.patientName(q.patientId))}</b></td><td data-l="Presupuesto" class="mono">${q.number}</td><td data-l="Pendiente">${esc(q.items.filter((i) => !i.done).map((i) => i.name + (i.tooth ? ` (${i.tooth})` : '')).join(', '))}</td>
          <td data-l="Avance"><div class="hbar" style="grid-template-columns:1fr auto"><span class="hbar-track"><span class="hbar-fill" style="width:${pct}%"></span></span><span class="hbar-val">${done}/${q.items.length}</span></div></td><td data-l="Próxima cita">${nx ? `${U.fmtDate(nx.date)} ${nx.time}` : '<span class="badge badge-warn">● Sin cita</span>'}</td><td class="r" data-l="Saldo">${U.money(D.balance(q.patientId).balance)}</td></tr>`; }).join('')}</tbody></table></div>`
        : ui.empty('No hay planes en curso', 'Cuando un paciente acepta un presupuesto, su plan aparece aquí.');
      body.querySelectorAll('[data-q]').forEach((r) => (r.onclick = () => OS.app.go('quote', { id: r.dataset.q })));
    } else {
      const g = U.groupBy(S.data.treatments, (t) => t.category);
      body.innerHTML = Object.entries(g).map(([cat, its]) => `<section class="panel"><h3>${esc(cat)}</h3><div class="table-wrap"><table class="tbl cards"><thead><tr><th>Procedimiento</th><th>Duración</th><th class="r">Precio</th><th>Estado</th><th></th></tr></thead><tbody>
        ${its.map((t) => `<tr><td><b>${esc(t.name)}</b></td><td data-l="Duración">${t.duration} min</td><td class="r" data-l="Precio">${U.money(t.price)}</td><td>${ui.badge(t.active === false ? 'inactivo' : 'activo')}</td><td class="r">${OS.auth.can('config') ? `<button class="btn btn-sm btn-ghost" data-edit="${t.id}">${ui.icon('edit')}<span>Editar</span></button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>`).join('');
      body.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(S.get('treatments', b.dataset.edit))));
    }
  }

  function form(t) {
    const v = t || { duration: 30, active: true, category: 'Operatoria' };
    const cats = [...new Set(S.data.treatments.map((x) => x.category))];
    const m = ui.modal({ title: t ? 'Editar procedimiento' : 'Nuevo procedimiento', size: 'md',
      body: `<form id="tf2" class="form-grid">${ui.field('Nombre', ui.input('name', v.name, 'required'), { span: 2, req: true })}${ui.field('Categoría', `<input name="category" id="f-category" list="cat-l" value="${esc(v.category)}"><datalist id="cat-l">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
        ${ui.field('Precio', ui.input('price', U.thousands(v.price), 'inputmode="numeric" required'), { req: true })}${ui.field('Duración (min)', ui.input('duration', v.duration, 'type="number" min="5" step="5"'))}
        <label class="check field"><input type="checkbox" name="active" ${v.active !== false ? 'checked' : ''}><span>Activo (aparece al presupuestar)</span></label></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'tf2' }] });
    m.el.querySelector('#tf2').onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(e.target); d.price = U.parseMoney(d.price); d.duration = Number(d.duration) || 30;
      if (!d.name) return;
      if (t) S.update('treatments', t.id, d, `Procedimiento ${d.name}`); else S.insert('treatments', d, `Procedimiento ${d.name}`);
      m.markClean(); m.close(true); ui.toast('Catálogo actualizado.'); OS.app.refresh();
    };
  }

  return { render, perm: 'presupuestos' };
})();
