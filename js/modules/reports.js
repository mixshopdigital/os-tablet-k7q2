/* ODONTO SMART — Reportes financieros, clínicos, comerciales y de agenda con exportación CSV/Excel/PDF. */
OS.views.reports = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const PERIODS = [['mes', 'Este mes'], ['anterior', 'Mes anterior'], ['trimestre', 'Últimos 3 meses'], ['anio', 'Últimos 12 meses']];

  function range(p) {
    const t = U.today(); const m0 = t.slice(0, 8) + '01';
    if (p === 'anterior') { const s = U.addMonths(m0, -1); return [s, U.addDays(m0, -1)]; }
    if (p === 'trimestre') return [U.addMonths(m0, -2), t];
    if (p === 'anio') return [U.addMonths(m0, -11), t];
    return [m0, t];
  }
  const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(n));

  function compute(from, to) {
    const d = S.data; const inR = (x) => x && x >= from && x <= to;
    const pays = d.payments.filter((p) => inR(p.date));
    const labCost = U.sum(d.labOrders.filter((o) => inR(o.sentDate)), (o) => o.cost);
    const purchases = U.sum(d.inventoryMoves.filter((m) => m.type === 'entrada' && inR(m.date)), (m) => m.qty * (S.get('inventory', m.itemId)?.cost || 0));
    const quotes = d.quotes.filter((q) => inR(q.date));
    const acc = d.quotes.filter((q) => q.status === 'aceptado' && inR(q.acceptedAt || q.date));
    const appts = d.appointments.filter((a) => inR(a.date) && a.date <= U.today());
    const notes = d.clinicalNotes.filter((n) => inR(n.date));
    const procs = {}; acc.forEach((q) => q.items.forEach((i) => { procs[i.name] = procs[i.name] || { n: 0, amount: 0 }; procs[i.name].n += Number(i.qty) || 1; procs[i.name].amount += (Number(i.qty) || 1) * i.price; }));
    const patientsSeen = new Set([...appts.filter((a) => a.status === 'atendida').map((a) => a.patientId), ...notes.map((n) => n.patientId)]);
    const newP = d.patients.filter((p) => inR(U.toISO(new Date(p.createdAt))));
    const recovered = [...patientsSeen].filter((pid) => { const prev = D.apptsOf(pid).filter((a) => a.status === 'atendida' && a.date < from).map((a) => a.date).sort().pop(); return prev && U.daysBetween(prev, from) >= 180; });
    const months = []; for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = U.addMonths(m + '-01', 1).slice(0, 7)) months.push(m);
    return {
      income: U.sum(pays, (p) => p.amount), expenses: labCost + purchases, labCost, purchases, debts: D.totalReceivable(),
      billed: U.sum(acc, (q) => D.quoteTotals(q).total), pays, byMethod: U.groupBy(pays, (p) => p.method),
      monthly: months.map((m) => ({ label: U.MONTHS[Number(m.slice(5)) - 1].slice(0, 3), value: U.sum(pays.filter((p) => p.date.startsWith(m)), (p) => p.amount) })),
      procs: Object.entries(procs).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.n - a.n),
      consults: notes.length, patientsSeen: patientsSeen.size, newPatients: newP.length, recurrent: [...patientsSeen].filter((id) => !newP.some((p) => p.id === id)).length, recovered: recovered.length,
      quotes: quotes.length, accepted: quotes.filter((q) => q.status === 'aceptado').length, rejected: quotes.filter((q) => q.status === 'rechazado').length, pending: quotes.filter((q) => ['borrador', 'enviado'].includes(q.status)).length,
      appts: appts.length, attended: appts.filter((a) => a.status === 'atendida').length, cancelled: appts.filter((a) => a.status === 'cancelada').length, noShow: appts.filter((a) => a.status === 'ausente').length,
      byProf: S.data.professionals.map((p) => ({ label: D.profName(p.id), value: appts.filter((a) => a.professionalId === p.id && a.status === 'atendida').length })),
    };
  }

  function render(el, params) {
    const tab = params.tab || 'financiero'; const per = params.period || 'mes'; const [from, to] = range(per); const r = compute(from, to);
    const kpi = (l, v, s = '') => `<div class="kpi ${String(v).startsWith('G') || String(v).includes('.') && String(v).length > 8 ? 'money' : ''}"><small>${l}</small><b>${v}</b>${s ? `<span class="sub">${s}</span>` : ''}</div>`;
    const sections = {
      financiero: () => `<div class="kpis">${kpi('Ingresos (cobrado)', U.money(r.income), `${r.pays.length} pagos`)}${kpi('Egresos registrados', U.money(r.expenses), 'laboratorio + compras de insumos')}${kpi('Resultado', U.money(r.income - r.expenses))}${kpi('Facturado (aceptado)', U.money(r.billed))}${kpi('Deudas de pacientes', U.money(r.debts), 'saldo total actual')}</div>
        <div class="grid-2"><section class="panel"><h3>Ingresos por mes</h3>${ui.barChart(r.monthly, { format: short })}</section><section class="panel"><h3>Por método de pago</h3>${ui.hBars(Object.entries(r.byMethod).map(([k, v]) => ({ label: k, value: U.sum(v, (p) => p.amount) })), { format: short })}</section></div>
        <section class="panel"><h3>Tratamientos aceptados por importe</h3>${ui.hBars(r.procs.slice().sort((a, b) => b.amount - a.amount).slice(0, 8).map((p) => ({ label: p.label, value: p.amount })), { format: short })}</section>`,
      clinico: () => `<div class="kpis">${kpi('Pacientes atendidos', r.patientsSeen)}${kpi('Consultas registradas', r.consults)}${kpi('Procedimientos aceptados', U.sum(r.procs, (p) => p.n))}${kpi('Pacientes registrados', S.data.patients.length)}</div>
        <div class="grid-2"><section class="panel"><h3>Procedimientos más realizados</h3>${ui.hBars(r.procs.slice(0, 8).map((p) => ({ label: p.label, value: p.n })))}</section><section class="panel"><h3>Atenciones por profesional</h3>${ui.hBars(r.byProf)}</section></div>`,
      comercial: () => `<div class="kpis">${kpi('Pacientes nuevos', r.newPatients)}${kpi('Pacientes recurrentes', r.recurrent)}${kpi('Pacientes recuperados', r.recovered, 'volvieron tras 6 meses o más')}${kpi('Presupuestos emitidos', r.quotes)}${kpi('Aceptados', r.accepted, r.quotes ? `${Math.round((r.accepted / r.quotes) * 100)}% de aceptación` : '')}${kpi('Rechazados', r.rejected)}${kpi('Sin respuesta', r.pending)}</div>
        <section class="panel"><h3>Embudo de presupuestos</h3>${ui.hBars([{ label: 'Emitidos', value: r.quotes }, { label: 'Aceptados', value: r.accepted }, { label: 'Rechazados', value: r.rejected }, { label: 'Pendientes', value: r.pending }])}</section>`,
      agenda: () => `<div class="kpis">${kpi('Citas', r.appts)}${kpi('Atendidas', r.attended)}${kpi('Cancelaciones', r.cancelled, r.appts ? `${Math.round((r.cancelled / r.appts) * 100)}%` : '')}${kpi('Ausencias (no-show)', r.noShow, r.appts ? `${Math.round((r.noShow / r.appts) * 100)}%` : '')}</div>
        <section class="panel"><h3>Distribución de citas</h3>${ui.hBars([{ label: 'Atendidas', value: r.attended }, { label: 'Canceladas', value: r.cancelled }, { label: 'No asistió', value: r.noShow }, { label: 'Pendientes / futuras', value: r.appts - r.attended - r.cancelled - r.noShow }])}</section>`,
    };
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Reportes</span><h1>Reportes del consultorio</h1><p>${U.fmtDate(from)} al ${U.fmtDate(to)}</p></div>
      <div class="page-actions"><button class="btn btn-ghost" id="r-xls">${ui.icon('download')}<span>Excel</span></button><button class="btn btn-ghost" id="r-csv">${ui.icon('download')}<span>CSV</span></button><button class="btn btn-primary" id="r-pdf">${ui.icon('file')}<span>Reporte PDF</span></button></div></div>
      <div class="chip-row" id="r-per">${PERIODS.map(([k, l]) => `<button class="chip ${k === per ? 'active' : ''}" data-p="${k}">${l}</button>`).join('')}</div>
      <nav class="tabs" id="r-tabs">${[['financiero', 'Financiero', 'money'], ['clinico', 'Clínico', 'clinical'], ['comercial', 'Comercial', 'chart'], ['agenda', 'Agenda', 'calendar']].map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav>
      <div style="display:grid;gap:16px">${sections[tab]()}</div>`;
    ui.tabs(el.querySelector('#r-tabs'), (k) => OS.app.refresh({ tab: k }));
    el.querySelector('#r-per').onclick = (e) => { const b = e.target.closest('[data-p]'); if (b) OS.app.refresh({ period: b.dataset.p }); };
    const rows = () => {
      if (tab === 'financiero') return [r.pays, [{ label: 'Fecha', get: (p) => U.fmtDate(p.date) }, { label: 'Recibo', get: 'receiptNo' }, { label: 'Paciente', get: (p) => D.patientName(p.patientId) }, { label: 'Método', get: 'method' }, { label: 'Monto', get: (p) => p.amount }]];
      if (tab === 'clinico') return [r.procs, [{ label: 'Procedimiento', get: 'label' }, { label: 'Cantidad', get: 'n' }, { label: 'Importe', get: 'amount' }]];
      if (tab === 'comercial') return [S.data.quotes.filter((q) => q.date >= from && q.date <= to), [{ label: 'N.º', get: 'number' }, { label: 'Fecha', get: (q) => U.fmtDate(q.date) }, { label: 'Paciente', get: (q) => D.patientName(q.patientId) }, { label: 'Total', get: (q) => D.quoteTotals(q).total }, { label: 'Estado', get: (q) => D.quoteStatus(q) }]];
      return [S.data.appointments.filter((a) => a.date >= from && a.date <= to), [{ label: 'Fecha', get: (a) => U.fmtDate(a.date) }, { label: 'Hora', get: 'time' }, { label: 'Paciente', get: (a) => D.patientName(a.patientId) }, { label: 'Tratamiento', get: 'treatment' }, { label: 'Profesional', get: (a) => D.profName(a.professionalId) }, { label: 'Estado', get: 'status' }]];
    };
    el.querySelector('#r-csv').onclick = () => { const [rs, cols] = rows(); OS.files.exportCSV(`reporte_${tab}_${from}_${to}.csv`, rs, cols); };
    el.querySelector('#r-xls').onclick = () => { const [rs, cols] = rows(); OS.files.exportExcel(`reporte_${tab}_${from}_${to}`, rs, cols, `Reporte ${tab}`); };
    el.querySelector('#r-pdf').onclick = () => {
      const blocks = {
        financiero: [{ type: 'kv', rows: [['Ingresos (cobrado)', U.money(r.income)], ['Egresos registrados', U.money(r.expenses)], ['Resultado', U.money(r.income - r.expenses)], ['Facturado (aceptado)', U.money(r.billed)], ['Deudas de pacientes', U.money(r.debts)]] }, { type: 'table', head: ['Método', 'Pagos', 'Importe'], align: ['left', 'center', 'right'], rows: Object.entries(r.byMethod).map(([k, v]) => [k, String(v.length), U.money(U.sum(v, (p) => p.amount))]) }, { type: 'table', head: ['Mes', 'Cobrado'], align: ['left', 'right'], rows: r.monthly.map((m) => [m.label, U.money(m.value)]) }],
        clinico: [{ type: 'kv', rows: [['Pacientes atendidos', String(r.patientsSeen)], ['Consultas', String(r.consults)]] }, { type: 'table', head: ['Procedimiento', 'Cantidad', 'Importe'], align: ['left', 'center', 'right'], rows: r.procs.map((p) => [p.label, String(p.n), U.money(p.amount)]) }],
        comercial: [{ type: 'kv', rows: [['Pacientes nuevos', String(r.newPatients)], ['Recurrentes', String(r.recurrent)], ['Recuperados', String(r.recovered)], ['Presupuestos emitidos', String(r.quotes)], ['Aceptados', String(r.accepted)], ['Rechazados', String(r.rejected)], ['Tasa de aceptación', r.quotes ? `${Math.round((r.accepted / r.quotes) * 100)}%` : '—']] }],
        agenda: [{ type: 'kv', rows: [['Citas', String(r.appts)], ['Atendidas', String(r.attended)], ['Canceladas', String(r.cancelled)], ['No asistió', String(r.noShow)]] }, { type: 'table', head: ['Profesional', 'Atenciones'], align: ['left', 'center'], rows: r.byProf.map((p) => [p.label, String(p.value)]) }],
      }[tab];
      OS.pdf.present(OS.pdf.reportModel(`Reporte ${tab}`, `${U.fmtDate(from)} al ${U.fmtDate(to)}`, blocks));
    };
  }

  return { render, compute, perm: 'reportes' };
})();
