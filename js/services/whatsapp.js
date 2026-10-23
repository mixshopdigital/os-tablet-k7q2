/* ODONTO SMART — WhatsApp.
   Abre WhatsApp (app de escritorio, Web o móvil) con wa.me y el número normalizado.
   El texto se prepara con las plantillas editables del consultorio.
   Limitación real: wa.me no permite adjuntar archivos; el PDF se adjunta manualmente. */
OS.wa = (() => {
  const U = OS.util; const { esc } = U;

  const DEFAULT_TEMPLATES = [
    { key: 'confirmar', name: 'Confirmar cita', body: 'Hola [Nombre], te escribimos de [Consultorio] para confirmar tu cita odontológica del [fecha] a las [hora]. ¿Nos confirmas tu asistencia?' },
    { key: 'recordatorio48', name: 'Recordatorio 48 horas antes', body: 'Hola [Nombre], te recordamos tu cita odontológica para el [fecha] a las [hora]. ¡Te esperamos en [Consultorio]!' },
    { key: 'pago', name: 'Recordar pago', body: 'Hola [Nombre], te recordamos que tienes un saldo pendiente de Gs. [monto]. Cualquier consulta estamos a disposición.' },
    { key: 'presupuesto', name: 'Enviar presupuesto', body: 'Hola [Nombre], te enviamos el presupuesto correspondiente a tu plan de tratamiento odontológico. Cualquier consulta estamos a disposición.' },
    { key: 'control', name: 'Recordar control', body: 'Hola [Nombre], ya corresponde realizar tu control odontológico. ¿Te reservamos un turno en [Consultorio]?' },
    { key: 'recuperar', name: 'Recuperar paciente', body: 'Hola [Nombre], hace un tiempo que no te vemos por [Consultorio]. Queremos saber cómo estás y ayudarte a continuar con tu tratamiento. ¿Te gustaría agendar una visita?' },
    { key: 'cumple', name: 'Saludo de cumpleaños', body: 'Hola [Nombre], de parte de todo el equipo de [Consultorio] te deseamos un muy feliz cumpleaños. Que tengas un día muy lindo.' },
    { key: 'postoperatorio', name: 'Indicaciones post tratamiento', body: 'Hola [Nombre], ¿cómo te sentís después del tratamiento de hoy? Recordá seguir las indicaciones y escribirnos ante cualquier molestia.' },
  ];

  /** Quita emojis: WhatsApp Desktop en Windows los recibe dañados (se ven como un rombo con signo de pregunta) desde enlaces wa.me. */
  const clean = (t) => String(t || '')
    .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D\uFFFD]/gu, '')
    .replace(/[ \t]+([,.!?;:])/g, '$1').replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim();

  const tpl = (key) => OS.store.data.messageTemplates.find((t) => t.key === key) || DEFAULT_TEMPLATES.find((t) => t.key === key);
  const number = (raw) => U.normalizePhone(raw, OS.store.data.clinic.country || '595');
  const link = (raw, text = '') => { const n = number(raw); const t = clean(text); return n ? `https://wa.me/${n}${t ? `?text=${encodeURIComponent(t)}` : ''}` : null; };
  const text = (key, pid, extra) => clean(U.fillTemplate(tpl(key)?.body || '', OS.domain.messageVars(pid, extra)));

  /** Botón-enlace real (target _blank) para WhatsApp de un paciente. */
  function button(pid, { key = '', label = 'WhatsApp', kind = 'wa', extra, small = false } = {}) {
    const p = OS.domain.patient(pid); const raw = p?.whatsapp || p?.phone;
    const href = link(raw, key ? text(key, pid, extra) : '');
    if (!href) return `<span class="btn btn-ghost ${small ? 'btn-sm' : ''} is-disabled" title="El paciente no tiene número cargado">${OS.ui.icon('whatsapp')}<span>Sin número</span></span>`;
    return `<a class="btn btn-${kind} ${small ? 'btn-sm' : ''}" href="${esc(href)}" target="_blank" rel="noopener" data-wa-log="${esc(pid)}" data-wa-key="${esc(key)}">${OS.ui.icon('whatsapp')}<span>${esc(label)}</span></a>`;
  }

  /** Panel de mensajes rápidos: elige plantilla, edita el texto y abre WhatsApp. */
  function composer(pid, preset = 'confirmar', extra = {}) {
    const p = OS.domain.patient(pid); if (!p) return;
    const raw = p.whatsapp || p.phone;
    const opts = [...OS.store.data.messageTemplates.filter((t) => ['confirmar', 'pago', 'presupuesto', 'control', 'recordatorio48', 'recuperar', 'postoperatorio'].includes(t.key)), { key: 'libre', name: 'Mensaje personalizado', body: '' }];
    const m = OS.ui.modal({
      title: 'Mensaje por WhatsApp', subtitle: `${esc(OS.domain.fullName(p))} · ${esc(U.prettyPhone(raw))}`, size: 'md', guard: false,
      body: `<div class="chip-row" role="tablist">${opts.map((o) => `<button type="button" class="chip ${o.key === preset ? 'active' : ''}" data-k="${o.key}">${esc(o.name)}</button>`).join('')}</div>
        <label class="field"><span class="lbl">Texto del mensaje</span><textarea id="wa-text" rows="6"></textarea><small class="hint">Puedes ajustar el texto antes de abrir WhatsApp. Las plantillas se editan en Configuración → WhatsApp.</small></label>
        ${!number(raw) ? '<p class="note note-warn">Este paciente no tiene teléfono ni WhatsApp. Cárgalo en su ficha.</p>' : ''}`,
      actions: [{ label: 'Cerrar', kind: 'ghost', close: true }],
    });
    const ta = m.el.querySelector('#wa-text');
    const foot = m.el.querySelector('.modal-foot');
    const go = document.createElement('a'); go.className = 'btn btn-wa'; go.target = '_blank'; go.rel = 'noopener'; go.innerHTML = `${OS.ui.icon('whatsapp')}<span>Abrir WhatsApp</span>`;
    foot.appendChild(go);
    const refresh = () => { const h = link(raw, ta.value); if (h) go.href = h; else go.removeAttribute('href'); go.classList.toggle('is-disabled', !h); };
    const setKey = (k) => { ta.value = k === 'libre' ? `Hola ${p.firstName}, ` : text(k, pid, extra); m.el.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('active', b.dataset.k === k)); refresh(); };
    m.el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => setKey(b.dataset.k)));
    ta.addEventListener('input', refresh);
    go.addEventListener('click', () => { if (go.href) { OS.store.log('WhatsApp', 'patients', pid, `Mensaje a ${OS.domain.fullName(p)}`); OS.store.persist(); setTimeout(() => m.close(true), 300); } });
    setKey(preset);
  }

  // Registro en auditoría al abrir cualquier enlace de WhatsApp.
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-wa-log]'); if (a) { OS.store.log('WhatsApp', 'patients', a.dataset.waLog, `Abrió WhatsApp${a.dataset.waKey ? ` (${a.dataset.waKey})` : ''} con ${OS.domain.patientName(a.dataset.waLog)}`); OS.store.persist(); } });

  return { DEFAULT_TEMPLATES, tpl, link, text, clean, number, button, composer };
})();
