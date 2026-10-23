/* ODONTO SMART — Inicio: resumen del día, agenda, alertas, sugerencias e indicadores del mes. */
OS.views.dashboard = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const { esc } = U;

  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; }
  const statusColor = { pendiente: 'var(--warn)', confirmada: 'var(--info)', atendida: 'var(--ok)', cancelada: 'var(--danger)', ausente: 'var(--muted)' };

  function monthStats() {
    const d = OS.store.data; const m = U.today().slice(0, 7);
    const inMonth = (x) => (x || '').slice(0, 7) === m;
    const pays = d.payments.filter((p) => inMonth(p.date));
    const quotes = d.quotes.filter((q) => inMonth(q.date));
    const accepted = quotes.filter((q) => q.status === 'aceptado');
    const appts = d.appointments.filter((a) => inMonth(a.date) && a.date <= U.today());
    const billed = U.sum(d.quotes.filter((q) => q.status === 'aceptado' && inMonth(q.acceptedAt || q.date)), (q) => D.quoteTotals(q).total);
    const collected = U.sum(pays, (p) => p.amount);
    const visits = new Set(appts.filter((a) => a.status === 'atendida').map((a) => a.patientId));
    return {
      newPatients: d.patients.filter((p) => inMonth(U.toISO(new Date(p.createdAt)))).length,
      active: d.patients.filter((p) => p.status !== 'inactivo').length,
      billed, collected, receivable: D.totalReceivable(),
      ticket: visits.size ? Math.round(collected / visits.size) : 0,
      quotes: quotes.length, accepted: accepted.length, rate: quotes.length ? Math.round((accepted.length / quotes.length) * 100) : 0,
      noShow: appts.filter((a) => a.status === 'ausente').length, cancel: appts.filter((a) => a.status === 'cancelada').length,
    };
  }
  function last6() {
    return Array.from({ length: 6 }, (_, i) => { const iso = U.addMonths(U.today().slice(0, 7) + '-01', i - 5); const k = iso.slice(0, 7); return { label: U.MONTHS[Number(k.slice(5)) - 1].slice(0, 3), value: U.sum(OS.store.data.payments.filter((p) => p.date.slice(0, 7) === k), (p) => p.amount) }; });
  }
  function topTreatments() {
    const c = {}; OS.store.data.quotes.filter((q) => q.status === 'aceptado').forEach((q) => q.items.forEach((i) => { c[i.name] = c[i.name] || { n: 0, amount: 0 }; c[i.name].n += Number(i.qty) || 1; c[i.name].amount += (Number(i.qty) || 1) * i.price; }));
    return Object.entries(c).map(([label, v]) => ({ label, ...v }));
  }
  const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : n >= 1e3 ? `${Math.round(n / 1e3)} mil` : String(n));

  const HERO_ART = `<svg class="art" viewBox="0 0 200 180" aria-hidden="true"><defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#CFF7F2"/></linearGradient></defs>
    <circle cx="100" cy="92" r="70" fill="rgba(255,255,255,.12)"/><circle cx="100" cy="92" r="50" fill="rgba(255,255,255,.12)"/>
    <path d="M100 42c-9-7-18-9-25-9-14 0-22 11-22 26 0 13 5 19 9 30 4 14 5 34 14 34 8 0 8-24 13-31 3-4 6-5 11-5s8 1 11 5c5 7 5 31 13 31 9 0 10-20 14-34 4-11 9-17 9-30 0-15-8-26-22-26-7 0-16 2-25 9z" fill="url(#hg)"/>
    <path d="M77 62c8 9 16 13 23 13s15-4 23-13" fill="none" stroke="#2AB7A9" stroke-width="5" stroke-linecap="round"/>
    <g fill="#fff"><path class="twk" d="M160 30l3.500 8.500 8.500 3.500-8.500 3.500-3.500 8.500-3.500-8.500-8.500-3.500 8.500-3.500z"/><path class="twk" style="animation-delay:.7s" d="M40 34l2.500 6 6 2.500-6 2.500-2.500 6-2.500-6-6-2.500 6-2.500z"/><circle class="twk" style="animation-delay:1.2s" cx="168" cy="110" r="4"/><circle class="twk" style="animation-delay:.4s" cx="34" cy="120" r="3"/></g></svg>`;

  const go = (v, p) => () => OS.app.go(v, p || {});
  const STEPS = [
    { label: 'Subí tu logo y datos del consultorio', icon: 'settings', done: () => !!OS.store.data.clinic.logo, go: go('settings') },
    { label: 'Cargá tu primer paciente', icon: 'users', done: () => OS.store.data.patients.length > 0, go: go('patients') },
    { label: 'Registrá un hallazgo en el odontograma', icon: 'tooth', done: () => OS.store.data.toothRecords.length > 0, go: go('odontogram') },
    { label: 'Armá tu primer presupuesto', icon: 'quote', done: () => OS.store.data.quotes.length > 0, go: go('quotes') },
    { label: 'Registrá un cobro', icon: 'money', done: () => OS.store.data.payments.length > 0, go: go('payments') },
    { label: 'Subí fotos de antes y después', icon: 'camera', done: () => OS.store.data.documents.some((d) => d.pair), go: go('documents') },
    { label: 'Enviá un mensaje por WhatsApp', icon: 'whatsapp', done: () => !!OS.store.data.meta.waSent, go: () => OS.app.go(OS.views.messages ? 'messages' : 'followups') },
    { label: 'Hacé tu copia de seguridad', icon: 'download', done: () => !!OS.store.data.meta.lastBackup, go: go('settings', { tab: 'backup' }) },
  ];
  function stepsHtml() {
    const m = OS.store.data.meta; if (m.stepsHidden || m.demo) return '';
    const done = STEPS.filter((x) => x.done()).length; if (done === STEPS.length) return '';
    const pct = Math.round((done / STEPS.length) * 100);
    return `<section class="panel steps-card"><div class="ring" style="--p:${pct}">${pct}%</div><div><div class="panel-head"><h3>${ui.icon('target')}Primeros pasos · ${done} de ${STEPS.length}</h3><button class="link small" id="st-hide">Ocultar</button></div>
      <div class="step-list">${STEPS.map((x, i) => `<button class="step ${x.done() ? 'done' : ''}" data-step="${i}"><i>${ui.icon('check')}</i><span>${esc(x.label)}</span></button>`).join('')}</div></div></section>`;
  }

  function render(el) {
    const u = OS.auth.current(); const prof = u?.professionalId && D.professional(u.professionalId);
    const name = prof ? `${prof.title} ${prof.name.split(' ')[0]}` : u.name.split(' ')[0];
    const t = D.today(); const alerts = D.alerts(); const sug = D.suggestions(); const ms = monthStats();
    const canMoney = OS.auth.can('cobros');
    const top = topTreatments(); const most = [...top].sort((a, b) => b.n - a.n)[0]; const rich = [...top].sort((a, b) => b.amount - a.amount)[0];
    const lead = t.total ? `Hoy tenés ${t.total} ${t.total === 1 ? 'cita' : 'citas'} y ${t.pending} ${t.pending === 1 ? 'está' : 'están'} por atender.` : 'Hoy no hay citas agendadas. Buen momento para contactar pacientes.';
    const can = (p) => OS.auth.can(p);
    const quick = [
      can('pacientes') && { icon: 'users', c: 'var(--c-pacientes)', label: 'Nuevo paciente', sub: 'Crear ficha', run: () => OS.views.patients.form() },
      can('agenda') && { icon: 'calendar', c: 'var(--c-agenda)', label: 'Nueva cita', sub: 'Agendar turno', run: () => OS.views.agenda.form({ date: U.today() }) },
      can('presupuestos') && { icon: 'quote', c: 'var(--c-presu)', label: 'Presupuesto', sub: 'PDF por WhatsApp', run: () => OS.app.go('quotes') },
      can('cobros') && { icon: 'money', c: 'var(--c-cobros)', label: 'Cobrar', sub: 'Pagos y recibos', run: () => OS.app.go('payments') },
      can('seguimientos') && OS.views.messages && { icon: 'whatsapp', c: 'var(--c-msg)', label: 'Mensajes de hoy', sub: 'WhatsApp en un clic', run: () => OS.app.go('messages') },
      can('documentos') && { icon: 'camera', c: 'var(--c-lab)', label: 'Antes y después', sub: 'Fotos del tratamiento', run: async () => { const id = await OS.app.pickPatient('Fotos antes y después: elegir paciente'); if (id) OS.app.go('patient', { id, tab: 'fotos' }); } },
    ].filter(Boolean);
    const stepsCard = stepsHtml();
    el.innerHTML = `
      <section class="hero"><div class="copy"><p class="date">${esc(U.longDate(U.today()))}</p><h1>${greeting()}, <em>${esc(name)}</em></h1>
        <p class="lead">${esc(lead)}</p></div>${HERO_ART}</section>
      <section class="qa-grid" aria-label="Accesos rápidos">${quick.map((q, i) => `<button class="qa" style="--c:${q.c}" data-qa="${i}"><i>${ui.icon(q.icon)}</i><span>${esc(q.label)}<small>${esc(q.sub)}</small></span></button>`).join('')}</section>
      ${stepsCard}
      <section class="kpis" aria-label="Resumen de hoy">
        <button class="kpi accent" data-goto="agenda"><small>${ui.icon('calendar')}Citas de hoy</small><b data-count="${t.total}">${t.total}</b><span class="sub">${t.pending} por atender</span></button>
        <div class="kpi k-ok"><small>${ui.icon('check')}Pacientes atendidos</small><b data-count="${t.attended}">${t.attended}</b><span class="sub">de ${t.total} programados</span></div>
        <div class="kpi k-warn"><small>${ui.icon('clock')}Pendientes</small><b data-count="${t.pending}">${t.pending}</b><span class="sub">confirmadas y por confirmar</span></div>
        <div class="kpi k-danger"><small>${ui.icon('x')}Ausencias</small><b data-count="${t.absent}">${t.absent}</b><span class="sub">no asistieron hoy</span></div>
        ${canMoney ? `<button class="kpi k-ok" data-goto="payments"><small>${ui.icon('money')}Ingresos de hoy</small><b data-count="${t.income}" data-fmt="money">${U.money(t.income)}</b><span class="sub">${OS.store.data.payments.filter((p) => p.date === U.today()).length} cobros registrados</span></button>
        <button class="kpi k-gold" data-goto="payments" data-tab="deudores"><small>${ui.icon('card')}Pendiente de cobro</small><b data-count="${t.pendingToday}" data-fmt="money">${U.money(t.pendingToday)}</b><span class="sub">de pacientes atendidos hoy</span></button>` : ''}
      </section>
      <div class="grid-main">
        <section class="panel"><div class="panel-head"><h2>${ui.icon('calendar')}Agenda de hoy</h2><button class="btn btn-sm btn-ghost" data-goto="agenda">Ver agenda ${ui.icon('chevron')}</button></div>
          ${t.appts.length ? `<div class="agenda-list">${t.appts.map((a) => `<div class="ag-row" data-appt="${a.id}" role="button" tabindex="0"><span class="ag-time">${a.time}<small>${a.duration} min</small></span><span class="ag-bar" style="background:${statusColor[a.status]}"></span><span class="ag-main"><b>${esc(D.patientName(a.patientId))}</b><small>${esc(a.treatment)} · ${esc(D.profName(a.professionalId))} · ${esc(a.box || '')}</small></span>${ui.badge(a.status)}</div>`).join('')}</div>`
            : ui.empty('Hoy no hay citas', 'Agenda una cita para verla aquí.', OS.auth.can('agenda') ? '<button class="btn btn-primary btn-sm" id="d-newa2">Nueva cita</button>' : '')}
        </section>
        <div style="display:grid;gap:16px">
          <section class="panel suggest-panel"><div class="panel-head"><h2>${ui.icon('spark')}ODONTO SMART te sugiere</h2></div>
            ${sug.length ? `<div class="suggest-list">${sug.map((s, i) => `<button class="suggest" data-sug="${i}">${ui.icon(s.icon)}<span>${esc(s.text)}</span>${ui.icon('chevron', 'chev')}</button>`).join('')}</div>` : '<p>Todo está al día. ¡Buen trabajo!</p>'}
          </section>
          <section class="panel"><div class="panel-head"><h2>${ui.icon('alert')}Alertas</h2></div>
            ${alerts.length ? `<div class="alert-list">${alerts.map((a, i) => `<button class="alert-item" data-alert="${i}"><span class="sev sev-${a.level}">${ui.icon(a.icon)}</span><span>${esc(a.text)}</span></button>`).join('')}</div>` : '<p class="muted">Sin alertas por ahora.</p>'}
          </section>
        </div>
      </div>
      ${canMoney ? `<section class="panel"><div class="panel-head"><h2>${ui.icon('chart')}Indicadores de ${esc(U.monthLabel(U.today()))}</h2><button class="btn btn-sm btn-ghost" data-goto="reports">Ver reportes ${ui.icon('chevron')}</button></div>
        <div class="kpis">
          <div class="kpi k-info"><small>${ui.icon('users')}Pacientes nuevos</small><b data-count="${ms.newPatients}">${ms.newPatients}</b></div><div class="kpi k-ok"><small>${ui.icon('check')}Pacientes activos</small><b data-count="${ms.active}">${ms.active}</b></div>
          <div class="kpi money k-money"><small>${ui.icon('quote')}Facturación</small><b data-count="${ms.billed}" data-fmt="money">${U.money(ms.billed)}</b><span class="sub">tratamientos aceptados</span></div><div class="kpi money k-ok"><small>${ui.icon('money')}Cobrado</small><b data-count="${ms.collected}" data-fmt="money">${U.money(ms.collected)}</b></div>
          <div class="kpi money k-warn"><small>${ui.icon('card')}Pendiente total</small><b data-count="${ms.receivable}" data-fmt="money">${U.money(ms.receivable)}</b></div><div class="kpi money k-gold"><small>${ui.icon('trend')}Ticket promedio</small><b data-count="${ms.ticket}" data-fmt="money">${U.money(ms.ticket)}</b><span class="sub">cobrado por paciente atendido</span></div>
          <div class="kpi k-info"><small>${ui.icon('plan')}Presupuestos</small><b>${ms.accepted}/${ms.quotes}</b><span class="sub">aceptados · ${ms.rate}% de aceptación</span></div>
          <div class="kpi k-danger"><small>${ui.icon('x')}No-show / cancelaciones</small><b>${ms.noShow} / ${ms.cancel}</b></div>
        </div>
        <div class="grid-2"><div><h3 class="eyebrow">Cobrado por mes</h3>${ui.barChart(last6(), { format: short })}</div>
          <div><h3 class="eyebrow">Tratamientos aceptados</h3><p class="small muted">Más realizado: <b>${esc(most?.label || '—')}</b> · Más rentable: <b>${esc(rich?.label || '—')}</b></p>${ui.hBars([...top].sort((a, b) => b.amount - a.amount).slice(0, 5).map((x) => ({ label: x.label, value: x.amount })), { format: short })}</div></div>
      </section>` : ''}`;

    el.querySelectorAll('[data-qa]').forEach((b) => (b.onclick = () => quick[b.dataset.qa].run()));
    el.querySelector('#st-hide')?.addEventListener('click', () => { OS.store.data.meta.stepsHidden = true; OS.store.persist(); el.querySelector('.steps-card')?.remove(); });
    el.querySelectorAll('[data-step]').forEach((b) => (b.onclick = () => { const st = STEPS[b.dataset.step]; st.go(); }));
    OS.fx.countUp(el);
    el.querySelectorAll('[data-goto]').forEach((b) => (b.onclick = () => OS.app.go(b.dataset.goto, b.dataset.tab ? { tab: b.dataset.tab } : {})));
    el.querySelectorAll('[data-sug]').forEach((b) => (b.onclick = () => { const s = sug[b.dataset.sug]; OS.app.go(s.go[0], s.go[1]); }));
    el.querySelectorAll('[data-alert]').forEach((b) => (b.onclick = () => { const a = alerts[b.dataset.alert]; OS.app.go(a.go[0], a.go[1]); }));
    el.querySelectorAll('[data-appt]').forEach((r) => { const open = () => OS.views.agenda.detail(r.dataset.appt); r.onclick = open; r.onkeydown = (e) => { if (e.key === 'Enter') open(); }; });
    el.querySelector('#d-newp')?.addEventListener('click', () => OS.views.patients.form());
    [el.querySelector('#d-newa'), el.querySelector('#d-newa2')].forEach((b) => b?.addEventListener('click', () => OS.views.agenda.form({ date: U.today() })));
  }

  return { render, crumbs: () => ['Inicio'] };
})();
