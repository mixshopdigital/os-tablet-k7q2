/* ODONTO SMART — Agenda: vistas día (por profesional), semana y mes; citas con estados
   y flujo Cita → Atención → Evolución clínica. */
OS.views.agenda = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const START = 7 * 60; const END = 21 * 60; const PX = 56 / 60;
  const STATES = [['pendiente', 'Pendiente'], ['confirmada', 'Confirmada'], ['atendida', 'Atendida'], ['cancelada', 'Cancelada'], ['ausente', 'No asistió']];

  function render(el, params) {
    const view = params.view || (window.innerWidth < 760 ? 'list' : 'day'); const date = params.date || U.today(); const prof = params.prof || '';
    const title = view === 'month' ? U.monthLabel(date) : view === 'week' ? `Semana del ${U.fmtDate(U.startOfWeek(date))}` : U.longDate(date) + (date === U.today() ? ' · hoy' : '');
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Agenda</span><h1>Agenda del consultorio</h1></div>
      <div class="page-actions"><button class="btn btn-ghost" id="ag-exp">${ui.icon('download')}<span>Exportar</span></button><button class="btn btn-primary" id="ag-new">${ui.icon('plus')}<span>Nueva cita</span></button></div></div>
      <div class="cal-head"><div class="seg"><button id="ag-prev" aria-label="Anterior">${ui.icon('back')}</button><button id="ag-today">Hoy</button><button id="ag-next" aria-label="Siguiente">${ui.icon('chevron')}</button></div>
        <h2 class="cap">${esc(title)}</h2>
        <div class="seg right" role="tablist">${[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes'], ['list', 'Lista']].map(([k, l]) => `<button class="${view === k ? 'active' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
        <select id="ag-prof" style="max-width:220px" aria-label="Profesional"><option value="">Todos los profesionales</option>${S.data.professionals.filter((p) => p.active !== false).map((p) => `<option value="${p.id}" ${p.id === prof ? 'selected' : ''}>${esc(D.profName(p.id))}</option>`).join('')}</select></div>
      <div class="row gap wrap small muted">${STATES.map(([k]) => ui.badge(k)).join('')}</div>
      <div id="ag-body"></div>`;
    const body = el.querySelector('#ag-body');
    const appts = S.data.appointments.filter((a) => !prof || a.professionalId === prof);
    if (view === 'day') {
      const profs = S.data.professionals.filter((p) => p.active !== false && (!prof || p.id === prof));
      const cols = profs.length > 1 ? profs.map((p) => ({ label: D.profName(p.id), sub: p.specialty, date, prof: p.id, items: appts.filter((a) => a.date === date && a.professionalId === p.id) }))
        : [{ label: profs[0] ? D.profName(profs[0].id) : '', sub: '', date, prof: profs[0]?.id, items: appts.filter((a) => a.date === date) }];
      body.innerHTML = timeline(cols);
    } else if (view === 'week') {
      const ws = U.startOfWeek(date);
      body.innerHTML = timeline(Array.from({ length: 7 }, (_, i) => { const d = U.addDays(ws, i); return { label: U.DAYS[U.parseISO(d).getDay()].slice(0, 3), big: U.parseISO(d).getDate(), date: d, prof, items: appts.filter((a) => a.date === d), today: d === U.today() }; }), true);
    } else if (view === 'month') body.innerHTML = month(date, appts);
    else body.innerHTML = list(appts.filter((a) => a.date >= date && a.date <= U.addDays(date, 13)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)));

    const step = view === 'month' ? (n) => U.addMonths(date, n) : view === 'week' ? (n) => U.addDays(date, 7 * n) : view === 'list' ? (n) => U.addDays(date, 14 * n) : (n) => U.addDays(date, n);
    el.querySelector('#ag-prev').onclick = () => OS.app.refresh({ date: step(-1) });
    el.querySelector('#ag-next').onclick = () => OS.app.refresh({ date: step(1) });
    el.querySelector('#ag-today').onclick = () => OS.app.refresh({ date: U.today() });
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => OS.app.refresh({ view: b.dataset.v })));
    el.querySelector('#ag-prof').onchange = (e) => OS.app.refresh({ prof: e.target.value });
    el.querySelector('#ag-new').onclick = () => form({ date, professionalId: prof || undefined });
    el.querySelector('#ag-exp').onclick = () => OS.files.exportCSV(`agenda_${date}.csv`, appts.filter((a) => a.date >= U.addDays(date, -30)).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [{ label: 'Fecha', get: (a) => U.fmtDate(a.date) }, { label: 'Hora', get: 'time' }, { label: 'Duración', get: 'duration' }, { label: 'Paciente', get: (a) => D.patientName(a.patientId) }, { label: 'Profesional', get: (a) => D.profName(a.professionalId) }, { label: 'Tratamiento', get: 'treatment' }, { label: 'Box', get: 'box' }, { label: 'Estado', get: 'status' }]);
    body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-appt]'); if (a) return detail(a.dataset.appt);
      const s = e.target.closest('[data-slot]'); if (s) return form({ date: s.dataset.date, time: s.dataset.slot, professionalId: s.dataset.prof || undefined });
      const d = e.target.closest('[data-day]'); if (d) return OS.app.refresh({ view: 'day', date: d.dataset.day });
    });
    const now = body.querySelector('.now-line'); if (now) now.parentElement.parentElement.scrollTop = 0;
  }

  function timeline(cols, isWeek) {
    const hours = []; for (let m = START; m < END; m += 60) hours.push(m);
    const nowMin = U.timeToMin(U.nowTime());
    const colHtml = (c) => `<div class="day-col" style="height:${(END - START) * PX}px">
      ${Array.from({ length: (END - START) / 30 }, (_, i) => `<button class="slot-btn" style="top:${i * 28}px" data-slot="${U.minToTime(START + i * 30)}" data-date="${c.date}" data-prof="${c.prof || ''}" aria-label="Nueva cita ${U.minToTime(START + i * 30)}"></button>`).join('')}
      ${c.date === U.today() && nowMin > START && nowMin < END ? `<div class="now-line" style="top:${(nowMin - START) * PX}px"></div>` : ''}
      ${layout(c.items).map(({ a, lane, lanes }) => { const top = (U.timeToMin(a.time) - START) * PX; const h = Math.max(24, a.duration * PX - 2); return `<button class="appt st-${a.status} ${h < 40 ? 'compact' : ''}" data-appt="${a.id}" title="${a.time} ${esc(D.patientName(a.patientId))} · ${esc(a.treatment)}" style="top:${top}px;height:${h}px;left:calc(${(lane / lanes) * 100}% + 3px);width:calc(${100 / lanes}% - 6px)"><b>${a.time} ${esc(D.patientName(a.patientId))}${h < 40 ? ` · <span style="font-weight:400">${esc(a.treatment)}</span>` : ''}</b>${h >= 40 ? `<small>${esc(a.treatment)}</small>` : ''}${h > 50 ? `<small>${esc(isWeek ? D.profName(a.professionalId) : a.box || '')}</small>` : ''}</button>`; }).join('')}</div>`;
    return `<div class="week-grid" style="grid-template-columns:56px repeat(${cols.length}, minmax(${isWeek ? 110 : 180}px, 1fr))">
      <div class="wh" style="border-left:0"></div>${cols.map((c) => `<div class="wh ${c.today ? 'today' : ''}" ${isWeek ? `data-day="${c.date}"` : ''}>${isWeek ? `<span style="text-transform:capitalize">${c.label}</span><b>${c.big}</b>` : `<b style="font-size:1em">${esc(c.label)}</b><small class="muted">${esc(c.sub || '')}</small>`}</div>`).join('')}
      <div class="hours">${hours.map((m) => `<div>${U.minToTime(m)}</div>`).join('')}</div>${cols.map(colHtml).join('')}</div>`;
  }
  /** Distribuye citas superpuestas en carriles. */
  function layout(items) {
    const sorted = items.slice().sort((a, b) => a.time.localeCompare(b.time)); const out = []; let group = []; let groupEnd = -1;
    const flush = () => { const lanes = []; group.forEach((x) => { let l = lanes.findIndex((end) => end <= U.timeToMin(x.time)); if (l < 0) { l = lanes.length; lanes.push(0); } lanes[l] = U.timeToMin(x.time) + x.duration; out.push({ a: x, lane: l }); }); out.slice(-group.length).forEach((o) => (o.lanes = lanes.length)); group = []; };
    sorted.forEach((a) => { const s = U.timeToMin(a.time); if (s >= groupEnd && group.length) flush(); group.push(a); groupEnd = Math.max(groupEnd, s + a.duration); });
    if (group.length) flush();
    return out;
  }
  function month(date, appts) {
    const first = U.parseISO(date.slice(0, 8) + '01'); const start = U.startOfWeek(U.toISO(first));
    return `<div class="month-grid">${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => `<div class="mh">${d}</div>`).join('')}
      ${Array.from({ length: 42 }, (_, i) => { const d = U.addDays(start, i); const its = appts.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time)); return `<button class="mcell ${d.slice(0, 7) !== date.slice(0, 7) ? 'out' : ''} ${d === U.today() ? 'today' : ''}" data-day="${d}"><span class="dn">${U.parseISO(d).getDate()}</span>${its.slice(0, 3).map((a) => `<span class="mi st-${a.status}">${a.time} ${esc(D.patientName(a.patientId).split(' ')[0])}</span>`).join('')}${its.length > 3 ? `<span class="small muted">+${its.length - 3} más</span>` : ''}</button>`; }).join('')}</div>`;
  }
  function list(items) {
    if (!items.length) return ui.empty('Sin citas en estas dos semanas', 'Crea una cita con el botón "Nueva cita".');
    const g = U.groupBy(items, (a) => a.date);
    return Object.entries(g).map(([d, its]) => `<section class="panel"><h3 style="text-transform:capitalize">${esc(U.longDate(d))}${d === U.today() ? ' · hoy' : ''}</h3><div class="agenda-list">${its.map((a) => `<div class="ag-row" data-appt="${a.id}" role="button" tabindex="0"><span class="ag-time">${a.time}<small>${a.duration} min</small></span><span class="ag-bar" style="background:var(--${{ pendiente: 'warn', confirmada: 'info', atendida: 'ok', cancelada: 'danger', ausente: 'muted' }[a.status]})"></span><span class="ag-main"><b>${esc(D.patientName(a.patientId))}</b><small>${esc(a.treatment)} · ${esc(D.profName(a.professionalId))}</small></span>${ui.badge(a.status)}</div>`).join('')}</div></section>`).join('');
  }

  /** Detalle de una cita con acciones de estado. */
  function detail(id) {
    const a = S.get('appointments', id); if (!a) return;
    const p = D.patient(a.patientId);
    const m = ui.modal({
      title: `${a.time} · ${D.fullName(p)}`, subtitle: `${esc(U.longDate(a.date))} · ${a.duration} min`, size: 'md', guard: false,
      body: `<div class="row gap wrap">${ui.badge(a.status)}${D.medicalAlerts(p.id).map((x) => `<span class="badge badge-${x.level === 'danger' ? 'danger' : 'warn'}">⚠ ${esc(x.type)}</span>`).join('')}</div>
        <dl class="kv"><dt>Tratamiento</dt><dd>${esc(a.treatment)}</dd><dt>Profesional</dt><dd>${esc(D.profName(a.professionalId))}</dd><dt>Box</dt><dd>${esc(a.box || '—')}</dd><dt>Teléfono</dt><dd class="mono">${esc(U.prettyPhone(p.whatsapp || p.phone))}</dd><dt>Saldo</dt><dd>${OS.auth.can('cobros') ? U.money(D.balance(p.id).balance) : '—'}</dd><dt>Observaciones</dt><dd>${esc(a.notes || '—')}</dd></dl>
        <div class="row gap wrap">
          ${['pendiente'].includes(a.status) ? `<button class="btn btn-sm" data-st="confirmada">${ui.icon('check')}<span>Confirmar</span></button>` : ''}
          ${['pendiente', 'confirmada'].includes(a.status) && OS.auth.can('clinica') ? `<button class="btn btn-sm btn-primary" id="ad-attend">${ui.icon('stethoscope')}<span>Atender</span></button>` : ''}
          ${['pendiente', 'confirmada'].includes(a.status) && !OS.auth.can('clinica') ? `<button class="btn btn-sm btn-primary" data-st="atendida">${ui.icon('check')}<span>Marcar atendida</span></button>` : ''}
          ${['pendiente', 'confirmada'].includes(a.status) ? `<button class="btn btn-sm" data-st="ausente">${ui.icon('x')}<span>No asistió</span></button><button class="btn btn-sm" data-st="cancelada">${ui.icon('x')}<span>Cancelar</span></button>` : ''}
          ${['cancelada', 'ausente', 'atendida'].includes(a.status) ? `<button class="btn btn-sm" data-st="pendiente">${ui.icon('refresh')}<span>Volver a pendiente</span></button>` : ''}
        </div>
        <div class="row gap wrap">${OS.wa.button(p.id, { key: 'confirmar', label: 'Confirmar por WhatsApp', small: true })}<button class="btn btn-sm" id="ad-edit">${ui.icon('edit')}<span>Reprogramar / editar</span></button><button class="btn btn-sm btn-ghost" id="ad-ficha">${ui.icon('users')}<span>Ver ficha</span></button><button class="btn btn-sm btn-ghost" id="ad-del" style="color:var(--danger)">${ui.icon('trash')}<span>Eliminar</span></button></div>`,
    });
    const setStatus = (st) => { S.update('appointments', id, { status: st }, `Cita ${U.fmtDate(a.date)} ${a.time} de ${D.fullName(p)}: ${st}`); m.close(true); ui.toast(`Cita marcada como ${ui.STATUS[st][1].toLowerCase()}.`); OS.app.refresh(); };
    m.el.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => setStatus(b.dataset.st)));
    m.el.querySelector('#ad-attend')?.addEventListener('click', () => {
      m.close(true);
      S.update('appointments', id, { status: 'atendida' }, `Atendió a ${D.fullName(p)}`);
      OS.views.clinical.form({ patientId: p.id, appointmentId: id, date: a.date > U.today() ? U.today() : a.date, professionalId: a.professionalId, reason: a.treatment }, () => { ui.toast('Cita atendida y evolución registrada.'); OS.app.go('patient', { id: p.id, tab: 'evolucion' }); });
    });
    m.el.querySelector('#ad-edit').onclick = () => { m.close(true); form(a); };
    m.el.querySelector('#ad-ficha').onclick = () => { m.close(true); OS.app.go('patient', { id: p.id }); };
    m.el.querySelector('#ad-del').onclick = async () => { if (await ui.confirm({ title: 'Eliminar cita', text: 'La cita se eliminará de la agenda. Si el paciente no vendrá, conviene marcarla como cancelada.', ok: 'Eliminar', kind: 'danger' })) { S.remove('appointments', id, `Cita ${U.fmtDate(a.date)} de ${D.fullName(p)}`); m.close(true); OS.app.refresh(); } };
  }

  /** Alta / edición de cita. */
  async function form(a = {}) {
    const isNew = !a.id;
    let pid = a.patientId;
    if (!pid) { pid = await OS.app.pickPatient('Nueva cita para…'); if (!pid) return; }
    const p = D.patient(pid);
    const v = { date: U.today(), time: '09:00', duration: 30, box: 'Box 1', status: 'pendiente', professionalId: p.professionalId || OS.auth.current()?.professionalId || S.data.professionals[0]?.id, ...a, patientId: pid };
    const pend = D.quotesOf(pid).filter((q) => q.status === 'aceptado').flatMap((q) => q.items.filter((i) => !i.done).map((i) => i.name + (i.tooth ? ` (pieza ${i.tooth})` : '')));
    const m = ui.modal({
      title: isNew ? 'Nueva cita' : 'Reprogramar cita', subtitle: esc(D.fullName(p)), size: 'md',
      body: `<form id="af" class="form-grid">
        ${ui.field('Fecha', ui.input('date', v.date, 'type="date" required'))}${ui.field('Hora', ui.input('time', v.time, 'type="time" step="300" required'))}
        ${ui.field('Tratamiento', `<input name="treatment" id="f-treatment" list="tr-list" value="${esc(v.treatment || pend[0] || '')}" required><datalist id="tr-list">${[...pend, ...S.data.treatments.map((t) => t.name)].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`, { span: 2, req: true, hint: pend.length ? `Pendiente en su plan: ${pend.slice(0, 2).join(', ')}` : '' })}
        ${ui.field('Profesional', ui.select('professionalId', S.data.professionals.map((x) => [x.id, D.profName(x.id)]), v.professionalId))}${ui.field('Duración (min)', ui.select('duration', [15, 20, 30, 40, 45, 50, 60, 75, 90, 120], v.duration))}
        ${ui.field('Box', ui.select('box', ['Box 1', 'Box 2', 'Box 3'], v.box))}${ui.field('Estado', ui.select('status', STATES, v.status))}
        ${ui.field('Observaciones', ui.textarea('notes', v.notes, 'rows="2"'), { span: 2 })}<p class="form-error field span-2" id="af-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: isNew ? 'Agendar cita' : 'Guardar cambios', kind: 'primary', submit: true, form: 'af', icon: 'check' }],
    });
    const f = m.el.querySelector('#af');
    f.treatment.addEventListener('change', () => { const t = S.data.treatments.find((x) => x.name === f.treatment.value); if (t) f.duration.value = [15, 20, 30, 40, 45, 50, 60, 75, 90, 120].reduce((b, x) => (Math.abs(x - t.duration) < Math.abs(b - t.duration) ? x : b)); });
    let warned = false;
    f.onsubmit = (e) => {
      e.preventDefault(); const d = U.formData(f); d.duration = Number(d.duration);
      const err = (t) => { const x = m.el.querySelector('#af-err'); x.hidden = false; x.textContent = t; };
      if (!d.date || !d.time || !d.treatment) return err('Completa fecha, hora y tratamiento.');
      const s = U.timeToMin(d.time); const e2 = s + d.duration;
      const clash = S.data.appointments.find((x) => x.id !== a.id && x.date === d.date && x.professionalId === d.professionalId && !['cancelada', 'ausente'].includes(x.status) && U.timeToMin(x.time) < e2 && U.timeToMin(x.time) + x.duration > s);
      if (clash && !warned) { warned = true; return err(`${D.profName(d.professionalId)} ya tiene a ${D.patientName(clash.patientId)} a las ${clash.time}. Presiona otra vez para agendar igualmente.`); }
      const rec = isNew ? S.insert('appointments', { patientId: pid, ...d }, `Cita ${U.fmtDate(d.date)} ${d.time} de ${D.fullName(p)}`) : S.update('appointments', a.id, d, `Reprogramó cita de ${D.fullName(p)} a ${U.fmtDate(d.date)} ${d.time}`);
      m.markClean(); m.close(true);
      ui.toast(isNew ? `Cita agendada: ${U.fmtDate(d.date)} ${d.time}.` : 'Cita actualizada.');
      const cur = OS.app.current;
      if (cur.view === 'agenda') OS.app.refresh({ date: d.date }); else if (cur.view === 'patient' || cur.view === 'dashboard') OS.app.refresh();
      return rec;
    };
  }

  function listFor(el, pid) {
    const items = D.apptsOf(pid).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    el.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('calendar')}Citas</h3><button class="btn btn-primary btn-sm" id="la-new">${ui.icon('plus')}<span>Agendar</span></button></div>
      ${items.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Fecha</th><th>Hora</th><th>Tratamiento</th><th>Profesional</th><th>Estado</th></tr></thead><tbody>${items.map((a) => `<tr class="click" data-appt="${a.id}"><td data-l="Fecha">${U.fmtDate(a.date)}</td><td data-l="Hora" class="mono">${a.time}</td><td>${esc(a.treatment)}</td><td data-l="Profesional">${esc(D.profName(a.professionalId))}</td><td>${ui.badge(a.status)}</td></tr>`).join('')}</tbody></table></div>` : ui.empty('Sin citas', 'Agenda la primera cita del paciente.')}</section>`;
    el.querySelector('#la-new').onclick = () => form({ patientId: pid });
    el.querySelectorAll('[data-appt]').forEach((r) => (r.onclick = () => detail(r.dataset.appt)));
  }

  return { render, form, detail, listFor, perm: 'agenda' };
})();
