/* ODONTO SMART — Odonto Smart AI (módulo opcional).
   Funciona solo si el entorno ofrece un modelo de IA (por ejemplo, la vista publicada en claude.ai
   con permiso del visor). Sin conexión, el resto del sistema sigue funcionando normalmente.
   La IA no diagnostica: produce borradores administrativos/documentales que el profesional revisa. */
OS.views.ai = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const DISCLAIMER = 'La información generada por IA es un apoyo administrativo/documental y debe ser revisada por el profesional.';
  const ACTIONS = [
    ['resumen', 'Resumir historia clínica', 'Resume la historia clínica para el profesional en viñetas: antecedentes y alertas, hallazgos del odontograma, tratamientos realizados y pendientes, saldo. Máximo 180 palabras.'],
    ['evolucion', 'Convertir notas en evolución organizada', 'Convierte las notas del profesional en una evolución clínica con los apartados: Motivo, Diagnóstico (según lo anotado), Procedimiento, Materiales, Indicaciones. No agregues datos que no estén en las notas.'],
    ['postop', 'Instrucciones postoperatorias', 'Redacta instrucciones postoperatorias claras para el paciente sobre el procedimiento indicado en las notas. Lenguaje simple, viñetas, incluye cuándo consultar de urgencia.'],
    ['mensaje', 'Mensaje para el paciente', 'Redacta un mensaje breve y cordial de WhatsApp para el paciente según el objetivo descrito en las notas. Máximo 60 palabras, tuteo paraguayo respetuoso, sin emojis.'],
    ['tratamiento', 'Resumir tratamiento', 'Resume el plan de tratamiento y su estado (realizado / pendiente) y el saldo, en un párrafo que el profesional pueda leer al paciente.'],
    ['consentimiento', 'Borrador de consentimiento', 'Redacta un borrador de consentimiento informado para el procedimiento indicado en las notas: descripción, beneficios, riesgos frecuentes y poco frecuentes, alternativas y declaración de conformidad. Indica al final que debe revisarse con la normativa vigente.'],
    ['explicacion', 'Explicación sencilla para el paciente', 'Explica al paciente, con palabras simples y sin tecnicismos, el procedimiento o diagnóstico indicado en las notas. Máximo 120 palabras.'],
    ['dictado', 'Dictado a nota clínica', 'Transforma el dictado libre del profesional en una nota clínica ordenada y concisa, en tercera persona, sin inventar datos.'],
  ];
  let samplerP = null;
  const sampler = () => samplerP || (samplerP = window.claude?.use ? window.claude.use('sample').catch(() => null) : Promise.resolve(null));

  function context(pid) {
    if (!pid) return 'Sin paciente seleccionado.';
    const p = D.patient(pid); const m = S.data.medical[pid] || {};
    const notes = S.data.clinicalNotes.filter((n) => n.patientId === pid).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const teeth = [...D.UPPER, ...D.LOWER].map((t) => ({ t, s: D.toothState(pid, t) })).filter((x) => x.s.whole || Object.keys(x.s.surfaces).length);
    const plan = D.quotesOf(pid).filter((q) => q.status === 'aceptado').flatMap((q) => q.items.map((i) => `${i.name}${i.tooth ? ` (pieza ${i.tooth})` : ''}: ${i.done ? 'realizado' : 'pendiente'}`));
    return [`Paciente: ${p.firstName}, ${p.birthDate ? U.age(p.birthDate) + ' años' : 'edad no registrada'}.`,
      `Alergias: ${m.allergies || 'no registradas'}. Medicación: ${m.medications || 'no registrada'}. Condiciones: ${[m.diabetes && 'diabetes', m.hypertension && 'hipertensión', m.cardio && 'cardiopatía', m.coagulation && 'coagulación', m.pregnant && 'embarazo'].filter(Boolean).join(', ') || 'ninguna registrada'}. Otros: ${m.other || '—'}.`,
      `Odontograma: ${teeth.map(({ t, s }) => `${t} ${[s.whole && D.STATES[s.whole].label, ...Object.entries(s.surfaces).map(([k, v]) => `${D.STATES[v].label} ${k}`)].filter(Boolean).join('/')}`).join('; ') || 'sin hallazgos registrados'}.`,
      `Plan: ${plan.join('; ') || 'sin plan aceptado'}. Saldo: ${U.money(D.balance(pid).balance)}.`,
      `Evoluciones recientes: ${notes.map((n) => `${U.fmtDate(n.date)} ${n.reason}: ${n.procedure || n.diagnosis || ''}`).join(' | ') || 'ninguna'}.`].join('\n');
  }

  function render(el, params) {
    const pid = params.patientId || '';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Módulo opcional</span><h1>🤖 Odonto Smart AI</h1><p>Borradores de documentos y mensajes a partir de los datos que tú eliges.</p></div></div>
      <p class="disclaimer">${ui.icon('alert')}<span>${DISCLAIMER} No realiza diagnósticos ni reemplaza el criterio profesional.</span></p>
      <div id="ai-state"></div>
      <div class="grid-main"><section class="panel"><div class="form-grid">
        ${ui.field('Paciente', `<div class="row gap"><input id="ai-p" readonly value="${esc(pid ? D.patientName(pid) : '')}" placeholder="Opcional"><button class="btn btn-sm" id="ai-pick">${ui.icon('users')}<span>Elegir</span></button></div>`, { span: 2 })}
        ${ui.field('¿Qué necesitas?', ui.select('act', ACTIONS.map(([k, l]) => [k, l]), params.act || 'resumen'), { span: 2 })}
        ${ui.field('Notas, dictado u objetivo', '<textarea id="ai-notes" rows="5" placeholder="Ej.: Extracción de 38 hoy, sutura reabsorbible, paciente refiere ansiedad…"></textarea>', { span: 2 })}</div>
        <label class="check"><input type="checkbox" id="ai-ctx" ${pid ? 'checked' : ''}><span>Incluir datos de la ficha (nombre de pila, antecedentes, odontograma, plan y saldo)</span></label>
        <div class="row gap"><button class="btn btn-primary" id="ai-go">${ui.icon('ai')}<span>Generar borrador</span></button><button class="btn btn-ghost" id="ai-stop" hidden>Detener</button></div></section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('file')}Resultado</h3></div><div class="ai-out" id="ai-out" aria-live="polite"><span class="muted">El borrador aparecerá aquí.</span></div>
        <div class="row gap wrap" id="ai-acts" hidden><button class="btn btn-sm" id="ai-copy">${ui.icon('copy')}<span>Copiar</span></button><button class="btn btn-sm" id="ai-note">${ui.icon('clinical')}<span>Usar como evolución</span></button><button class="btn btn-sm btn-wa" id="ai-wa">${ui.icon('whatsapp')}<span>Usar en WhatsApp</span></button></div>
        <p class="muted small">${DISCLAIMER}</p></section></div>`;
    let patient = pid; let ctrl = null;
    const out = el.querySelector('#ai-out'); const go = el.querySelector('#ai-go'); const acts = el.querySelector('#ai-acts');
    sampler().then((s) => { if (!s) { el.querySelector('#ai-state').innerHTML = `<p class="note note-warn">${ui.icon('alert')}<span><b>Módulo de IA no conectado en este equipo.</b> Requiere Internet y un servicio de IA configurado (por ejemplo, una clave de API en la versión de escritorio). Todo el resto de ODONTO SMART funciona sin conexión.</span></p>`; go.disabled = true; } });
    el.querySelector('#ai-pick').onclick = async () => { const id = await OS.app.pickPatient(); if (id) { patient = id; el.querySelector('#ai-p').value = D.patientName(id); el.querySelector('#ai-ctx').checked = true; } };
    go.onclick = async () => {
      const s = await sampler(); if (!s) return;
      const act = ACTIONS.find((a) => a[0] === el.querySelector('#f-act').value); const notes = el.querySelector('#ai-notes').value.trim();
      if (['evolucion', 'dictado', 'postop', 'consentimiento', 'explicacion', 'mensaje'].includes(act[0]) && !notes) return ui.toast('Escribe las notas o el objetivo para esta función.', 'warn');
      if (['resumen', 'tratamiento'].includes(act[0]) && !patient) return ui.toast('Elige un paciente para esta función.', 'warn');
      const useCtx = el.querySelector('#ai-ctx').checked && patient;
      const prompt = `Eres un asistente administrativo y documental de un consultorio odontológico en Paraguay. Escribe en español. No hagas diagnósticos definitivos ni indiques medicación nueva; si algo requiere criterio clínico, indícalo como "a definir por el profesional". No inventes datos.\n\nTarea: ${act[2]}\n\n${useCtx ? `Datos de la ficha:\n${context(patient)}\n\n` : ''}Notas del profesional:\n${notes || '(sin notas)'}\n\nDevuelve solo el texto final, sin preámbulos.`;
      ctrl = new AbortController(); go.disabled = true; el.querySelector('#ai-stop').hidden = false; acts.hidden = true; out.textContent = 'Generando…';
      try {
        const r = await s(prompt, { signal: ctrl.signal, cache: false, onText: ({ text }) => { out.textContent = text; } });
        out.textContent = r.text; acts.hidden = false;
        S.log('IA', 'ai', patient || null, `${act[1]}${patient ? ` (${D.patientName(patient)})` : ''}`); S.persist();
      } catch (e) {
        out.textContent = e?.text || '';
        ui.toast(e?.code === 'cancelled' ? 'Generación detenida.' : e?.code === 'not_granted' ? 'No se otorgó permiso para usar la IA en esta vista.' : e?.code === 'rate_limited' ? 'Demasiadas solicitudes. Espera un momento.' : 'No se pudo generar el borrador. Intenta nuevamente.', 'warn');
      } finally { go.disabled = false; el.querySelector('#ai-stop').hidden = true; }
    };
    el.querySelector('#ai-stop').onclick = () => ctrl?.abort();
    el.querySelector('#ai-copy').onclick = async () => { try { await navigator.clipboard.writeText(out.textContent); ui.toast('Copiado.'); } catch { const r = document.createRange(); r.selectNodeContents(out); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); ui.toast('Texto seleccionado: usa Ctrl+C.'); } };
    el.querySelector('#ai-note').onclick = () => { if (!patient) return ui.toast('Elige un paciente.', 'warn'); OS.views.clinical.form({ patientId: patient, reason: 'Nota asistida por IA (revisada)', procedure: out.textContent }, () => OS.app.go('patient', { id: patient, tab: 'evolucion' })); };
    el.querySelector('#ai-wa').onclick = () => { if (!patient) return ui.toast('Elige un paciente.', 'warn'); const p = D.patient(patient); const href = OS.wa.link(p.whatsapp || p.phone, out.textContent); if (!href) return ui.toast('El paciente no tiene número cargado.', 'warn'); const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); };
  }

  return { render, perm: 'ia', DISCLAIMER };
})();
