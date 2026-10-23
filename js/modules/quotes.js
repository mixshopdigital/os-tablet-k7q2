/* ODONTO SMART — Presupuestos y plan de tratamiento.
   Un presupuesto aceptado se convierte en el plan de tratamiento del paciente
   y genera el cargo en su cuenta corriente. */
OS.views.quotes = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const FILTERS = [['todos', 'Todos'], ['pendientes', 'Pendientes'], ['aceptado', 'Aceptados'], ['rechazado', 'Rechazados'], ['vencido', 'Vencidos']];

  function newQuote(pid, items = []) {
    const c = S.data.clinic;
    return S.insert('quotes', { number: `P-${String(S.next('quote')).padStart(4, '0')}`, patientId: pid, professionalId: OS.auth.current()?.professionalId || D.patient(pid)?.professionalId || S.data.professionals[0]?.id, date: U.today(), items, discount: 0, validDays: c.quoteValidityDays || 15, paymentTerms: c.paymentTerms, notes: '', status: 'borrador', installments: null }, `Presupuesto para ${D.patientName(pid)}`);
  }
  async function create({ patientId }) {
    const pid = patientId || await OS.app.pickPatient('Nuevo presupuesto para…'); if (!pid) return;
    const q = newQuote(pid); OS.app.go('quote', { id: q.id });
  }

  function match(q, f) { const st = D.quoteStatus(q); return f === 'todos' || (f === 'pendientes' ? ['borrador', 'enviado'].includes(st) : st === f); }
  function table(list, showPatient = true) {
    return `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>N.º</th>${showPatient ? '<th>Paciente</th>' : ''}<th>Fecha</th><th>Tratamientos</th><th class="r">Total</th><th>Estado</th></tr></thead><tbody>
      ${list.map((q) => `<tr class="click" data-q="${q.id}"><td class="mono nowrap">${q.number}</td>${showPatient ? `<td>${esc(D.patientName(q.patientId))}</td>` : ''}<td data-l="Fecha">${U.fmtDate(q.date)}</td><td data-l="Tratamientos">${esc(q.items.map((i) => i.name).slice(0, 2).join(', '))}${q.items.length > 2 ? ` +${q.items.length - 2}` : ''}</td><td class="r" data-l="Total"><b>${U.money(D.quoteTotals(q).total)}</b></td><td>${ui.badge(D.quoteStatus(q))}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function render(el, params) {
    const f = params.filter || 'todos';
    const all = S.data.quotes.slice().sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number));
    const list = all.filter((q) => match(q, f));
    const acc = all.filter((q) => q.status === 'aceptado'); const decided = all.filter((q) => ['aceptado', 'rechazado'].includes(q.status));
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Presupuestos</span><h1>Presupuestos</h1><p>${all.length} emitidos · ${decided.length ? Math.round((acc.length / decided.length) * 100) : 0}% de aceptación sobre los respondidos</p></div>
      <div class="page-actions"><button class="btn btn-primary" id="q-new">${ui.icon('plus')}<span>Nuevo presupuesto</span></button></div></div>
      <div class="kpis"><div class="kpi"><small>Pendientes de respuesta</small><b>${all.filter((q) => match(q, 'pendientes')).length}</b><span class="sub">${U.money(U.sum(all.filter((q) => match(q, 'pendientes')), (q) => D.quoteTotals(q).total))}</span></div>
        <div class="kpi"><small>Aceptados</small><b>${acc.length}</b><span class="sub">${U.money(U.sum(acc, (q) => D.quoteTotals(q).total))}</span></div>
        <div class="kpi"><small>Rechazados</small><b>${all.filter((q) => q.status === 'rechazado').length}</b></div><div class="kpi"><small>Vencidos sin respuesta</small><b>${all.filter((q) => match(q, 'vencido')).length}</b></div></div>
      <div class="chip-row" id="q-f">${FILTERS.map(([k, l]) => `<button class="chip ${k === f ? 'active' : ''}" data-f="${k}">${l}<b>${all.filter((q) => match(q, k)).length}</b></button>`).join('')}</div>
      ${list.length ? table(list) : ui.empty('No hay presupuestos aquí', 'Crea uno desde la ficha del paciente o con el botón "Nuevo presupuesto".')}`;
    el.querySelector('#q-new').onclick = () => create({});
    el.querySelector('#q-f').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) OS.app.refresh({ filter: b.dataset.f }); };
    el.querySelectorAll('[data-q]').forEach((r) => (r.onclick = () => OS.app.go('quote', { id: r.dataset.q })));
  }

  function listFor(el, pid) {
    const list = D.quotesOf(pid).sort((a, b) => b.date.localeCompare(a.date));
    const plan = list.filter((q) => q.status === 'aceptado');
    el.innerHTML = `${plan.length ? `<section class="panel"><div class="panel-head"><h3>${ui.icon('plan')}Plan de tratamiento</h3></div>
      <div class="table-wrap"><table class="tbl cards"><thead><tr><th>Pieza</th><th>Procedimiento</th><th>Presupuesto</th><th class="r">Precio</th><th>Estado</th></tr></thead><tbody>${plan.flatMap((q) => q.items.map((i) => `<tr><td class="mono">${esc(i.tooth || '—')}</td><td>${esc(i.name)}${i.qty > 1 ? ` × ${i.qty}` : ''}</td><td data-l="Presupuesto" class="mono">${q.number}</td><td class="r" data-l="Precio">${U.money(i.qty * i.price)}</td><td>${OS.auth.can('clinica') ? `<label class="check" style="display:inline-flex;padding:3px 8px"><input type="checkbox" data-done="${q.id}|${i.id}" ${i.done ? 'checked' : ''}><span>${i.done ? 'Realizado' : 'Por realizar'}</span></label>` : ui.badge(i.done ? 'realizado' : 'por_realizar')}</td></tr>`)).join('')}</tbody></table></div></section>` : ''}
      <section class="panel"><div class="panel-head"><h3>${ui.icon('quote')}Presupuestos</h3><button class="btn btn-primary btn-sm" id="lq-new">${ui.icon('plus')}<span>Nuevo presupuesto</span></button></div>
      ${list.length ? table(list, false) : ui.empty('Sin presupuestos', 'Crea un presupuesto desde aquí o desde el odontograma.')}</section>`;
    el.querySelector('#lq-new').onclick = () => create({ patientId: pid });
    el.querySelectorAll('[data-q]').forEach((r) => (r.onclick = () => OS.app.go('quote', { id: r.dataset.q })));
    el.querySelectorAll('[data-done]').forEach((c) => (c.onchange = () => { const [qid, iid] = c.dataset.done.split('|'); const q = S.get('quotes', qid); const it = q.items.find((i) => i.id === iid); if (c.checked && it.tooth) D.recordTreatmentDone(pid, it.tooth, it.name, U.today()); S.update('quotes', qid, { items: q.items.map((i) => (i.id === iid ? { ...i, done: c.checked, doneAt: c.checked ? U.today() : null } : i)) }, `${c.checked ? 'Realizado' : 'Pendiente'}: ${q.items.find((i) => i.id === iid).name}`); OS.app.refresh(); }));
  }

  // ---------- Editor ----------
  function editor(el, params) {
    const q = S.get('quotes', params.id);
    if (!q) { el.innerHTML = ui.empty('Presupuesto no encontrado', 'Puede haber sido eliminado.', '<button class="btn btn-primary" data-go="quotes">Ver presupuestos</button>'); return; }
    const p = D.patient(q.patientId); const locked = ['aceptado', 'rechazado'].includes(q.status); const st = D.quoteStatus(q);
    const t = D.quoteTotals(q); const sch = D.schedule(q); const paid = D.paidFor(q.id);
    const cat = S.data.treatments.filter((x) => x.active !== false);
    const pct = t.subtotal ? Math.round((t.discount / t.subtotal) * 1000) / 10 : 0;
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Presupuesto ${q.number}</span><h1>Plan de tratamiento</h1><p>Paciente: <button class="link" id="qe-p">${esc(D.fullName(p))}</button> · ${U.fmtDate(q.date)} · ${ui.badge(st)}</p></div>
      <div class="page-actions">${q.status === 'aceptado' && OS.auth.can('cobros') ? `<button class="btn" id="qe-pay">${ui.icon('card')}<span>Registrar pago</span></button>` : ''}<button class="btn btn-wa" id="qe-wa">${ui.icon('whatsapp')}<span>Enviar por WhatsApp</span></button><button class="btn btn-primary" id="qe-pdf">${ui.icon('file')}<span>Generar PDF</span></button></div></div>
      ${locked ? `<p class="note note-${q.status === 'aceptado' ? 'ok' : 'danger'}">${ui.icon(q.status === 'aceptado' ? 'check' : 'x')}<span>${q.status === 'aceptado' ? `Aceptado el ${U.fmtDate(q.acceptedAt || q.date)}. Forma parte del plan y de la cuenta corriente del paciente. Pagado: <b>${U.money(paid)}</b> de ${U.money(t.total)}.` : 'Presupuesto rechazado.'} <button class="link" id="qe-unlock">Volver a borrador para modificar</button></span></p>` : ''}
      <div class="quote-editor">
        <section class="panel"><div class="panel-head"><h3>${ui.icon('plan')}Tratamientos</h3>${!locked ? '<span class="muted small" id="qe-saved">Los cambios se guardan automáticamente</span>' : ''}</div>
          <div class="table-wrap items-table"><table class="tbl"><thead><tr><th style="width:80px">Pieza</th><th>Procedimiento</th><th style="width:70px">Cant.</th><th style="width:140px" class="r">Precio</th><th class="r" style="width:130px">Importe</th><th style="width:44px"></th></tr></thead><tbody>
          ${q.items.map((i) => `<tr data-item="${i.id}"><td><input value="${esc(i.tooth)}" data-k="tooth" aria-label="Pieza" ${locked ? 'disabled' : ''} placeholder="—"></td><td><input value="${esc(i.name)}" data-k="name" aria-label="Procedimiento" ${locked ? 'disabled' : ''}></td>
            <td><input value="${i.qty}" data-k="qty" inputmode="numeric" aria-label="Cantidad" ${locked ? 'disabled' : ''}></td><td><input class="r" value="${U.thousands(i.price)}" data-k="price" inputmode="numeric" aria-label="Precio" ${locked ? 'disabled' : ''}></td>
            <td class="r num"><b>${U.money(i.qty * i.price)}</b></td><td>${locked ? (i.done ? '✓' : '') : `<button class="icon-btn" data-rm="${i.id}" aria-label="Quitar">${ui.icon('trash')}</button>`}</td></tr>`).join('') || `<tr><td colspan="6" class="muted">Agrega el primer tratamiento.</td></tr>`}</tbody></table></div>
          ${!locked ? `<div class="row gap wrap"><select id="qe-add" style="max-width:420px" aria-label="Agregar tratamiento"><option value="">+ Agregar tratamiento del catálogo…</option>${Object.entries(U.groupBy(cat, (x) => x.category)).map(([g, its]) => `<optgroup label="${esc(g)}">${its.map((x) => `<option value="${x.id}">${esc(x.name)} · ${U.money(x.price)}</option>`).join('')}</optgroup>`).join('')}</select><input id="qe-tooth" placeholder="Pieza" style="max-width:90px" aria-label="Pieza para el tratamiento"><button class="btn btn-sm btn-ghost" id="qe-free">${ui.icon('plus')}<span>Ítem libre</span></button></div>` : ''}
          ${ui.field('Observaciones', `<textarea id="qe-notes" rows="3" ${locked ? 'disabled' : ''}>${esc(q.notes || '')}</textarea>`)}
        </section>
        <aside style="display:grid;gap:16px">
          <section class="panel totals-box"><div class="tr"><span>Subtotal</span><b>${U.money(t.subtotal)}</b></div>
            <div class="tr" style="align-items:center"><span>Descuento</span><span class="row gap"><input id="qe-disc" value="${U.thousands(t.discount)}" inputmode="numeric" style="width:120px;text-align:right" ${locked ? 'disabled' : ''} aria-label="Descuento en guaraníes"><input id="qe-pct" value="${pct || ''}" placeholder="%" inputmode="decimal" style="width:60px" ${locked ? 'disabled' : ''} aria-label="Descuento en porcentaje"></span></div>
            <div class="tr grand"><span>TOTAL</span><span>${U.money(t.total)}</span></div></section>
          <section class="panel"><h3>${ui.icon('calendar')} Cuotas</h3>
            <div class="chip-row">${[0, 3, 6, 12].map((n) => `<button class="chip ${(q.installments?.count || 0) === n ? 'active' : ''}" data-inst="${n}" ${locked ? 'disabled' : ''}>${n ? `${n} cuotas` : 'Contado'}</button>`).join('')}<input id="qe-inst" type="number" min="1" max="48" placeholder="Otra" style="width:76px" value="${q.installments && ![3, 6, 12].includes(q.installments.count) ? q.installments.count : ''}" ${locked ? 'disabled' : ''} aria-label="Cuotas personalizadas"></div>
            ${q.installments ? `${ui.field('Primer vencimiento', `<input type="date" id="qe-start" value="${q.installments.start || q.date}" ${locked ? 'disabled' : ''}>`)}
            <div class="table-wrap"><table class="tbl inst-table"><thead><tr><th>Cuota</th><th>Vence</th><th class="r">Monto</th>${q.status === 'aceptado' ? '<th>Estado</th>' : ''}</tr></thead><tbody>${sch.map((s) => `<tr><td>${s.no}</td><td>${U.fmtDate(s.due)}</td><td class="r">${U.money(s.amount)}</td>${q.status === 'aceptado' ? `<td>${ui.badge(s.status)}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Pago al contado o según acuerdo.</p>'}
          </section>
          <section class="panel"><div class="form-grid">${ui.field('Validez (días)', `<input id="qe-valid" type="number" min="1" value="${q.validDays}" ${locked ? 'disabled' : ''}>`)}${ui.field('Profesional', `<select id="qe-prof" ${locked ? 'disabled' : ''}>${S.data.professionals.map((x) => `<option value="${x.id}" ${x.id === q.professionalId ? 'selected' : ''}>${esc(D.profName(x.id))}</option>`).join('')}</select>`)}
            ${ui.field('Forma de pago', `<input id="qe-terms" value="${esc(q.paymentTerms || '')}" ${locked ? 'disabled' : ''}>`, { span: 2 })}</div></section>
          <section class="panel"><h3>Estado</h3><div class="row gap wrap">
            ${!locked ? `<button class="btn btn-sm" id="qe-sent">${ui.icon('message')}<span>Marcar enviado</span></button><button class="btn btn-sm btn-primary" id="qe-accept">${ui.icon('check')}<span>Aceptado por el paciente</span></button><button class="btn btn-sm" id="qe-reject">${ui.icon('x')}<span>Rechazado</span></button>` : ''}
            <button class="btn btn-sm btn-ghost" id="qe-dup">${ui.icon('copy')}<span>Duplicar</span></button>${!paid ? `<button class="btn btn-sm btn-ghost" id="qe-del" style="color:var(--danger)">${ui.icon('trash')}<span>Eliminar</span></button>` : ''}</div></section>
        </aside></div>`;

    const $ = (s) => el.querySelector(s);
    const save = (patch, msg) => { S.update('quotes', q.id, patch, msg || null); };
    const rerender = () => OS.app.refresh();
    $('#qe-p').onclick = () => OS.app.go('patient', { id: p.id, tab: 'presupuestos' });
    $('#qe-pdf').onclick = () => { if (!q.items.length) return ui.toast('Agrega al menos un tratamiento.', 'warn'); OS.pdf.present(OS.pdf.quoteModel(S.get('quotes', q.id)), { patientId: p.id, waKey: 'presupuesto', category: 'PDFs' }); };
    $('#qe-wa').onclick = () => { if (q.status === 'borrador') save({ status: 'enviado' }, `Presupuesto ${q.number} enviado`); OS.pdf.present(OS.pdf.quoteModel(S.get('quotes', q.id)), { patientId: p.id, waKey: 'presupuesto', category: 'PDFs' }); };
    $('#qe-pay')?.addEventListener('click', () => OS.views.payments.form({ patientId: p.id, quoteId: q.id }));
    $('#qe-unlock')?.addEventListener('click', async () => { if (paid && !(await ui.confirm({ title: 'Volver a borrador', text: 'Este presupuesto tiene pagos registrados. Al volver a borrador deja de sumarse a la cuenta corriente hasta que lo aceptes nuevamente.', ok: 'Volver a borrador' }))) return; save({ status: 'borrador' }, `Presupuesto ${q.number} vuelto a borrador`); rerender(); });
    $('#qe-dup').onclick = () => { const n = newQuote(q.patientId, q.items.map((i) => ({ ...i, id: U.uid('itm'), done: false }))); S.update('quotes', n.id, { discount: q.discount, notes: q.notes, installments: q.installments }); OS.app.go('quote', { id: n.id }); };
    $('#qe-del')?.addEventListener('click', async () => { if (await ui.confirm({ title: `Eliminar presupuesto ${q.number}`, text: 'Esta acción no se puede deshacer.', ok: 'Eliminar', kind: 'danger' })) { S.remove('quotes', q.id, `Presupuesto ${q.number}`); OS.app.go('patient', { id: p.id, tab: 'presupuestos' }, true); } });
    if (locked) return;

    el.querySelectorAll('[data-item] input').forEach((inp) => inp.addEventListener('change', () => {
      const id = inp.closest('[data-item]').dataset.item; const k = inp.dataset.k;
      let val = inp.value.trim(); if (k === 'qty') val = Math.max(1, parseInt(val, 10) || 1); if (k === 'price') val = U.parseMoney(val);
      save({ items: q.items.map((i) => (i.id === id ? { ...i, [k]: val } : i)) }); rerender();
    }));
    el.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { save({ items: q.items.filter((i) => i.id !== b.dataset.rm) }); rerender(); }));
    $('#qe-add').onchange = (e) => { const tr = cat.find((x) => x.id === e.target.value); if (!tr) return; save({ items: [...q.items, { id: U.uid('itm'), treatmentId: tr.id, name: tr.name, tooth: $('#qe-tooth').value.trim(), qty: 1, price: tr.price, done: false }] }); rerender(); };
    $('#qe-free').onclick = () => { save({ items: [...q.items, { id: U.uid('itm'), name: 'Tratamiento', tooth: $('#qe-tooth').value.trim(), qty: 1, price: 0, done: false }] }); rerender(); };
    $('#qe-notes').onchange = (e) => save({ notes: e.target.value });
    $('#qe-disc').onchange = (e) => { save({ discount: Math.min(t.subtotal, U.parseMoney(e.target.value)) }, `Descuento en ${q.number}`); rerender(); };
    $('#qe-pct').onchange = (e) => { const v = Math.min(100, Math.max(0, parseFloat(e.target.value.replace(',', '.')) || 0)); save({ discount: Math.round((t.subtotal * v) / 100) }, `Descuento ${v}% en ${q.number}`); rerender(); };
    el.querySelectorAll('[data-inst]').forEach((b) => (b.onclick = () => { const n = Number(b.dataset.inst); save({ installments: n ? { count: n, start: q.installments?.start || q.date } : null }); rerender(); }));
    $('#qe-inst').onchange = (e) => { const n = Math.min(48, Math.max(0, parseInt(e.target.value, 10) || 0)); save({ installments: n ? { count: n, start: q.installments?.start || q.date } : null }); rerender(); };
    $('#qe-start')?.addEventListener('change', (e) => { save({ installments: { ...q.installments, start: e.target.value } }); rerender(); });
    $('#qe-valid').onchange = (e) => save({ validDays: Math.max(1, Number(e.target.value) || 15) });
    $('#qe-prof').onchange = (e) => save({ professionalId: e.target.value });
    $('#qe-terms').onchange = (e) => save({ paymentTerms: e.target.value });
    $('#qe-sent').onclick = () => { save({ status: 'enviado' }, `Presupuesto ${q.number} enviado`); ui.toast('Marcado como enviado.'); rerender(); };
    $('#qe-accept').onclick = () => { if (!q.items.length) return ui.toast('Agrega tratamientos antes de aceptar.', 'warn'); save({ status: 'aceptado', acceptedAt: U.today() }, `Presupuesto ${q.number} aceptado (${U.money(t.total)})`); ui.toast('Presupuesto aceptado: ya forma parte del plan y de la cuenta corriente.'); rerender(); };
    $('#qe-reject').onclick = async () => { if (await ui.confirm({ title: 'Marcar como rechazado', text: 'El presupuesto quedará como rechazado. Podrás volver a borrador más tarde.', ok: 'Marcar rechazado', kind: 'danger' })) { save({ status: 'rechazado' }, `Presupuesto ${q.number} rechazado`); rerender(); } };
  }

  OS.views.quote = { render: editor, perm: 'presupuestos', navId: 'quotes', crumbs: (pr) => ['Presupuestos', S.get('quotes', pr.id)?.number || ''] };
  return { render, listFor, create, newQuote, perm: 'presupuestos' };
})();
