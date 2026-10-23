/* ODONTO SMART — Odontograma interactivo (notación FDI).
   Cada cambio es un registro fechado; el estado actual se calcula del historial.
   Superficies: O oclusal/incisal, M mesial, D distal, V vestibular, L lingual/palatina. */
OS.views.odontogram = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const MOLAR = (t) => [6, 7, 8].includes(t % 10) || (t > 50 && [4, 5].includes(t % 10));

  // Vista del menú: elegir paciente y montar el odontograma.
  function render(el, params) {
    const pid = params.patientId;
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Odontograma</span><h1>${pid ? esc(D.patientName(pid)) : 'Odontograma'}</h1><p>${pid ? 'Selecciona una pieza para ver su estado e historial.' : 'Elige un paciente para abrir su odontograma.'}</p></div>
      <div class="page-actions"><button class="btn" id="o-pick">${ui.icon('users')}<span>${pid ? 'Cambiar paciente' : 'Elegir paciente'}</span></button>${pid ? `<button class="btn btn-ghost" id="o-ficha">${ui.icon('clinical')}<span>Ver ficha</span></button>` : ''}</div></div><div id="o-body"></div>`;
    el.querySelector('#o-pick').onclick = async () => { const id = await OS.app.pickPatient('Abrir odontograma de…'); if (id) OS.app.refresh({ patientId: id }); };
    el.querySelector('#o-ficha')?.addEventListener('click', () => OS.app.go('patient', { id: pid, tab: 'odontograma' }));
    if (pid) mount(el.querySelector('#o-body'), pid);
    else {
      const recent = [...new Set(S.data.toothRecords.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map((r) => r.patientId))].slice(0, 6);
      el.querySelector('#o-body').innerHTML = `<section class="panel"><h3>Pacientes con odontograma reciente</h3>${recent.length ? `<div class="pp-list">${recent.map((id) => `<button class="pp-item" data-id="${id}">${ui.avatar(D.patientName(id), D.patient(id)?.photo, 30)}<span><b>${esc(D.patientName(id))}</b><small>${D.toothRecords(id).length} registros</small></span></button>`).join('')}</div>` : '<p class="muted">Todavía no hay registros.</p>'}</section>`;
      el.querySelector('#o-body').onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) OS.app.refresh({ patientId: b.dataset.id }); };
    }
  }

  // ---------- Dibujo de una pieza ----------
  function toothSVG(n, st) {
    const q = Math.floor(n / 10); const upper = [1, 2, 5, 6].includes(q); const rightSide = [1, 4, 5, 8].includes(q);
    const bx = upper ? 20 : 2; // y del cuadro de superficies
    const col = (s) => (st.surfaces[s] ? D.STATES[st.surfaces[s]].color : 'var(--t-sana)');
    // superficie visual → código
    const top = upper ? 'V' : 'L'; const bottom = upper ? 'L' : 'V'; const left = rightSide ? 'D' : 'M'; const right = rightSide ? 'M' : 'D';
    const y0 = bx; const y1 = bx + 36; const i0 = bx + 11; const i1 = bx + 25;
    const poly = (pts, s) => `<polygon class="surf" points="${pts}" style="fill:${col(s)}"><title>${D.SURFACES.find((x) => x[0] === s)[1]}</title></polygon>`;
    const root = upper
      ? (MOLAR(n) ? 'M9 19 C9 10 11 3 14 2 C16 6 16 13 18 19 M22 19 C24 13 24 6 26 2 C29 3 31 10 31 19' : 'M13 19 C13 9 17 2 20 1 C23 2 27 9 27 19')
      : (MOLAR(n) ? 'M9 41 C9 50 11 57 14 58 C16 54 16 47 18 41 M22 41 C24 47 24 54 26 58 C29 57 31 50 31 41' : 'M13 41 C13 51 17 58 20 59 C23 58 27 51 27 41');
    const ry0 = upper ? 2 : 42; const ry1 = upper ? 18 : 58;
    let over = '';
    const w = st.whole;
    if (w === 'ausente') over = `<path class="mark" d="M4 ${y0 + 2} 36 ${y1 - 2} M36 ${y0 + 2} 4 ${y1 - 2}" style="stroke:var(--t-ausente)"/>`;
    if (w === 'extraccion') over = `<path class="mark" d="M4 ${y0 + 2} 36 ${y1 - 2} M36 ${y0 + 2} 4 ${y1 - 2}" style="stroke:var(--t-caries)"/>`;
    if (w === 'corona') over = `<circle cx="20" cy="${bx + 18}" r="19" fill="none" class="mark" style="stroke:var(--t-corona);stroke-width:2.6"/>`;
    if (w === 'endodoncia') over = `<path class="mark" d="M20 ${ry0 + 1} 20 ${ry1}" style="stroke:var(--t-endo)"/>`;
    if (w === 'implante') over = `<path class="mark" d="M20 ${ry0} 20 ${ry1} M15 ${ry0 + 4} 25 ${ry0 + 4} M15 ${ry0 + 8} 25 ${ry0 + 8} M15 ${ry0 + 12} 25 ${ry0 + 12}" style="stroke:var(--t-implante);stroke-width:2.2"/>`;
    if (w === 'protesis') over = `<path class="mark" d="M0 ${upper ? y1 + 2 : y0 - 2} 40 ${upper ? y1 + 2 : y0 - 2}" style="stroke:var(--t-protesis);stroke-width:3.5"/>`;
    if (w === 'otro') over = `<circle cx="20" cy="${bx + 18}" r="4" style="fill:var(--t-otro)"/>`;
    return `<svg viewBox="0 -2 40 64" aria-hidden="true">
      <path d="${root}" fill="none" stroke="var(--line-strong)" stroke-width="1.6" stroke-linecap="round"/>
      ${poly(`2,${y0} 38,${y0} 29,${i0} 11,${i0}`, top)}${poly(`2,${y1} 38,${y1} 29,${i1} 11,${i1}`, bottom)}
      ${poly(`2,${y0} 11,${i0} 11,${i1} 2,${y1}`, left)}${poly(`38,${y0} 29,${i0} 29,${i1} 38,${y1}`, right)}
      <rect class="surf" x="11" y="${i0}" width="18" height="14" style="fill:${col('O')}"><title>Oclusal / incisal</title></rect>${over}</svg>`;
  }

  const cell = (pid, n, sel) => {
    const st = D.toothState(pid, n);
    const label = [st.whole && D.STATES[st.whole].label, ...Object.entries(st.surfaces).map(([s, v]) => `${D.STATES[v].label} ${s}`)].filter(Boolean).join(', ') || 'Sana';
    return `<button class="tooth ${sel === n ? 'sel' : ''} ${st.whole === 'ausente' ? 'is-ausente' : ''}" data-t="${n}" aria-label="Pieza ${n}: ${esc(label)}" title="${n} · ${esc(label)}">
      ${[1, 2, 5, 6].includes(Math.floor(n / 10)) ? `<span class="tn">${n}</span>${toothSVG(n, st)}` : `${toothSVG(n, st)}<span class="tn">${n}</span>`}${st.count && !st.whole && !Object.keys(st.surfaces).length ? '<i class="flag" aria-hidden="true"></i>' : ''}</button>`;
  };

  // ---------- Montaje dentro de la ficha o la vista ----------
  function mount(el, pid) {
    let sel = null; let kid = false; let flash = '';
    const draw = () => {
      const up = kid ? D.UPPER_KID : D.UPPER; const lo = kid ? D.LOWER_KID : D.LOWER;
      el.innerHTML = `<div class="odo-layout">
        <section class="odo-board" aria-label="Odontograma">
          <div class="row gap wrap"><div class="seg" role="tablist"><button class="${kid ? '' : 'active'}" data-kid="0">Adulto</button><button class="${kid ? 'active' : ''}" data-kid="1">Infantil</button></div>
            <span class="muted small">Haz clic en una pieza. Derecha del paciente a la izquierda de la pantalla.</span>
            <button class="btn btn-sm btn-ghost right" id="odo-pdf">${ui.icon('download')}<span>Historia clínica PDF</span></button></div>
          <div class="odo-arch ${kid ? 'kid' : ''}">${up.map((n) => cell(pid, n, sel)).join('')}</div>
          <div class="odo-mid">Superior · Inferior</div>
          <div class="odo-arch ${kid ? 'kid' : ''}">${lo.map((n) => cell(pid, n, sel)).join('')}</div>
          <div class="odo-legend">${Object.entries(D.STATES).filter(([k]) => k !== 'otro').map(([, s]) => `<span><i style="background:${s.color}"></i>${s.label}</span>`).join('')}</div>
        </section>
        <aside class="panel tooth-panel" id="odo-panel">${panel(pid, sel, flash)}</aside></div>`;
      flash = '';
      el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { sel = Number(b.dataset.t); draw(); if (window.innerWidth < 1180) el.querySelector('#odo-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
      el.querySelectorAll('[data-kid]').forEach((b) => (b.onclick = () => { kid = b.dataset.kid === '1'; sel = null; draw(); }));
      el.querySelector('#odo-pdf').onclick = () => OS.pdf.present(OS.pdf.historyModel(pid), { patientId: pid, category: 'Estudios' });
      const P = el.querySelector('#odo-panel');
      P.querySelector('#tp-dx')?.addEventListener('click', () => recordForm(pid, sel, 'diagnostico', draw));
      P.querySelector('#tp-tx')?.addEventListener('click', () => treatmentForm(pid, sel, (msg) => { flash = msg; draw(); }));
      P.querySelector('#tp-note')?.addEventListener('click', () => noteForm(pid, sel, draw));
      P.querySelector('#tp-img')?.addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 8 * 1024 * 1024) return ui.toast('La imagen supera 8 MB.', 'warn');
        const dataUrl = await U.readFile(f);
        const doc = S.insert('documents', { patientId: pid, category: 'Radiografías', name: f.name, mime: f.type, dataUrl, size: f.size, date: U.today(), note: `Pieza ${sel}`, tooth: sel }, `Imagen de pieza ${sel} (${D.patientName(pid)})`);
        S.insert('toothRecords', { patientId: pid, tooth: sel, kind: 'imagen', state: '', surfaces: [], date: U.today(), note: f.name, docId: doc.id, professionalId: OS.auth.current()?.professionalId || null });
        ui.toast('Imagen asociada a la pieza.'); draw();
      });
      P.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
        if (await ui.confirm({ title: 'Anular registro', text: 'El registro se quitará del historial de la pieza. La acción queda en la auditoría.', ok: 'Anular', kind: 'danger' })) { S.remove('toothRecords', b.dataset.del, `Registro de pieza ${sel} de ${D.patientName(pid)}`); draw(); }
      }));
      P.querySelector('[data-open-quote]')?.addEventListener('click', (e) => OS.app.go('quote', { id: e.currentTarget.dataset.openQuote }));
      P.querySelectorAll('[data-viewdoc]').forEach((b) => (b.onclick = () => OS.views.documents.view(b.dataset.viewdoc)));
    };
    draw();
  }

  function panel(pid, n, flash) {
    if (!n) return `<h3>Selecciona una pieza</h3><p class="muted">Verás su estado actual, diagnósticos, tratamientos e historial.</p>${ui.empty('Ninguna pieza seleccionada', 'Toca un diente del odontograma.')}`;
    const st = D.toothState(pid, n); const recs = D.toothRecords(pid, n).slice().reverse();
    const chips = [st.whole && `<span class="badge badge-info">${D.STATES[st.whole].label}</span>`, ...Object.entries(st.surfaces).map(([s, v]) => `<span class="badge ${v === 'caries' ? 'badge-danger' : 'badge-ok'}">${D.STATES[v].label} · ${s}</span>`)].filter(Boolean);
    const canEdit = OS.auth.can('clinica');
    const pending = OS.store.data.quotes.filter((q) => q.patientId === pid && q.items.some((i) => String(i.tooth) === String(n) && !i.done));
    return `<div><h2>PIEZA ${n}</h2><p class="tp-sub">${esc(D.toothName(n))}</p></div>
      ${flash}
      <div><span class="lbl">Estado actual</span><div class="chip-row" style="margin-top:6px">${chips.join('') || '<span class="badge badge-ok">✓ Sana</span>'}</div></div>
      ${pending.length ? `<div><span class="lbl">Tratamientos planificados</span><ul class="list-plain small" style="margin-top:6px">${pending.flatMap((q) => q.items.filter((i) => String(i.tooth) === String(n) && !i.done).map((i) => `<li>${ui.badge(q.status === 'aceptado' ? 'por_realizar' : q.status)} ${esc(i.name)} · <button class="link" data-open-quote="${q.id}">${q.number}</button></li>`)).join('')}</ul></div>` : ''}
      ${canEdit ? `<div class="tp-actions"><button class="btn btn-sm btn-primary" id="tp-dx">${ui.icon('plus')}<span>Diagnóstico</span></button><button class="btn btn-sm btn-soft" id="tp-tx">${ui.icon('plus')}<span>Tratamiento</span></button>
        <button class="btn btn-sm" id="tp-note">${ui.icon('plus')}<span>Nota</span></button><label class="btn btn-sm">${ui.icon('plus')}<span>Imagen</span><input type="file" id="tp-img" accept="image/*,application/pdf" hidden></label></div>` : ''}
      <div><span class="lbl">Historial de la pieza</span>
        ${recs.length ? `<div class="timeline" style="margin-top:8px">${recs.map((r) => `<div class="tl-item kind-${r.kind}"><span class="tl-date">${U.fmtDate(r.date)} · ${esc(D.profName(r.professionalId))}</span>
          <b>${r.kind === 'nota' ? 'Nota' : r.kind === 'imagen' ? 'Imagen' : `${r.kind === 'tratamiento' ? 'Tratamiento realizado' : 'Diagnóstico'}: ${esc(D.STATES[r.state]?.label || r.state)}`}${r.surfaces?.length ? ` <span class="mono small">(${r.surfaces.join(', ')})</span>` : ''}</b>
          ${r.note ? `<span class="muted small">${esc(r.note)}</span>` : ''}<div class="row gap">${r.docId ? `<button class="link small" data-viewdoc="${r.docId}">Ver imagen</button>` : ''}${canEdit ? `<button class="link small" data-del="${r.id}" style="color:var(--danger)">Anular</button>` : ''}</div></div>`).join('')}</div>` : '<p class="muted small">Sin registros. La pieza figura como sana.</p>'}
      </div>`;
  }

  const stateRadios = (value) => `<div class="state-pick">${Object.entries(D.STATES).map(([k, s]) => `<label><input type="radio" name="state" value="${k}" ${k === value ? 'checked' : ''}><i style="background:${s.color}"></i>${s.label}</label>`).join('')}</div>`;
  const surfaceChecks = (vals = []) => `<div class="surf-pick">${D.SURFACES.map(([k, l]) => `<label><input type="checkbox" name="surfaces" data-multi="1" value="${k}" ${vals.includes(k) ? 'checked' : ''}><b>${k}</b>${l.split(' ')[0]}</label>`).join('')}</div>`;

  function recordForm(pid, n, kind, done) {
    const m = ui.modal({
      title: `Pieza ${n} · ${kind === 'tratamiento' ? 'Tratamiento realizado' : 'Diagnóstico'}`, subtitle: esc(D.toothName(n)), size: 'md',
      body: `<form id="rf" class="form-sections"><div class="form-section"><h4>Estado</h4>${stateRadios(kind === 'tratamiento' ? 'restauracion' : 'caries')}</div>
        <div class="form-section"><h4>Superficies</h4>${surfaceChecks(kind === 'diagnostico' ? ['O'] : [])}<small class="hint">Para estados de toda la pieza (corona, ausente, implante…) no hace falta elegir superficies.</small></div>
        <div class="form-section"><div class="form-grid">${ui.field('Tipo', ui.select('kind', [['diagnostico', 'Diagnóstico / hallazgo'], ['tratamiento', 'Tratamiento realizado']], kind))}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}${ui.field('Observaciones', ui.textarea('note', '', 'rows="2"'), { span: 2 })}</div></div>
        <p class="form-error" id="rf-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Registrar', kind: 'primary', submit: true, form: 'rf', icon: 'check' }],
    });
    m.el.querySelector('#rf').onsubmit = (e) => {
      e.preventDefault(); const v = U.formData(e.target);
      const def = D.STATES[v.state];
      if (def.scope === 'surface' && !v.surfaces?.length) { const x = m.el.querySelector('#rf-err'); x.hidden = false; x.textContent = `Elige al menos una superficie para "${def.label}".`; return; }
      S.insert('toothRecords', { patientId: pid, tooth: n, state: v.state, surfaces: def.scope === 'tooth' ? [] : v.surfaces || [], kind: v.kind, date: v.date || U.today(), note: v.note, professionalId: OS.auth.current()?.professionalId || null }, `Pieza ${n}: ${def.label} (${D.patientName(pid)})`);
      m.markClean(); m.close(true); ui.toast(`Pieza ${n}: ${def.label.toLowerCase()} registrado.`); done();
    };
  }

  function noteForm(pid, n, done) {
    const m = ui.modal({ title: `Pieza ${n} · Nota`, size: 'sm', body: `<form id="nf">${ui.field('Nota', ui.textarea('note', '', 'rows="4" required'))}</form>`, actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar nota', kind: 'primary', submit: true, form: 'nf' }] });
    m.el.querySelector('#nf').onsubmit = (e) => { e.preventDefault(); const v = U.formData(e.target); if (!v.note) return; S.insert('toothRecords', { patientId: pid, tooth: n, kind: 'nota', state: '', surfaces: [], date: U.today(), note: v.note, professionalId: OS.auth.current()?.professionalId || null }, `Nota en pieza ${n}`); m.markClean(); m.close(true); done(); };
  }

  /** Tratamiento: se agrega a un presupuesto (nuevo o en borrador) y opcionalmente se marca realizado. */
  function treatmentForm(pid, n, done) {
    const cat = S.data.treatments.filter((t) => t.active !== false);
    const drafts = D.quotesOf(pid).filter((q) => ['borrador', 'enviado'].includes(q.status));
    const st = D.toothState(pid, n); const hasCaries = Object.values(st.surfaces).includes('caries');
    const suggested = cat.find((t) => (hasCaries ? /resina compuesta/i : /consulta/i).test(t.name)) || cat[0];
    const m = ui.modal({
      title: `Pieza ${n} · Tratamiento`, subtitle: esc(D.toothName(n)), size: 'md',
      body: `<form id="tf" class="form-sections"><div class="form-section"><div class="form-grid">
        ${ui.field('Tratamiento', ui.select('treatmentId', cat.map((t) => [t.id, `${t.name} · ${U.money(t.price)}`]), suggested?.id), { span: 2 })}
        ${ui.field('Precio', ui.input('price', U.thousands(suggested?.price), 'inputmode="numeric"'))}
        ${ui.field('Agregar a', ui.select('quoteId', [['new', 'Nuevo presupuesto'], ...drafts.map((q) => [q.id, `Presupuesto ${q.number} (${q.status})`])], drafts[0]?.id || 'new'))}</div></div>
        <div class="form-section"><label class="check"><input type="checkbox" name="doneNow" id="f-doneNow"><span>Ya fue realizado hoy (registra la evolución y actualiza el odontograma)</span></label>
          <div id="tf-done" hidden>${surfaceChecks(Object.keys(st.surfaces))}</div></div></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Agregar tratamiento', kind: 'primary', submit: true, form: 'tf', icon: 'check' }],
    });
    const f = m.el.querySelector('#tf');
    f.treatmentId.onchange = () => { const t = cat.find((x) => x.id === f.treatmentId.value); f.price.value = U.thousands(t.price); };
    f.doneNow.onchange = () => { m.el.querySelector('#tf-done').hidden = !f.doneNow.checked; };
    f.price.addEventListener('blur', () => { f.price.value = U.thousands(U.parseMoney(f.price.value)); });
    f.onsubmit = (e) => {
      e.preventDefault(); const v = U.formData(f); const t = cat.find((x) => x.id === v.treatmentId); const price = U.parseMoney(v.price);
      let q = v.quoteId !== 'new' && S.get('quotes', v.quoteId);
      const it = { id: U.uid('itm'), treatmentId: t.id, name: t.name, tooth: String(n), qty: 1, price, done: !!v.doneNow };
      if (q) S.update('quotes', q.id, { items: [...q.items, it] }, `Agregó ${t.name} (pieza ${n}) al presupuesto ${q.number}`);
      else q = OS.views.quotes.newQuote(pid, [it]);
      if (v.doneNow) {
        D.recordTreatmentDone(pid, n, t.name, U.today(), v.surfaces);
        S.insert('clinicalNotes', { patientId: pid, professionalId: OS.auth.current()?.professionalId || S.data.professionals[0]?.id, date: U.today(), reason: t.name, diagnosis: '', procedure: `${t.name} en pieza ${n}`, observations: '', indications: '', materials: '' }, `Evolución: ${t.name}`);
      }
      m.markClean(); m.close(true);
      ui.toast(`${t.name} agregado al presupuesto ${q.number}.`);
      done(`<p class="note note-ok">${ui.icon('check')}<span>Agregado al presupuesto <b>${q.number}</b> (${q.status}). <button class="link" data-open-quote="${q.id}">Abrir presupuesto</button></span></p>`);
    };
  }

  return { render, mount, perm: 'clinica', crumbs: (p) => ['Odontograma', p.patientId ? D.patientName(p.patientId) : ''] };
})();
