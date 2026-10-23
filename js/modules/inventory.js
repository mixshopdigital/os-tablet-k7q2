/* ODONTO SMART — Inventario de materiales: stock, mínimos, vencimientos, entradas y salidas. */
OS.views.inventory = (() => {
  const U = OS.util; const ui = OS.ui; const S = OS.store; const D = OS.domain; const { esc } = U;

  function render(el, params) {
    const f = params.filter || 'todos'; const low = new Set(D.lowStock().map((i) => i.id)); const exp = new Set(D.expiring().map((i) => i.id));
    const items = S.data.inventory.filter((i) => f === 'todos' || (f === 'bajo' ? low.has(i.id) : exp.has(i.id))).sort((a, b) => a.name.localeCompare(b.name));
    const sup = (id) => S.get('suppliers', id)?.name || '—';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Inventario</span><h1>Materiales e insumos</h1><p>${S.data.inventory.length} productos · valor en stock ${U.money(U.sum(S.data.inventory, (i) => i.stock * i.cost))}</p></div>
      <div class="page-actions"><button class="btn btn-ghost" id="i-exp">${ui.icon('download')}<span>Exportar</span></button><button class="btn" id="i-sup">${ui.icon('users')}<span>Proveedores</span></button><button class="btn btn-primary" id="i-new">${ui.icon('plus')}<span>Nuevo producto</span></button></div></div>
      <div class="chip-row" id="i-f">${[['todos', 'Todos', S.data.inventory.length], ['bajo', 'Stock bajo', low.size], ['vence', 'Próximos a vencer', exp.size]].map(([k, l, n]) => `<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}<b>${n}</b></button>`).join('')}</div>
      ${items.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Producto</th><th>Categoría</th><th class="hide-sm">Proveedor</th><th>Lote</th><th>Vence</th><th class="r">Stock</th><th class="r">Mínimo</th><th class="r hide-sm">Costo</th><th></th></tr></thead><tbody>
        ${items.map((i) => `<tr><td><b>${esc(i.name)}</b><br><small class="muted">${esc(i.brand || '')}</small></td><td data-l="Categoría">${esc(i.category)}</td><td class="hide-sm">${esc(sup(i.supplierId))}</td><td class="mono" data-l="Lote">${esc(i.lot || '—')}</td>
          <td data-l="Vence">${i.expiry ? `${U.fmtDate(i.expiry)} ${exp.has(i.id) ? '<span class="badge badge-warn">! vence pronto</span>' : ''}` : '—'}</td><td class="r" data-l="Stock"><b class="${low.has(i.id) ? 'money-pos' : ''}">${i.stock}</b> ${esc(i.unit || '')} ${low.has(i.id) ? '<span class="badge badge-danger">! bajo</span>' : ''}</td><td class="r" data-l="Mínimo">${i.min}</td><td class="r hide-sm">${U.money(i.cost)}</td>
          <td class="r"><div class="row gap" style="justify-content:flex-end"><button class="btn btn-sm" data-mv="${i.id}" data-t="entrada">+ Entrada</button><button class="btn btn-sm" data-mv="${i.id}" data-t="salida">− Salida</button><button class="icon-btn" data-edit="${i.id}" aria-label="Editar">${ui.icon('edit')}</button></div></td></tr>`).join('')}</tbody></table></div>`
        : ui.empty('Sin productos en esta vista', 'Agrega materiales para controlar su stock.')}
      <section class="panel"><h3>${ui.icon('refresh')} Últimos movimientos</h3>${S.data.inventoryMoves.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="r">Cantidad</th><th>Nota</th></tr></thead><tbody>${S.data.inventoryMoves.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12).map((m) => `<tr><td>${U.fmtDate(m.date)}</td><td>${esc(S.get('inventory', m.itemId)?.name || '—')}</td><td>${ui.badge(m.type === 'entrada' ? 'aceptado' : 'proxima', m.type === 'entrada' ? 'Entrada' : 'Salida')}</td><td class="r">${m.qty}</td><td>${esc(m.note || '')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin movimientos.</p>'}</section>`;
    el.querySelector('#i-f').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) OS.app.refresh({ filter: b.dataset.f }); };
    el.querySelector('#i-new').onclick = () => form();
    el.querySelector('#i-sup').onclick = suppliers;
    el.querySelector('#i-exp').onclick = () => OS.files.exportExcel(`inventario_${U.today()}`, S.data.inventory, [{ label: 'Producto', get: 'name' }, { label: 'Categoría', get: 'category' }, { label: 'Marca', get: 'brand' }, { label: 'Proveedor', get: (i) => sup(i.supplierId) }, { label: 'Lote', get: 'lot' }, { label: 'Vencimiento', get: (i) => U.fmtDate(i.expiry) }, { label: 'Stock', get: (i) => Number(i.stock) }, { label: 'Mínimo', get: (i) => Number(i.min) }, { label: 'Costo', get: (i) => Number(i.cost) }], 'Inventario');
    el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(S.get('inventory', b.dataset.edit))));
    el.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => move(b.dataset.mv, b.dataset.t)));
  }

  function form(it) {
    const v = it || { unit: 'unidades', min: 1, stock: 0 };
    const m = ui.modal({ title: it ? 'Editar producto' : 'Nuevo producto', size: 'lg',
      body: `<form id="if" class="form-grid cols-3">${ui.field('Producto', ui.input('name', v.name, 'required'), { span: 2, req: true })}${ui.field('Categoría', ui.input('category', v.category, 'list="icat"') + `<datalist id="icat">${[...new Set(S.data.inventory.map((x) => x.category))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`)}
        ${ui.field('Marca', ui.input('brand', v.brand))}${ui.field('Proveedor', ui.select('supplierId', [['', '—'], ...S.data.suppliers.map((s) => [s.id, s.name])], v.supplierId))}${ui.field('Lote', ui.input('lot', v.lot))}
        ${ui.field('Vencimiento', ui.input('expiry', v.expiry, 'type="date"'))}${ui.field('Stock actual', ui.input('stock', v.stock, 'type="number" min="0" step="any"'))}${ui.field('Stock mínimo', ui.input('min', v.min, 'type="number" min="0" step="any"'))}
        ${ui.field('Unidad', ui.input('unit', v.unit))}${ui.field('Precio de compra', ui.input('cost', U.thousands(v.cost), 'inputmode="numeric"'))}</form>`,
      actions: [...(it ? [{ label: 'Eliminar', kind: 'ghost', id: 'if-del', icon: 'trash' }] : []), { label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'if' }] });
    m.el.querySelector('#if').onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(e.target); if (!d.name) return;
      d.stock = Number(d.stock) || 0; d.min = Number(d.min) || 0; d.cost = U.parseMoney(d.cost);
      if (it) S.update('inventory', it.id, d, `Producto ${d.name}`); else S.insert('inventory', d, `Producto ${d.name}`);
      if (d.stock <= d.min) S.notify('stock', `Stock bajo: ${d.name}`, ['inventory', { filter: 'bajo' }], `stock:${it?.id || d.name}:${U.today()}`);
      m.markClean(); m.close(true); ui.toast('Inventario actualizado.'); OS.app.refresh();
    };
    m.el.querySelector('#if-del')?.addEventListener('click', async () => { if (await ui.confirm({ title: `Eliminar ${it.name}`, text: 'También se eliminarán sus movimientos.', ok: 'Eliminar', kind: 'danger' })) { S.data.inventoryMoves = S.data.inventoryMoves.filter((x) => x.itemId !== it.id); S.remove('inventory', it.id, `Producto ${it.name}`); m.close(true); OS.app.refresh(); } });
  }

  function move(id, type) {
    const it = S.get('inventory', id);
    const m = ui.modal({ title: `${type === 'entrada' ? 'Entrada' : 'Salida'} · ${it.name}`, subtitle: `Stock actual: ${it.stock} ${esc(it.unit || '')}`, size: 'sm',
      body: `<form id="mf" class="form-grid">${ui.field('Cantidad', ui.input('qty', 1, 'type="number" min="0.01" step="any" required autofocus'))}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}${ui.field('Nota', ui.input('note', '', type === 'entrada' ? 'placeholder="Compra, lote…"' : 'placeholder="Uso en consultorio"'), { span: 2 })}<p class="form-error field span-2" id="mf-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Registrar', kind: 'primary', submit: true, form: 'mf' }] });
    m.el.querySelector('#mf').onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(e.target); const q = Number(d.qty);
      if (!(q > 0)) return;
      if (type === 'salida' && q > it.stock) { const x = m.el.querySelector('#mf-err'); x.hidden = false; x.textContent = `No hay stock suficiente (quedan ${it.stock}).`; return; }
      S.insert('inventoryMoves', { itemId: id, type, qty: q, date: d.date, note: d.note });
      S.update('inventory', id, { stock: Math.round((it.stock + (type === 'entrada' ? q : -q)) * 100) / 100 }, `${type} de ${q} ${it.name}`);
      if (S.get('inventory', id).stock <= it.min) S.notify('stock', `Stock bajo: ${it.name}`, ['inventory', { filter: 'bajo' }], `stock:${id}:${U.today()}`);
      m.markClean(); m.close(true); ui.toast('Movimiento registrado.'); OS.app.refresh();
    };
  }

  function suppliers() {
    const draw = () => `<div class="table-wrap"><table class="tbl"><thead><tr><th>Proveedor</th><th>Teléfono</th><th>Productos</th></tr></thead><tbody>${S.data.suppliers.map((s) => `<tr><td>${esc(s.name)}</td><td class="mono">${esc(s.phone || '')}</td><td>${S.data.inventory.filter((i) => i.supplierId === s.id).length}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sin proveedores.</td></tr>'}</tbody></table></div>
      <form id="sf" class="form-grid">${ui.field('Nuevo proveedor', ui.input('name', '', 'required'))}${ui.field('Teléfono', ui.input('phone', ''))}<button class="btn btn-primary" type="submit">${ui.icon('plus')}<span>Agregar</span></button></form>`;
    const m = ui.modal({ title: 'Proveedores', size: 'md', guard: false, body: draw() });
    const wire = () => { m.el.querySelector('#sf').onsubmit = (e) => { e.preventDefault(); const d = U.formData(e.target); if (!d.name) return; S.insert('suppliers', d, `Proveedor ${d.name}`); m.el.querySelector('.modal-body').innerHTML = draw(); wire(); }; };
    wire();
  }

  return { render, perm: 'inventario' };
})();
