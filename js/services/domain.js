/* ODONTO SMART — lógica de negocio sin interfaz.
   Saldos, cuotas, estado de piezas, recall, alertas y sugerencias.
   Todo se calcula a partir de los datos guardados: nada se escribe dos veces. */
OS.domain = (() => {
  const U = OS.util;
  const D = () => OS.store.data;

  // ---------- Pacientes ----------
  const fullName = (p) => (p ? `${p.firstName} ${p.lastName}`.trim() : '—');
  const patient = (id) => OS.store.get('patients', id);
  const patientName = (id) => fullName(patient(id));
  const firstName = (id) => patient(id)?.firstName || '';
  const professional = (id) => OS.store.get('professionals', id);
  const profName = (id) => { const p = professional(id); return p ? `${p.title || ''} ${p.name}`.trim() : '—'; };

  const apptsOf = (pid) => D().appointments.filter((a) => a.patientId === pid);
  function lastVisit(pid) {
    const att = apptsOf(pid).filter((a) => a.status === 'atendida').map((a) => a.date);
    const notes = D().clinicalNotes.filter((n) => n.patientId === pid).map((n) => n.date);
    return [...att, ...notes].sort().pop() || null;
  }
  function nextAppt(pid) {
    const t = U.today();
    return apptsOf(pid).filter((a) => a.date >= t && ['pendiente', 'confirmada'].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0] || null;
  }
  const isNew = (p) => U.daysBetween(U.toISO(new Date(p.createdAt)), U.today()) <= 30;

  // ---------- Presupuestos y cuenta corriente ----------
  function quoteTotals(q) {
    const subtotal = U.sum(q.items || [], (i) => (Number(i.qty) || 1) * (Number(i.price) || 0));
    const discount = Math.min(subtotal, Math.max(0, Number(q.discount) || 0));
    return { subtotal, discount, total: subtotal - discount };
  }
  const quotesOf = (pid) => D().quotes.filter((q) => q.patientId === pid);
  const paymentsOf = (pid) => D().payments.filter((p) => p.patientId === pid);
  const paidFor = (quoteId) => U.sum(D().payments.filter((p) => p.quoteId === quoteId), (p) => p.amount);
  function quoteStatus(q) {
    if (['enviado', 'borrador'].includes(q.status) && q.validDays && U.daysBetween(q.date, U.today()) > q.validDays) return 'vencido';
    return q.status;
  }
  /** Saldo = tratamientos aceptados − pagos. */
  function balance(pid) {
    const charged = U.sum(quotesOf(pid).filter((q) => q.status === 'aceptado'), (q) => quoteTotals(q).total);
    const paid = U.sum(paymentsOf(pid), (p) => p.amount);
    return { charged, paid, balance: charged - paid };
  }
  /** Cuenta corriente: movimientos con saldo acumulado. */
  function ledger(pid) {
    const rows = [
      ...quotesOf(pid).filter((q) => q.status === 'aceptado').map((q) => ({ date: q.acceptedAt || q.date, kind: 'cargo', text: `Presupuesto N.º ${q.number} aceptado`, debit: quoteTotals(q).total, credit: 0, ref: q.id })),
      ...paymentsOf(pid).map((p) => ({ date: p.date, kind: 'pago', text: `Pago ${p.method}${p.installmentNo ? ` · cuota ${p.installmentNo}` : ''} · Recibo ${p.receiptNo}`, debit: 0, credit: p.amount, ref: p.id })),
    ].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'cargo' ? -1 : 1));
    let run = 0;
    return rows.map((r) => { run += r.debit - r.credit; return { ...r, balance: run }; });
  }

  /** Plan de cuotas: reparte el total y aplica los pagos en orden. */
  function schedule(q) {
    const n = Number(q.installments?.count) || 0;
    if (!n) return [];
    const { total } = quoteTotals(q);
    const base = Math.floor(total / n / 1000) * 1000 || Math.floor(total / n);
    let paid = paidFor(q.id);
    const t = U.today();
    return Array.from({ length: n }, (_, i) => {
      const amount = i === n - 1 ? total - base * (n - 1) : base;
      const due = U.addMonths(q.installments.start || q.date, i);
      const covered = Math.min(amount, Math.max(0, paid)); paid -= amount;
      let status = covered >= amount ? 'pagada' : due < t ? 'vencida' : U.daysBetween(t, due) <= 15 ? 'proxima' : 'futura';
      return { no: i + 1, due, amount, covered, status };
    });
  }
  const overdueInstallments = () => D().quotes.filter((q) => q.status === 'aceptado').flatMap((q) => schedule(q).filter((s) => s.status === 'vencida').map((s) => ({ ...s, quote: q })));

  // ---------- Odontograma ----------
  const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  const UPPER_KID = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
  const LOWER_KID = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
  const SURFACES = [['O', 'Oclusal / incisal'], ['M', 'Mesial'], ['D', 'Distal'], ['V', 'Vestibular'], ['L', 'Lingual / palatina']];
  const STATES = {
    sana: { label: 'Sana', scope: 'any', color: 'var(--t-sana)' },
    caries: { label: 'Caries', scope: 'surface', color: 'var(--t-caries)' },
    restauracion: { label: 'Restauración', scope: 'surface', color: 'var(--t-resto)' },
    sellante: { label: 'Sellante', scope: 'surface', color: 'var(--t-sellante)' },
    fractura: { label: 'Fractura', scope: 'surface', color: 'var(--t-fractura)' },
    corona: { label: 'Corona', scope: 'tooth', color: 'var(--t-corona)' },
    endodoncia: { label: 'Endodoncia', scope: 'tooth', color: 'var(--t-endo)' },
    implante: { label: 'Implante', scope: 'tooth', color: 'var(--t-implante)' },
    protesis: { label: 'Prótesis', scope: 'tooth', color: 'var(--t-protesis)' },
    ausente: { label: 'Ausente', scope: 'tooth', color: 'var(--t-ausente)' },
    extraccion: { label: 'Extracción indicada', scope: 'tooth', color: 'var(--t-caries)' },
    otro: { label: 'Otro', scope: 'any', color: 'var(--t-otro)' },
  };
  function toothName(n) {
    const q = Math.floor(n / 10); const p = n % 10; const kid = q >= 5;
    const pos = kid ? ['', 'incisivo central', 'incisivo lateral', 'canino', 'primer molar', 'segundo molar'][p] : ['', 'incisivo central', 'incisivo lateral', 'canino', 'primer premolar', 'segundo premolar', 'primer molar', 'segundo molar', 'tercer molar'][p];
    const side = { 1: 'superior derecho', 2: 'superior izquierdo', 3: 'inferior izquierdo', 4: 'inferior derecho', 5: 'superior derecho', 6: 'superior izquierdo', 7: 'inferior izquierdo', 8: 'inferior derecho' }[q];
    return `${pos.charAt(0).toUpperCase() + pos.slice(1)} ${side}${kid ? ' (temporal)' : ''}`;
  }
  const toothRecords = (pid, tooth) => D().toothRecords.filter((r) => r.patientId === pid && (tooth == null || r.tooth === tooth)).sort((a, b) => (a.date + (a.createdAt || 0)).localeCompare(b.date + (b.createdAt || 0)));
  /** Estado actual de una pieza: { whole, surfaces:{O:'caries',...}, notes } */
  function toothState(pid, tooth) {
    const st = { whole: null, surfaces: {}, count: 0 };
    toothRecords(pid, tooth).forEach((r) => {
      if (r.kind === 'nota' || r.kind === 'imagen') { st.count++; return; }
      st.count++;
      const def = STATES[r.state]; if (!def) return;
      if (r.state === 'sana') { if (r.surfaces?.length) r.surfaces.forEach((s) => delete st.surfaces[s]); else { st.whole = null; st.surfaces = {}; } return; }
      if (def.scope === 'tooth' || (def.scope === 'any' && !r.surfaces?.length)) st.whole = r.state;
      else (r.surfaces || []).forEach((s) => { st.surfaces[s] = r.state; });
    });
    return st;
  }
  /** Estado del odontograma que resulta de realizar un tratamiento del catálogo. */
  function stateForTreatment(name) {
    const map = [[/resina|restauraci/i, 'restauracion'], [/endodoncia/i, 'endodoncia'], [/corona/i, 'corona'], [/extracci/i, 'ausente'], [/implante/i, 'implante'], [/sellante/i, 'sellante'], [/prótesis|protesis/i, 'protesis']];
    return map.find(([re]) => re.test(name || ''))?.[1] || null;
  }
  /** Registra en el odontograma un tratamiento realizado (si corresponde a un estado visible). */
  function recordTreatmentDone(pid, tooth, name, date, surfaces) {
    const n = Number(tooth); const state = stateForTreatment(name);
    if (!n || !state) return null;
    const cur = toothState(pid, n);
    const carious = Object.keys(cur.surfaces).filter((k) => cur.surfaces[k] === 'caries');
    const surf = STATES[state].scope !== 'surface' ? [] : surfaces?.length ? surfaces : carious.length ? carious : ['O'];
    return OS.store.insert('toothRecords', { patientId: pid, tooth: n, state, surfaces: surf, kind: 'tratamiento', date: date || OS.util.today(), note: name, professionalId: OS.auth.current()?.professionalId || null });
  }
  function odontoSummary(pid) {
    const out = { caries: 0, restauracion: 0, ausente: 0, otros: 0 };
    [...UPPER, ...LOWER].forEach((t) => { const s = toothState(pid, t); const vals = Object.values(s.surfaces); if (vals.includes('caries')) out.caries++; if (vals.includes('restauracion')) out.restauracion++; if (s.whole === 'ausente') out.ausente++; else if (s.whole) out.otros++; });
    return out;
  }

  // ---------- Historia clínica ----------
  function medicalAlerts(pid) {
    const m = D().medical[pid]; if (!m) return [];
    const a = [];
    if (m.allergies) a.push({ type: 'Alergia', text: m.allergies, level: 'danger' });
    if (m.medications) a.push({ type: 'Medicación', text: m.medications, level: 'warn' });
    const cond = [m.diabetes && 'Diabetes', m.hypertension && 'Hipertensión', m.cardio && 'Cardiopatía', m.coagulation && 'Problemas de coagulación', m.pregnant && 'Embarazo'].filter(Boolean);
    if (cond.length) a.push({ type: 'Condición médica', text: cond.join(' · '), level: 'warn' });
    return a;
  }

  // ---------- Inventario y laboratorio ----------
  const lowStock = () => D().inventory.filter((i) => Number(i.stock) <= Number(i.min));
  const expiring = (days = 60) => D().inventory.filter((i) => i.expiry && U.daysBetween(U.today(), i.expiry) <= days);
  function labStatus(o) {
    if (o.receivedDate) return 'lab_recibido';
    if (o.dueDate && o.dueDate < U.today()) return 'lab_retrasado';
    return o.status === 'proceso' ? 'lab_proceso' : 'lab_enviado';
  }

  // ---------- Recall: pacientes para recuperar ----------
  function recall() {
    const t = U.today(); const out = [];
    D().patients.filter((p) => p.status !== 'inactivo').forEach((p) => {
      const last = lastVisit(p.id); const next = nextAppt(p.id);
      const reasons = [];
      if (!next && last && U.daysBetween(last, t) >= 180) reasons.push({ key: 'control', label: 'Debe realizar control', weight: 3 });
      else if (!next && last && U.daysBetween(last, t) >= 90) reasons.push({ key: 'sin_volver', label: 'No volvió desde hace más de 3 meses', weight: 2 });
      const pend = quotesOf(p.id).filter((q) => ['enviado', 'borrador'].includes(q.status));
      if (pend.length) reasons.push({ key: 'presupuesto', label: `Presupuesto N.º ${pend[0].number} sin respuesta`, weight: 2 });
      const inc = quotesOf(p.id).filter((q) => q.status === 'aceptado' && q.items.some((i) => !i.done));
      if (inc.length && !next) reasons.push({ key: 'incompleto', label: 'Tratamiento incompleto sin próxima cita', weight: 3 });
      const canc = apptsOf(p.id).filter((a) => ['cancelada', 'ausente'].includes(a.status)).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (canc && !next && (!last || canc.date > last)) reasons.push({ key: 'cancelada', label: canc.status === 'ausente' ? 'No asistió y no reprogramó' : 'Cita cancelada sin reprogramar', weight: 2 });
      if (reasons.length) {
        const lastAppt = apptsOf(p.id).filter((a) => a.status === 'atendida').sort((a, b) => b.date.localeCompare(a.date))[0];
        out.push({ patient: p, last, lastReason: lastAppt?.treatment || '—', months: last ? U.monthsAgo(last) : null, reasons, score: U.sum(reasons, (r) => r.weight) });
      }
    });
    return out.sort((a, b) => b.score - a.score);
  }

  // ---------- Resumen del día, alertas y sugerencias ----------
  function today() {
    const t = U.today();
    const appts = D().appointments.filter((a) => a.date === t).sort((a, b) => a.time.localeCompare(b.time));
    const income = U.sum(D().payments.filter((p) => p.date === t), (p) => p.amount);
    const pendingToday = U.sum(appts.filter((a) => a.status === 'atendida'), (a) => Math.max(0, balance(a.patientId).balance));
    return {
      appts,
      total: appts.filter((a) => a.status !== 'cancelada').length,
      attended: appts.filter((a) => a.status === 'atendida').length,
      pending: appts.filter((a) => ['pendiente', 'confirmada'].includes(a.status)).length,
      absent: appts.filter((a) => a.status === 'ausente').length,
      income, pendingToday,
    };
  }
  const totalReceivable = () => U.sum(D().patients, (p) => Math.max(0, balance(p.id).balance));

  function alerts() {
    const out = [];
    const pendQ = D().quotes.filter((q) => ['enviado', 'borrador'].includes(quoteStatus(q)));
    if (pendQ.length) out.push({ level: 'warn', icon: 'quote', text: `${U.plural(pendQ.length, 'presupuesto pendiente', 'presupuestos pendientes')} de respuesta.`, go: ['quotes', { filter: 'pendientes' }] });
    const ctrl = recall().filter((r) => r.reasons.some((x) => x.key === 'control'));
    if (ctrl.length) out.push({ level: 'info', icon: 'refresh', text: `${U.plural(ctrl.length, 'paciente debe', 'pacientes deben')} realizar control.`, go: ['followups', {}] });
    lowStock().slice(0, 3).forEach((i) => out.push({ level: 'warn', icon: 'box', text: `Stock bajo de ${i.name}: quedan ${i.stock} ${i.unit || 'u.'}`, go: ['inventory', { filter: 'bajo' }] }));
    const exp = expiring(45); if (exp.length) out.push({ level: 'warn', icon: 'clock', text: `${U.plural(exp.length, 'producto vence', 'productos vencen')} en los próximos 45 días.`, go: ['inventory', { filter: 'vence' }] });
    const od = overdueInstallments(); if (od.length) out.push({ level: 'danger', icon: 'money', text: `${U.plural(od.length, 'cuota vencida', 'cuotas vencidas')} sin pagar.`, go: ['payments', { tab: 'cuotas' }] });
    const late = D().labOrders.filter((o) => labStatus(o) === 'lab_retrasado'); if (late.length) out.push({ level: 'danger', icon: 'flask', text: `${U.plural(late.length, 'trabajo de laboratorio retrasado', 'trabajos de laboratorio retrasados')}.`, go: ['lab', {}] });
    return out;
  }

  function suggestions() {
    const t = U.today(); const out = [];
    const active = D().patients.filter((p) => p.status !== 'inactivo');
    const noNext = active.filter((p) => !nextAppt(p.id) && lastVisit(p.id));
    if (noNext.length) out.push({ icon: 'calendar', text: `${U.plural(noNext.length, 'paciente no tiene', 'pacientes no tienen')} próxima cita.`, go: ['patients', { filter: 'sin_cita' }] });
    const sent = D().quotes.filter((q) => q.status === 'enviado');
    if (sent.length) out.push({ icon: 'quote', text: `${U.plural(sent.length, 'presupuesto fue enviado', 'presupuestos fueron enviados')} y todavía no ${sent.length === 1 ? 'fue aceptado' : 'fueron aceptados'}.`, go: ['quotes', { filter: 'pendientes' }] });
    const month = t.slice(0, 7);
    const ctrlMonth = active.filter((p) => { const l = lastVisit(p.id); return l && U.addMonths(l, 6).slice(0, 7) <= month && !nextAppt(p.id); });
    if (ctrlMonth.length) out.push({ icon: 'refresh', text: `${U.plural(ctrlMonth.length, 'paciente debería', 'pacientes deberían')} realizar control este mes.`, go: ['followups', {}] });
    const rec = totalReceivable(); if (rec > 0) out.push({ icon: 'money', text: `${U.money(rec)} están pendientes de cobro.`, go: ['payments', { tab: 'deudores' }] });
    const low = lowStock(); if (low.length) out.push({ icon: 'box', text: `${U.plural(low.length, 'producto está', 'productos están')} por agotarse.`, go: ['inventory', { filter: 'bajo' }] });
    const tomorrow = D().appointments.filter((a) => a.date === U.addDays(t, 1) && a.status === 'pendiente');
    if (tomorrow.length) out.push({ icon: 'whatsapp', text: `${U.plural(tomorrow.length, 'cita de mañana falta', 'citas de mañana faltan')} confirmar.`, go: ['followups', { tab: 'recordatorios' }] });
    return out;
  }

  /** Genera notificaciones internas una vez por día (deduplicadas por clave). */
  function refreshNotifications() {
    const t = U.today(); const S = OS.store;
    lowStock().forEach((i) => S.notify('stock', `Stock bajo: ${i.name}`, ['inventory', { filter: 'bajo' }], `stock:${i.id}:${t}`));
    overdueInstallments().forEach((s) => S.notify('pago', `Cuota ${s.no} vencida de ${patientName(s.quote.patientId)}`, ['patient', { id: s.quote.patientId, tab: 'cobros' }], `cuota:${s.quote.id}:${s.no}`));
    D().quotes.filter((q) => q.status === 'enviado' && U.daysBetween(q.date, t) >= 7).forEach((q) => S.notify('presupuesto', `Presupuesto N.º ${q.number} de ${patientName(q.patientId)} sin respuesta`, ['quote', { id: q.id }], `pres:${q.id}`));
    D().labOrders.filter((o) => labStatus(o) === 'lab_retrasado').forEach((o) => S.notify('laboratorio', `Laboratorio retrasado: ${o.work} (${patientName(o.patientId)})`, ['lab', {}], `lab:${o.id}`));
    D().appointments.filter((a) => a.date === t && ['pendiente', 'confirmada'].includes(a.status)).forEach((a) => S.notify('cita', `Hoy ${a.time}: ${patientName(a.patientId)}`, ['agenda', { date: t }], `cita:${a.id}`));
  }

  /** Variables para plantillas de mensajes. */
  function messageVars(pid, extra = {}) {
    const p = patient(pid); const c = D().clinic; const n = nextAppt(pid); const b = balance(pid).balance;
    return { Nombre: p?.firstName || '', 'Nombre completo': fullName(p), Consultorio: c.name || 'el consultorio', monto: U.thousands(Math.max(0, b)), saldo: U.money(Math.max(0, b)), ...(n ? { fecha: U.fmtDate(n.date), hora: n.time, tratamiento: n.treatment || '' } : {}), ...extra }; // sin cita: [fecha] y [hora] quedan visibles para completarlos
  }

  return { fullName, patient, patientName, firstName, professional, profName, apptsOf, lastVisit, nextAppt, isNew, quoteTotals, quotesOf, paymentsOf, paidFor, quoteStatus, balance, ledger, schedule, overdueInstallments, UPPER, LOWER, UPPER_KID, LOWER_KID, SURFACES, STATES, toothName, toothRecords, toothState, stateForTreatment, recordTreatmentDone, odontoSummary, medicalAlerts, lowStock, expiring, labStatus, recall, today, totalReceivable, alerts, suggestions, refreshNotifications, messageVars };
})();
