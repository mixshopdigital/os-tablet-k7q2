/* ODONTO SMART — Seguimientos: pacientes para recuperar (recall), recordatorios de citas,
   pagos y controles con WhatsApp, y plantillas editables. */
OS.views.followups = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  function render(el, params) {
    const tab = params.tab || 'recall';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Seguimientos</span><h1>Seguimiento de pacientes</h1><p>El sistema detecta a quién conviene contactar hoy.</p></div></div>
      <nav class="tabs" id="f-tabs">${[['recall', 'Pacientes para recuperar', 'refresh'], ['recordatorios', 'Recordatorios', 'bell'], ['plantillas', 'Plantillas de mensajes', 'message']].map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav><div id="f-body"></div>`;
    ui.tabs(el.querySelector('#f-tabs'), (k) => OS.app.refresh({ tab: k }));
    const body = el.querySelector('#f-body');
    if (tab === 'recall') {
      const list = D.recall(); const kind = params.kind || '';
      const kinds = [['', 'Todos'], ['control', 'Control'], ['sin_volver', 'No volvieron'], ['incompleto', 'Tratamiento incompleto'], ['presupuesto', 'Presupuesto pendiente'], ['cancelada', 'Cancelaron']];
      const shown = list.filter((r) => !kind || r.reasons.some((x) => x.key === kind));
      body.innerHTML = `<div class="chip-row" id="f-k">${kinds.map(([k, l]) => `<button class="chip ${k === kind ? 'active' : ''}" data-k="${k}">${l}<b>${list.filter((r) => !k || r.reasons.some((x) => x.key === k)).length}</b></button>`).join('')}</div>
        ${shown.length ? `<div class="grid-2">${shown.map((r) => { const key = r.reasons.some((x) => x.key === 'presupuesto') ? 'presupuesto' : r.reasons.some((x) => x.key === 'control') ? 'control' : 'recuperar'; return `<article class="panel"><div class="row gap">${ui.avatar(D.fullName(r.patient), r.patient.photo, 40)}<div class="grow"><button class="link" data-pat="${r.patient.id}" style="font-size:1.05em">${esc(D.fullName(r.patient))}</button><div class="muted small">Última visita: <b>${U.fmtDate(r.last)}</b> · Motivo: ${esc(r.lastReason)}</div></div>${r.months != null ? `<span class="badge badge-${r.months >= 6 ? 'danger' : 'warn'}">${r.months} ${r.months === 1 ? 'mes' : 'meses'}</span>` : ''}</div>
          <ul class="list-plain small">${r.reasons.map((x) => `<li>• ${esc(x.label)}</li>`).join('')}</ul>
          <div class="row gap wrap">${OS.wa.button(r.patient.id, { key, label: 'Contactar por WhatsApp', small: true })}<button class="btn btn-sm" data-ag="${r.patient.id}">${ui.icon('calendar')}<span>Agendar</span></button></div></article>`; }).join('')}</div>` : ui.empty('No hay pacientes para recuperar', 'Todos tienen su próxima cita o están al día.')}`;
      body.querySelector('#f-k').onclick = (e) => { const b = e.target.closest('[data-k]'); if (b) OS.app.refresh({ kind: b.dataset.k }); };
    } else if (tab === 'recordatorios') {
      const t = U.today();
      const soon = S.data.appointments.filter((a) => a.date >= t && a.date <= U.addDays(t, 2) && ['pendiente', 'confirmada'].includes(a.status)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      const debt = S.data.patients.map((p) => ({ p, b: D.balance(p.id).balance })).filter((x) => x.b > 0).slice(0, 10);
      body.innerHTML = `<div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('calendar')}Citas en las próximas 48 horas</h3></div>
        ${soon.length ? `<div class="agenda-list">${soon.map((a) => `<div class="ag-row" style="cursor:default"><span class="ag-time">${a.time}<small>${U.fmtDate(a.date)}</small></span><span class="ag-bar" style="background:var(--${a.status === 'confirmada' ? 'info' : 'warn'})"></span><span class="ag-main"><b>${esc(D.patientName(a.patientId))}</b><small>${esc(a.treatment)} · ${ui.STATUS[a.status][1]}</small></span>${OS.wa.button(a.patientId, { key: a.status === 'confirmada' ? 'recordatorio48' : 'confirmar', label: a.status === 'confirmada' ? 'Recordar' : 'Confirmar', small: true, extra: { fecha: U.fmtDate(a.date), hora: a.time } })}</div>`).join('')}</div>` : '<p class="muted">No hay citas en las próximas 48 horas.</p>'}</section>
        <section class="panel"><div class="panel-head"><h3>${ui.icon('money')}Recordatorios de pago</h3></div>${debt.length ? `<div class="agenda-list">${debt.map(({ p, b }) => `<div class="ag-row" style="grid-template-columns:minmax(0,1fr) auto auto;cursor:default"><span class="ag-main"><b>${esc(D.fullName(p))}</b><small>Saldo ${U.money(b)}</small></span><span></span>${OS.wa.button(p.id, { key: 'pago', label: 'Recordar pago', small: true })}</div>`).join('')}</div>` : '<p class="muted">Sin saldos pendientes.</p>'}</section></div>
        <p class="note note-info">${ui.icon('alert')}<span>Los recordatorios se envían con un clic desde aquí. El envío automático sin intervención requiere la API oficial de WhatsApp Business y un servidor; está previsto para una fase posterior.</span></p>`;
    } else {
      const tpls = S.data.messageTemplates;
      body.innerHTML = `<p class="muted">Variables disponibles: <span class="mono">[Nombre] [Nombre completo] [fecha] [hora] [monto] [saldo] [tratamiento] [Consultorio]</span></p>
        <div class="grid-2">${tpls.map((t) => `<form class="panel" data-tpl="${t.id}"><div class="panel-head"><h3>${ui.icon('message')}${esc(t.name)}</h3></div><textarea name="body" rows="4" ${OS.auth.can('config') ? '' : 'readonly'}>${esc(t.body)}</textarea>${OS.auth.can('config') ? `<div class="row gap"><button class="btn btn-sm btn-ghost" type="button" data-reset="${t.key}">Restaurar original</button><button class="btn btn-sm btn-primary right" type="submit">Guardar</button></div>` : ''}</form>`).join('')}</div>`;
      body.querySelectorAll('[data-tpl]').forEach((f) => (f.onsubmit = (e) => { e.preventDefault(); S.update('messageTemplates', f.dataset.tpl, { body: f.body.value.trim() }, 'Plantilla de mensaje'); ui.toast('Plantilla guardada.'); }));
      body.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => { const def = OS.wa.DEFAULT_TEMPLATES.find((x) => x.key === b.dataset.reset); if (def) b.closest('form').body.value = def.body; }));
    }
    body.querySelectorAll('[data-pat]').forEach((b) => (b.onclick = () => OS.app.go('patient', { id: b.dataset.pat })));
    body.querySelectorAll('[data-ag]').forEach((b) => (b.onclick = () => OS.views.agenda.form({ patientId: b.dataset.ag })));
  }

  return { render, perm: 'seguimientos' };
})();
