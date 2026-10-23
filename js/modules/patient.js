/* ODONTO SMART — Ficha del paciente: encabezado, alertas médicas y pestañas
   que reutilizan los módulos clínicos, comerciales y documentales. */
OS.views.patient = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  const TABS = () => [
    ['resumen', 'Resumen', 'home', 'pacientes'], ['historia', 'Historia clínica', 'clinical', 'clinica'], ['odontograma', 'Odontograma', 'tooth', 'clinica'], ['perio', 'Periodontograma', 'chart', 'clinica'],
    ['evolucion', 'Evolución', 'clock', 'clinica'], ['presupuestos', 'Presupuestos', 'quote', 'presupuestos'], ['cobros', 'Cuenta corriente', 'card', 'cobros'], ['citas', 'Citas', 'calendar', 'agenda'],
    ['documentos', 'Documentos', 'folder', 'documentos'], ['fotos', 'Antes / después', 'image', 'documentos'], ['recetas', 'Recetas y consentimientos', 'rx', 'clinica'],
  ].filter((t) => OS.auth.can(t[3]));

  function render(el, params) {
    const p = D.patient(params.id);
    if (!p) { el.innerHTML = ui.empty('Paciente no encontrado', 'Puede haber sido eliminado.', '<button class="btn btn-primary" data-go="patients">Ver pacientes</button>'); return; }
    const tabs = TABS(); const tab = tabs.some((t) => t[0] === params.tab) ? params.tab : 'resumen';
    const last = D.lastVisit(p.id); const next = D.nextAppt(p.id); const bal = D.balance(p.id); const alerts = OS.auth.can('clinica') ? D.medicalAlerts(p.id) : [];
    const phone = p.whatsapp || p.phone;
    el.innerHTML = `
      <section class="p-header">${ui.avatar(D.fullName(p), p.photo, 72)}
        <div><div class="row gap wrap"><h1>${esc(D.fullName(p))}</h1>${ui.badge(p.status === 'inactivo' ? 'inactivo' : D.isNew(p) ? 'nuevo' : 'activo')}${p.demo ? '<span class="badge badge-muted">demo</span>' : ''}</div>
          <div class="p-meta"><span>${ui.icon('users')}${p.birthDate ? `${U.age(p.birthDate)} años` : 'Edad sin cargar'}</span><span>CI ${esc(p.ci || '—')}</span><span>${ui.icon('phone')}<span class="mono">${esc(U.prettyPhone(p.phone))}</span></span><span>${ui.icon('whatsapp')}<span class="mono">${esc(U.prettyPhone(phone))}</span></span><span>${ui.icon('doctor')}${esc(D.profName(p.professionalId))}</span></div>
          <div class="p-actions" style="margin-top:12px">
            ${phone ? `<a class="btn btn-sm" href="tel:+${U.normalizePhone(p.phone || phone)}" title="Llamar al ${esc(U.prettyPhone(p.phone || phone))}">${ui.icon('phone')}<span>Llamar</span></a>` : ''}
            <button class="btn btn-sm btn-wa" id="ph-wa">${ui.icon('whatsapp')}<span>WhatsApp</span></button>
            ${OS.auth.can('agenda') ? `<button class="btn btn-sm" id="ph-appt">${ui.icon('calendar')}<span>Agendar</span></button>` : ''}
            ${OS.auth.can('presupuestos') ? `<button class="btn btn-sm" id="ph-quote">${ui.icon('quote')}<span>Presupuesto</span></button>` : ''}
            ${OS.auth.can('clinica') ? `<button class="btn btn-sm" data-tab-go="odontograma">${ui.icon('tooth')}<span>Odontograma</span></button>` : ''}
            ${OS.auth.can('documentos') ? `<button class="btn btn-sm" data-tab-go="fotos">${ui.icon('camera')}<span>Antes / después</span></button>` : ''}
            ${OS.auth.can('documentos') ? `<button class="btn btn-sm" data-tab-go="documentos">${ui.icon('file')}<span>Documentos</span></button>` : ''}
            <button class="btn btn-sm btn-ghost" id="ph-edit">${ui.icon('edit')}<span>Editar</span></button>
          </div></div>
        <div class="p-stats"><div><small>Última visita</small><b>${U.fmtDate(last)}</b></div><div><small>Próxima cita</small><b>${next ? `${U.fmtDate(next.date)} ${next.time}` : '—'}</b></div>
          ${OS.auth.can('cobros') ? `<div><small>Saldo</small><b class="${bal.balance > 0 ? 'money-pos' : 'money-ok'}">${U.money(bal.balance)}</b></div>` : ''}</div>
      </section>
      ${alerts.length ? `<div class="med-alerts" role="alert">${alerts.map((a) => `<span class="med-alert ${a.level}">${ui.icon('alert')}<b>${esc(a.type)}</b><span>${esc(a.text)}</span></span>`).join('')}</div>` : ''}
      <nav class="tabs" role="tablist" id="pt-tabs">${tabs.map(([k, l, i]) => `<button role="tab" data-tab="${k}" class="${k === tab ? 'active' : ''}" aria-selected="${k === tab}">${ui.icon(i)}${l}</button>`).join('')}</nav>
      <div id="pt-body"></div>`;
    const body = el.querySelector('#pt-body');
    const show = (k) => { OS.app.current.params.tab = k; renderTab(k, body, p); };
    ui.tabs(el.querySelector('#pt-tabs'), show);
    el.querySelectorAll('[data-tab-go]').forEach((b) => (b.onclick = () => el.querySelector(`#pt-tabs [data-tab="${b.dataset.tabGo}"]`).click()));
    el.querySelector('#ph-wa').onclick = () => OS.wa.composer(p.id, next ? 'confirmar' : bal.balance > 0 ? 'pago' : 'control');
    el.querySelector('#ph-appt')?.addEventListener('click', () => OS.views.agenda.form({ patientId: p.id }));
    el.querySelector('#ph-quote')?.addEventListener('click', () => OS.views.quotes.create({ patientId: p.id }));
    el.querySelector('#ph-edit').onclick = () => OS.views.patients.form(p);
    show(tab);
  }

  function renderTab(k, body, p) {
    const map = {
      resumen: () => summary(body, p),
      historia: () => OS.views.clinical.historyFor(body, p.id),
      odontograma: () => OS.views.odontogram.mount(body, p.id),
      perio: () => OS.views.perio.mount(body, p.id),
      evolucion: () => OS.views.clinical.evolutionFor(body, p.id),
      presupuestos: () => OS.views.quotes.listFor(body, p.id),
      cobros: () => OS.views.payments.accountFor(body, p.id),
      citas: () => OS.views.agenda.listFor(body, p.id),
      documentos: () => OS.views.documents.listFor(body, p.id),
      fotos: () => OS.views.documents.photosFor(body, p.id),
      recetas: () => OS.views.documents.rxFor(body, p.id),
    };
    (map[k] || map.resumen)();
  }

  function summary(body, p) {
    const odo = D.odontoSummary(p.id); const notes = S.data.clinicalNotes.filter((n) => n.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    const plan = D.quotesOf(p.id).filter((q) => q.status === 'aceptado'); const pend = plan.flatMap((q) => q.items.filter((i) => !i.done));
    body.innerHTML = `<div class="grid-2">
      <section class="panel"><div class="panel-head"><h3>${ui.icon('users')}Datos de contacto</h3></div><dl class="kv">
        <dt>Teléfono</dt><dd class="mono">${esc(U.prettyPhone(p.phone))}</dd><dt>WhatsApp</dt><dd class="mono">${esc(U.prettyPhone(p.whatsapp || p.phone))}</dd><dt>Email</dt><dd>${esc(p.email || '—')}</dd>
        <dt>Dirección</dt><dd>${esc(p.address || '—')}</dd><dt>Nacimiento</dt><dd>${U.fmtDate(p.birthDate)}</dd><dt>Ocupación</dt><dd>${esc(p.occupation || '—')}</dd><dt>Observaciones</dt><dd>${esc(p.notes || '—')}</dd></dl></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('plan')}Tratamiento en curso</h3></div>
        ${pend.length ? `<ul class="list-plain">${pend.map((i) => `<li class="row gap">${ui.badge('por_realizar')}<span>${esc(i.name)}${i.tooth ? ` · pieza <b class="mono">${esc(i.tooth)}</b>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">No hay tratamientos pendientes.</p>'}
        ${OS.auth.can('clinica') ? `<div class="kpis" style="margin-top:6px"><div class="kpi"><small>Piezas con caries</small><b>${odo.caries}</b></div><div class="kpi"><small>Restauradas</small><b>${odo.restauracion}</b></div><div class="kpi"><small>Ausentes</small><b>${odo.ausente}</b></div></div>` : ''}</section>
      ${OS.auth.can('clinica') ? `<section class="panel"><div class="panel-head"><h3>${ui.icon('clock')}Últimas evoluciones</h3><button class="btn btn-sm btn-ghost" id="s-hist">${ui.icon('download')}<span>Ficha completa (PDF)</span></button></div>
        ${notes.length ? `<div class="timeline">${notes.map((n) => `<div class="tl-item"><span class="tl-date">${U.fmtDate(n.date)} · ${esc(D.profName(n.professionalId))}</span><b>${esc(n.reason)}</b><span class="muted small">${esc(n.procedure || n.diagnosis || '')}</span></div>`).join('')}</div>` : '<p class="muted">Sin evoluciones registradas.</p>'}</section>` : ''}
      ${OS.auth.can('ia') ? `<section class="panel"><div class="panel-head"><h3>${ui.icon('ai')}Odonto Smart AI</h3></div><p class="muted">Resume la historia clínica, redacta mensajes o indicaciones a partir de los datos de esta ficha.</p><button class="btn btn-soft" id="s-ai">${ui.icon('ai')}<span>Abrir asistente con este paciente</span></button></section>` : ''}
    </div>`;
    body.querySelector('#s-hist')?.addEventListener('click', () => OS.pdf.present(OS.pdf.historyModel(p.id), { patientId: p.id, category: 'Estudios' }));
    body.querySelector('#s-ai')?.addEventListener('click', () => OS.app.go('ai', { patientId: p.id }));
  }

  return { render, perm: 'pacientes', navId: 'patients', crumbs: (pr) => ['Pacientes', D.patientName(pr.id)] };
})();
