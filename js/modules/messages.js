/* ODONTO SMART — Mensajes de hoy: el sistema arma cada día la lista de mensajes de WhatsApp
   (confirmaciones, recordatorios, cumpleaños, controles, cobros...). Se envían con un clic, gratis,
   usando el WhatsApp del consultorio (enlaces wa.me). */
OS.views.messages = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  const GROUPS = [
    { id: 'confirmar', title: 'Confirmar las citas de mañana', icon: 'calendar', c: '#2F7DE1', hint: 'Evitá ausencias: pedí confirmación un día antes.' },
    { id: 'r48', title: 'Recordatorio de citas en 48 horas', icon: 'bell', c: '#E8A317', hint: 'Un aviso a tiempo reduce las cancelaciones.' },
    { id: 'cumple', title: 'Cumpleaños de hoy', icon: 'gift', c: '#E0457B', hint: 'Un saludo cercano fideliza al paciente.' },
    { id: 'post', title: 'Cómo se sienten tras el tratamiento de hoy', icon: 'check', c: '#1A9E54', hint: 'Mensaje de cuidado posterior a la atención.' },
    { id: 'control', title: 'Pacientes que deben hacer su control', icon: 'refresh', c: '#18A3B8', hint: 'Más de 6 meses sin control ni cita agendada.' },
    { id: 'volver', title: 'Pacientes que no volvieron', icon: 'users', c: '#8A5CC2', hint: 'Recuperá pacientes con tratamiento incompleto o cita cancelada.' },
    { id: 'presu', title: 'Presupuestos sin respuesta', icon: 'quote', c: '#F07A2B', hint: 'Un recordatorio amable puede cerrar el tratamiento.' },
    { id: 'pago', title: 'Saldos pendientes', icon: 'money', c: '#D6453D', hint: 'Recordatorio cordial de pagos.' },
  ];

  const sentLog = () => (S.data.meta.waLog = S.data.meta.waLog || {});
  const isSent = (k) => sentLog()[k] === U.today();
  function markSent(k) {
    const log = sentLog(); const t = U.today();
    Object.keys(log).forEach((x) => { if (log[x] !== t) delete log[x]; });
    log[k] = t; S.data.meta.waSent = true; S.persist();
  }

  function cumpleText(p) { return OS.wa.clean(`Hola ${p.firstName}, de parte de todo el equipo de ${S.data.clinic.name || 'tu consultorio'} te deseamos un muy feliz cumpleaños. Que tengas un día muy lindo.`); }

  /** Calcula todos los mensajes sugeridos para hoy. */
  function build() {
    const t = U.today(); const tom = U.addDays(t, 1); const d2 = U.addDays(t, 2);
    const out = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
    const add = (g, pid, key, text, note, ref) => {
      const p = D.patient(pid); if (!p || p.status === 'inactivo') return;
      const k = `${g}:${pid}:${ref || ''}`;
      out[g].push({ k, pid, key, text, note, has: !!OS.wa.number(p.whatsapp || p.phone), name: D.fullName(p) });
    };
    const appts = S.data.appointments;
    appts.filter((a) => a.date === tom && a.status === 'pendiente').forEach((a) => add('confirmar', a.patientId, 'confirmar', OS.wa.text('confirmar', a.patientId, { fecha: U.fmtDate(a.date), hora: a.time }), `${a.time} · ${a.treatment || 'Consulta'}`, a.id));
    appts.filter((a) => a.date === d2 && ['pendiente', 'confirmada'].includes(a.status)).forEach((a) => add('r48', a.patientId, 'recordatorio48', OS.wa.text('recordatorio48', a.patientId, { fecha: U.fmtDate(a.date), hora: a.time }), `${U.fmtDate(a.date)} ${a.time} · ${a.treatment || 'Consulta'}`, a.id));
    const md = t.slice(5);
    S.data.patients.filter((p) => p.birthDate && p.birthDate.slice(5) === md).forEach((p) => add('cumple', p.id, 'cumple', cumpleText(p), `Cumple ${Number(t.slice(0, 4)) - Number(p.birthDate.slice(0, 4))} años`));
    const done = new Set(); appts.filter((a) => a.date === t && a.status === 'atendida').forEach((a) => { if (!done.has(a.patientId)) { done.add(a.patientId); add('post', a.patientId, 'postoperatorio', OS.wa.text('postoperatorio', a.patientId), a.treatment || 'Atendido hoy', a.id); } });
    D.recall().forEach((r) => {
      const ks = r.reasons.map((x) => x.key); const pid = r.patient.id;
      if (ks.includes('presupuesto')) add('presu', pid, 'presupuesto', OS.wa.text('presupuesto', pid), r.reasons.find((x) => x.key === 'presupuesto').label);
      if (ks.includes('control')) add('control', pid, 'control', OS.wa.text('control', pid), r.last ? `Última visita: ${U.fmtDate(r.last)}` : 'Sin visitas');
      else if (ks.some((x) => ['sin_volver', 'incompleto', 'cancelada'].includes(x))) add('volver', pid, 'recuperar', OS.wa.text('recuperar', pid), r.reasons.filter((x) => x.key !== 'presupuesto').map((x) => x.label).join(' · '));
    });
    S.data.patients.map((p) => ({ p, b: D.balance(p.id).balance })).filter((x) => x.b > 0).sort((a, b) => b.b - a.b).slice(0, 15).forEach(({ p, b }) => add('pago', p.id, 'pago', OS.wa.text('pago', p.id), `Saldo ${U.money(b)}`));
    return out;
  }

  const hrefOf = (it) => OS.wa.link(D.patient(it.pid)?.whatsapp || D.patient(it.pid)?.phone, it.text);
  function count() { try { const b = build(); return GROUPS.reduce((n, g) => n + b[g.id].filter((i) => i.has && !isSent(i.k)).length, 0); } catch (e) { return 0; } }

  // ---------- Guía de WhatsApp Business (gratis) y bot ----------
  const GUIDE = [
    ['Instalá WhatsApp Business', 'Descargá la app gratuita "WhatsApp Business" y registrá el número del consultorio. Cargá nombre, logo, dirección, horario y descripción.'],
    ['Mensaje de saludo', 'Se envía solo cuando alguien te escribe por primera vez (Herramientas → Mensaje de saludo).', 'Hola, gracias por escribir a [Consultorio]. Contanos en qué podemos ayudarte: 1) Agendar turno 2) Precios y tratamientos 3) Horarios y ubicación. Te respondemos en breve.'],
    ['Mensaje de ausencia', 'Responde fuera de horario (Herramientas → Mensaje de ausencia).', 'Gracias por escribirnos. Ahora estamos fuera de horario. Atendemos de lunes a viernes. Mañana te respondemos primero que nada.'],
    ['Respuestas rápidas', 'Escribí "/" y elegí una respuesta guardada. Ahorra horas por semana.', '/turno  Para agendar tu turno necesito: nombre completo, número de cédula y el día y horario que prefieras.\n/ubicacion  Estamos en [dirección]. Te dejo el mapa: [link de Google Maps].\n/pago  Podés abonar en efectivo, transferencia o tarjeta.'],
    ['Catálogo y etiquetas', 'Cargá tus tratamientos en el Catálogo y usá etiquetas (Nuevo paciente, Presupuesto enviado, Control) para ordenar los chats.'],
    ['Usá "Mensajes de hoy"', 'Cada mañana abrí la pestaña "Mensajes de hoy" de Odonto Smart y tocá Enviar: el texto ya está escrito. Es gratis y no necesita ningún servidor.'],
  ];
  const BOT = [['Nivel 1 · Gratis', 'WhatsApp Business con saludo, ausencia y respuestas rápidas + "Mensajes de hoy" de Odonto Smart. Ya lo tenés listo.'], ['Nivel 2 · Bot de menú', 'Un menú automático (1 turnos, 2 precios, 3 ubicación) que responde solo las 24 h. Requiere la API oficial de WhatsApp (Cloud API) y un servidor; tiene costo mensual.'], ['Nivel 3 · Bot con agenda', 'Además agenda y confirma turnos en Odonto Smart automáticamente. Es un módulo opcional aparte, que se instala a pedido.']];
  function guia(b) {
    b.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('whatsapp')}Guía rápida de WhatsApp Business (gratis)</h3></div><ol class="list-plain">${GUIDE.map(([t, d, tx], i) => `<li style="margin-bottom:12px"><b>${i + 1}. ${esc(t)}</b><div class="muted">${esc(d)}</div>${tx ? `<div class="note note-info" style="white-space:pre-line;margin-top:6px"><span>${esc(tx.replace(/\\n/g, '\n'))}</span></div><button class="btn btn-sm" data-copy="${esc(tx.replace(/\\n/g, '\n'))}">${ui.icon('copy')}<span>Copiar texto</span></button>` : ''}</li>`).join('')}</ol></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('ai')}¿Y un bot de WhatsApp?</h3></div><div class="grid-2">${BOT.map(([t, d]) => `<div class="panel"><b>${esc(t)}</b><p class="muted">${esc(d)}</p></div>`).join('')}</div></section>`;
    b.querySelectorAll('[data-copy]').forEach((x) => (x.onclick = () => { try { navigator.clipboard.writeText(x.dataset.copy); ui.toast('Texto copiado.'); } catch (e) { ui.toast('No se pudo copiar.', 'warn'); } }));
  }

  function render(el, params) {
    if (params.tab === 'guia') {
      el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Mensajes</span><h1>Guía de WhatsApp</h1></div><div class="page-actions"><button class="btn btn-ghost" id="m-back">${ui.icon('whatsapp')}<span>Volver a Mensajes de hoy</span></button></div></div><div id="g-body" style="display:grid;gap:16px"></div>`;
      el.querySelector('#m-back').onclick = () => OS.app.refresh({ tab: '' }); return guia(el.querySelector('#g-body'));
    }
    const data = build();
    const all = GROUPS.flatMap((g) => data[g.id]); const sent = all.filter((i) => isSent(i.k)).length; const total = all.length; const pct = total ? Math.round((sent * 100) / total) : 0;
    el.innerHTML = `<section class="msg-hero"><div><span class="eyebrow" style="color:rgba(255,255,255,.85)">Mensajes de hoy</span><h1>${total ? `Tenés ${U.plural(total - sent, 'mensaje listo', 'mensajes listos')} para enviar` : 'Hoy no hay mensajes pendientes'}</h1><p>El sistema los prepara solo. Vos tocás <b>Enviar</b> y se abre tu WhatsApp con el texto ya escrito. Es gratis.</p></div>
      <div><div class="msg-progress"><span style="width:${pct}%"></span></div><small style="color:#fff;display:block;margin-top:6px;text-align:right">${sent} de ${total} enviados hoy</small></div></section>
      <div class="msg-groups">${GROUPS.map((g) => { const items = data[g.id]; if (!items.length) return ''; return `<section class="msg-group" style="--c:${g.c}" data-g="${g.id}"><header><i>${ui.icon(g.icon)}</i><div><h3>${esc(g.title)}</h3><small class="muted">${esc(g.hint)}</small></div><span class="cnt">${items.length}</span></header>
        ${items.map((it) => `<div class="msg-item ${isSent(it.k) ? 'sent' : ''}" data-k="${esc(it.k)}">${ui.avatar(it.name, D.patient(it.pid)?.photo, 38)}<div><b>${esc(it.name)}</b> <small class="muted">${esc(it.note)}</small><div class="txt">${esc(it.text)}</div></div>
          <div class="row gap">${it.has ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="${esc(hrefOf(it))}" data-send="${esc(it.k)}" data-pid="${it.pid}">${ui.icon('whatsapp')}<span>${isSent(it.k) ? 'Enviado' : 'Enviar'}</span></a>` : `<span class="btn btn-ghost btn-sm is-disabled">Sin número</span>`}<button class="btn btn-sm btn-ghost" data-edit="${esc(it.k)}" title="Editar texto">${ui.icon('edit')}</button></div></div>`).join('')}
        </section>`; }).join('')}</div>
      ${total ? '' : ui.empty('Todo al día', 'Cuando haya citas, cumpleaños, controles o saldos, los mensajes aparecen acá.')}
      <div class="row gap wrap" style="margin-top:14px"><button class="btn btn-soft" id="m-guia">${ui.icon('help')}<span>Guía de WhatsApp Business y bot</span></button></div>
      <p class="note note-info" style="margin-top:14px">${ui.icon('alert')}<span>Por seguridad de tu número, WhatsApp pide enviar de a un mensaje. Hacelo con calma, a tu ritmo, y evitá mandar más de unas 30 por hora. Las plantillas se editan en Seguimientos → Plantillas.</span></p>`;

    el.querySelector('#m-guia').onclick = () => OS.app.refresh({ tab: 'guia' });
    const items = Object.fromEntries(all.map((i) => [i.k, i]));
    el.querySelectorAll('[data-send]').forEach((a) => a.addEventListener('click', () => {
      const k = a.dataset.send; S.log('WhatsApp', 'patients', a.dataset.pid, `Mensaje del día a ${items[k].name}`); markSent(k);
      const row = a.closest('.msg-item'); row.classList.add('sent'); a.querySelector('span').textContent = 'Enviado';
      const s = el.querySelectorAll('.msg-item.sent').length; el.querySelector('.msg-progress span').style.width = `${total ? Math.round((s * 100) / total) : 0}%`;
      const sm = el.querySelector('.msg-hero small'); if (sm) sm.textContent = `${s} de ${total} enviados hoy`;
      const nb = document.querySelector('.nav-item[data-go=messages] .nav-badge'); if (nb) { const c = count(); nb.textContent = c; nb.hidden = !c; }
    }));
    el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => {
      const it = items[b.dataset.edit]; const row = b.closest('.msg-item');
      const m = ui.modal({ title: 'Editar mensaje', subtitle: it.name, size: 'md', guard: false, body: `<label class="field"><span class="lbl">Texto</span><textarea id="m-t" rows="6">${esc(it.text)}</textarea></label>`, actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Usar este texto', kind: 'primary', id: 'm-ok' }] });
      m.el.querySelector('#m-ok').onclick = () => { it.text = OS.wa.clean(m.el.querySelector('#m-t').value); row.querySelector('.txt').textContent = it.text; const a = row.querySelector('[data-send]'); if (a) a.href = hrefOf(it); m.close(true); };
    }));
  }

  return { render, count, perm: 'seguimientos' };
})();
