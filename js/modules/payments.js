/* ODONTO SMART — Cobros: pagos, recibos, deudores, cuotas y cuenta corriente. */
OS.views.payments = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const METHODS = ['Efectivo', 'Transferencia', 'Tarjeta', 'QR', 'Otro'];

  function render(el, params) {
    const tab = params.tab || 'cobros'; const period = params.period || 'mes';
    const t = U.today();
    const from = period === 'hoy' ? t : period === 'semana' ? U.startOfWeek(t) : period === 'mes' ? t.slice(0, 8) + '01' : U.addMonths(t, -12);
    const pays = S.data.payments.filter((p) => p.date >= from && p.date <= t).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));
    const debtors = S.data.patients.map((p) => ({ p, b: D.balance(p.id) })).filter((x) => x.b.balance > 0).sort((a, b) => b.b.balance - a.b.balance);
    const inst = S.data.quotes.filter((q) => q.status === 'aceptado').flatMap((q) => D.schedule(q).filter((s) => s.status !== 'pagada').map((s) => ({ ...s, q }))).sort((a, b) => a.due.localeCompare(b.due));
    const byMethod = METHODS.map((m) => ({ label: m, value: U.sum(pays.filter((p) => p.method === m), (p) => p.amount) })).filter((x) => x.value);
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Cobros</span><h1>Cobros y cuentas corrientes</h1></div>
      <div class="page-actions"><button class="btn btn-ghost" id="pay-exp">${ui.icon('download')}<span>Exportar</span></button><button class="btn btn-primary" id="pay-new">${ui.icon('plus')}<span>Registrar pago</span></button></div></div>
      <div class="kpis"><div class="kpi accent"><small>Cobrado (${period === 'hoy' ? 'hoy' : period === 'semana' ? 'esta semana' : period === 'mes' ? 'este mes' : '12 meses'})</small><b>${U.money(U.sum(pays, (p) => p.amount))}</b><span class="sub">${pays.length} pagos</span></div>
        <button class="kpi money" data-t="deudores"><small>Pendiente de cobro</small><b>${U.money(U.sum(debtors, (x) => x.b.balance))}</b><span class="sub">${debtors.length} pacientes con saldo</span></button>
        <button class="kpi" data-t="cuotas"><small>Cuotas vencidas</small><b>${inst.filter((s) => s.status === 'vencida').length}</b><span class="sub">${U.money(U.sum(inst.filter((s) => s.status === 'vencida'), (s) => s.amount - s.covered))}</span></button>
        <div class="kpi"><small>Próximas 15 días</small><b>${inst.filter((s) => s.status === 'proxima').length}</b><span class="sub">cuotas por vencer</span></div></div>
      <nav class="tabs" id="pay-tabs">${[['cobros', 'Pagos registrados', 'money'], ['deudores', 'Pacientes con saldo', 'users'], ['cuotas', 'Plan de cuotas', 'calendar']].map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav><div id="pay-body"></div>`;
    ui.tabs(el.querySelector('#pay-tabs'), (k) => OS.app.refresh({ tab: k }));
    el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => OS.app.refresh({ tab: b.dataset.t })));
    el.querySelector('#pay-new').onclick = () => form({});
    el.querySelector('#pay-exp').onclick = () => OS.files.exportExcel(`cobros_${t}`, pays, [{ label: 'Fecha', get: (p) => U.fmtDate(p.date) }, { label: 'Recibo', get: 'receiptNo' }, { label: 'Paciente', get: (p) => D.patientName(p.patientId) }, { label: 'Método', get: 'method' }, { label: 'Monto', get: (p) => p.amount }, { label: 'Presupuesto', get: (p) => S.get('quotes', p.quoteId)?.number || '' }, { label: 'Cuota', get: (p) => p.installmentNo || '' }], 'Cobros');
    const body = el.querySelector('#pay-body');
    if (tab === 'cobros') {
      body.innerHTML = `<div class="row gap wrap"><div class="chip-row" id="pay-per">${[['hoy', 'Hoy'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', '12 meses']].map(([k, l]) => `<button class="chip ${k === period ? 'active' : ''}" data-p="${k}">${l}</button>`).join('')}</div></div>
        <div class="grid-main"><div>${pays.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Fecha</th><th>Recibo</th><th>Paciente</th><th>Método</th><th class="r">Monto</th><th></th></tr></thead><tbody>${pays.map((p) => `<tr><td data-l="Fecha">${U.fmtDate(p.date)}</td><td class="mono" data-l="Recibo">${p.receiptNo}</td><td><button class="link" data-pat="${p.patientId}">${esc(D.patientName(p.patientId))}</button></td><td data-l="Método">${esc(p.method)}</td><td class="r"><b>${U.money(p.amount)}</b></td><td class="r"><button class="btn btn-sm btn-ghost" data-rc="${p.id}">${ui.icon('file')}<span>Recibo</span></button></td></tr>`).join('')}</tbody></table></div>` : ui.empty('Sin pagos en el período', 'Registra un pago para verlo aquí.')}</div>
        <section class="panel"><h3>Por método de pago</h3>${ui.hBars(byMethod, { format: (v) => U.money(v) })}</section></div>`;
      body.querySelector('#pay-per').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) OS.app.refresh({ period: b.dataset.p }); };
    } else if (tab === 'deudores') {
      body.innerHTML = debtors.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Paciente</th><th class="r">Total tratamientos</th><th class="r">Pagado</th><th class="r">Saldo</th><th>Último pago</th><th></th></tr></thead><tbody>${debtors.map(({ p, b }) => { const lp = D.paymentsOf(p.id).sort((x, y) => y.date.localeCompare(x.date))[0]; return `<tr><td><button class="link" data-pat="${p.id}">${esc(D.fullName(p))}</button></td><td class="r" data-l="Total">${U.money(b.charged)}</td><td class="r" data-l="Pagado">${U.money(b.paid)}</td><td class="r money-pos" data-l="Saldo">${U.money(b.balance)}</td><td data-l="Último pago">${lp ? U.fmtDate(lp.date) : '—'}</td><td class="r"><div class="row gap" style="justify-content:flex-end">${OS.wa.button(p.id, { key: 'pago', label: 'Recordar pago', small: true })}<button class="btn btn-sm" data-payp="${p.id}">${ui.icon('card')}<span>Cobrar</span></button></div></td></tr>`; }).join('')}</tbody></table></div>` : ui.empty('No hay saldos pendientes', 'Todos los pacientes están al día.');
    } else {
      body.innerHTML = inst.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Vence</th><th>Paciente</th><th>Presupuesto</th><th>Cuota</th><th class="r">Monto</th><th class="r">Falta</th><th>Estado</th><th></th></tr></thead><tbody>${inst.map((s) => `<tr><td data-l="Vence">${U.fmtDate(s.due)}</td><td><button class="link" data-pat="${s.q.patientId}">${esc(D.patientName(s.q.patientId))}</button></td><td class="mono" data-l="Presupuesto">${s.q.number}</td><td data-l="Cuota">${s.no} de ${s.q.installments.count}</td><td class="r" data-l="Monto">${U.money(s.amount)}</td><td class="r" data-l="Falta">${U.money(s.amount - s.covered)}</td><td>${ui.badge(s.status)}</td><td class="r"><button class="btn btn-sm" data-payq="${s.q.id}" data-no="${s.no}" data-amt="${s.amount - s.covered}">${ui.icon('card')}<span>Cobrar</span></button></td></tr>`).join('')}</tbody></table></div>` : ui.empty('No hay cuotas pendientes', 'Los planes en cuotas aparecen aquí al aceptar un presupuesto.');
    }
    body.querySelectorAll('[data-pat]').forEach((b) => (b.onclick = () => OS.app.go('patient', { id: b.dataset.pat, tab: 'cobros' })));
    body.querySelectorAll('[data-rc]').forEach((b) => (b.onclick = () => receipt(b.dataset.rc)));
    body.querySelectorAll('[data-payp]').forEach((b) => (b.onclick = () => form({ patientId: b.dataset.payp })));
    body.querySelectorAll('[data-payq]').forEach((b) => (b.onclick = () => { const q = S.get('quotes', b.dataset.payq); form({ patientId: q.patientId, quoteId: q.id, installmentNo: Number(b.dataset.no), amount: Number(b.dataset.amt) }); }));
  }

  const receipt = (id) => { const p = S.get('payments', id); OS.pdf.present(OS.pdf.receiptModel(p), { patientId: p.patientId, waKey: '', category: 'PDFs' }); };

  /** Registrar pago (total, parcial o cuota). */
  async function form(v = {}) {
    let pid = v.patientId; if (!pid) { pid = await OS.app.pickPatient('Registrar pago de…'); if (!pid) return; }
    const p = D.patient(pid); const b = D.balance(pid);
    const quotes = D.quotesOf(pid).filter((q) => q.status === 'aceptado').map((q) => ({ q, rest: D.quoteTotals(q).total - D.paidFor(q.id) })).filter((x) => x.rest > 0 || x.q.id === v.quoteId);
    const qid = v.quoteId || quotes[0]?.q.id || '';
    const nextInst = (id) => { const q = S.get('quotes', id); const s = q ? D.schedule(q).find((x) => x.status !== 'pagada') : null; return s; };
    const ni = v.installmentNo ? { no: v.installmentNo, amount: v.amount } : (qid && nextInst(qid) ? { no: nextInst(qid).no, amount: nextInst(qid).amount - nextInst(qid).covered } : null);
    const suggested = v.amount || ni?.amount || Math.max(0, quotes.find((x) => x.q.id === qid)?.rest || b.balance);
    const m = ui.modal({
      title: 'Registrar pago', subtitle: `${esc(D.fullName(p))} · Saldo actual ${U.money(b.balance)}`, size: 'md',
      body: `<form id="payf" class="form-grid">
        ${ui.field('Aplicar a', ui.select('quoteId', [...quotes.map(({ q, rest }) => [q.id, `Presupuesto ${q.number} · resta ${U.money(rest)}`]), ['', 'Pago a cuenta / consulta (sin presupuesto)']], qid), { span: 2 })}
        ${ui.field('Monto', ui.input('amount', U.thousands(suggested), 'inputmode="numeric" required autofocus'), { req: true, hint: 'Puede ser un pago parcial.' })}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}
        <div class="field span-2"><span class="lbl">Método</span><div class="chip-row">${METHODS.map((x, i) => `<label class="chip"><input type="radio" name="method" value="${x}" ${i === 0 ? 'checked' : ''} style="position:absolute;opacity:0">${x}</label>`).join('')}</div></div>
        ${ui.field('Cuota', ui.input('installmentNo', ni?.no || '', 'type="number" min="1"'), { hint: ni ? `Próxima cuota: ${ni.no}` : 'Opcional' })}${ui.field('Concepto', ui.input('note', '', 'placeholder="Ej.: entrega inicial"'))}
        <p class="form-error field span-2" id="payf-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Registrar y emitir recibo', kind: 'primary', submit: true, form: 'payf', icon: 'check' }],
    });
    const f = m.el.querySelector('#payf');
    const chips = () => f.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.querySelector('input').checked));
    f.addEventListener('change', chips); chips();
    f.amount.addEventListener('blur', () => { f.amount.value = U.thousands(U.parseMoney(f.amount.value)); });
    f.onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(f); const amount = U.parseMoney(d.amount);
      const err = (t) => { const x = m.el.querySelector('#payf-err'); x.hidden = false; x.textContent = t; };
      if (amount <= 0) return err('Ingresa un monto mayor a cero.');
      if (d.date > U.today()) return err('La fecha del pago no puede ser futura.');
      const rec = S.insert('payments', { patientId: pid, quoteId: d.quoteId || null, date: d.date || U.today(), amount, method: d.method, installmentNo: d.installmentNo ? Number(d.installmentNo) : null, note: d.note, receiptNo: `R-${String(S.next('receipt')).padStart(4, '0')}` }, `Pago de ${U.money(amount)} de ${D.fullName(p)}`);
      m.markClean(); m.close(true);
      const nb = D.balance(pid).balance;
      ui.toast(`Pago registrado. Saldo pendiente: ${U.money(Math.max(0, nb))}.`);
      OS.app.refresh();
      receipt(rec.id);
    };
  }

  function accountFor(el, pid) {
    const b = D.balance(pid); const led = D.ledger(pid); const acc = D.quotesOf(pid).filter((q) => q.status === 'aceptado' && q.installments);
    el.innerHTML = `<div class="kpis"><div class="kpi"><small>Total tratamientos</small><b>${U.money(b.charged)}</b><span class="sub">presupuestos aceptados</span></div><div class="kpi"><small>Pagado</small><b>${U.money(b.paid)}</b></div>
      <div class="kpi ${b.balance > 0 ? 'accent' : ''}"><small>Saldo</small><b>${U.money(b.balance)}</b><span class="sub">${b.balance > 0 ? 'pendiente de cobro' : b.balance < 0 ? 'saldo a favor' : 'al día'}</span></div></div>
      <div class="row gap wrap"><button class="btn btn-primary" id="ac-pay">${ui.icon('card')}<span>Registrar pago</span></button>${b.balance > 0 ? OS.wa.button(pid, { key: 'pago', label: 'Recordar pago' }) : ''}</div>
      <section class="panel"><h3>${ui.icon('list')} Cuenta corriente</h3>${led.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Fecha</th><th>Movimiento</th><th class="r">Cargo</th><th class="r">Pago</th><th class="r">Saldo</th><th></th></tr></thead><tbody>
        ${led.map((r) => `<tr><td data-l="Fecha">${U.fmtDate(r.date)}</td><td>${esc(r.text)}</td><td class="r" data-l="Cargo">${r.debit ? U.money(r.debit) : ''}</td><td class="r" data-l="Pago">${r.credit ? U.money(r.credit) : ''}</td><td class="r" data-l="Saldo"><b>${U.money(r.balance)}</b></td><td class="r">${r.kind === 'pago' ? `<button class="btn btn-sm btn-ghost" data-rc="${r.ref}">${ui.icon('file')}<span>Recibo</span></button>` : `<button class="btn btn-sm btn-ghost" data-q="${r.ref}">${ui.icon('eye')}<span>Ver</span></button>`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin movimientos. Los cargos aparecen al aceptar un presupuesto.</p>'}</section>
      ${acc.map((q) => `<section class="panel"><h3>${ui.icon('calendar')} Cuotas · presupuesto ${q.number}</h3><div class="table-wrap"><table class="tbl"><thead><tr><th>Cuota</th><th>Vence</th><th class="r">Monto</th><th class="r">Pagado</th><th>Estado</th></tr></thead><tbody>${D.schedule(q).map((s) => `<tr><td>${s.no}/${q.installments.count}</td><td>${U.fmtDate(s.due)}</td><td class="r">${U.money(s.amount)}</td><td class="r">${U.money(s.covered)}</td><td>${ui.badge(s.status)}</td></tr>`).join('')}</tbody></table></div></section>`).join('')}`;
    el.querySelector('#ac-pay').onclick = () => form({ patientId: pid });
    el.querySelectorAll('[data-rc]').forEach((x) => (x.onclick = () => receipt(x.dataset.rc)));
    el.querySelectorAll('[data-q]').forEach((x) => (x.onclick = () => OS.app.go('quote', { id: x.dataset.q })));
  }

  return { render, form, accountFor, receipt, METHODS, perm: 'cobros' };
})();
