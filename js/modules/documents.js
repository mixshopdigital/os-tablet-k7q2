/* ODONTO SMART — Documentos: radiografías, fotos, estudios, PDFs; antes/después;
   recetas y consentimientos (plantillas editables, PDF y copia firmada). */
OS.views.documents = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const CATS = ['Radiografías', 'Fotografías', 'Estudios', 'Consentimientos', 'Recetas', 'PDFs', 'Otros'];
  const MAX = 8 * 1024 * 1024;

  // ---------- Vista general ----------
  function render(el, params) {
    const tab = params.tab || 'archivos';
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Documentos</span><h1>Documentos clínicos</h1><p>${S.data.documents.length} archivos · ${U.fmtSize(U.sum(S.data.documents, (d) => d.size || 0))} guardados en este equipo</p></div></div>
      <nav class="tabs" id="d-tabs">${[['archivos', 'Archivos', 'folder'], ['consentimientos', 'Consentimientos', 'shield'], ['recetas', 'Recetas', 'rx']].map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav><div id="d-body"></div>`;
    ui.tabs(el.querySelector('#d-tabs'), (k) => OS.app.refresh({ tab: k }));
    const body = el.querySelector('#d-body');
    if (tab === 'archivos') {
      const cat = params.cat || '';
      const docs = S.data.documents.filter((d) => !cat || d.category === cat).sort((a, b) => b.date.localeCompare(a.date));
      body.innerHTML = `<div class="row gap wrap"><div class="chip-row" id="d-cat"><button class="chip ${!cat ? 'active' : ''}" data-c="">Todas</button>${CATS.map((c) => `<button class="chip ${c === cat ? 'active' : ''}" data-c="${c}">${c}<b>${S.data.documents.filter((d) => d.category === c).length}</b></button>`).join('')}</div><button class="btn btn-primary right" id="d-up">${ui.icon('upload')}<span>Subir documento</span></button></div>${grid(docs, true)}`;
      body.querySelector('#d-cat').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) OS.app.refresh({ cat: b.dataset.c }); };
      body.querySelector('#d-up').onclick = async () => { const pid = await OS.app.pickPatient('Documento de…'); if (pid) upload(pid); };
      wireGrid(body);
    } else if (tab === 'consentimientos') {
      body.innerHTML = `<div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('shield')}Biblioteca de plantillas</h3>${OS.auth.can('config') ? `<button class="btn btn-sm btn-primary" id="ct-new">${ui.icon('plus')}<span>Nueva plantilla</span></button>` : ''}</div>
        <div class="pp-list" style="max-height:none">${S.data.consentTemplates.map((t) => `<button class="pp-item" data-ct="${t.id}">${ui.icon('file')}<span><b>${esc(t.name)}</b><small>${esc(t.body.slice(0, 90))}…</small></span></button>`).join('')}</div><p class="hint">Usa [Nombre completo] y [Consultorio]; se completan al generar. Revisa los textos con la normativa aplicable a tu práctica.</p></section>
        <section class="panel"><div class="panel-head"><h3>${ui.icon('file')}Consentimientos generados</h3><button class="btn btn-sm" id="cs-new">${ui.icon('plus')}<span>Generar para un paciente</span></button></div>${consentTable(S.data.consents, true)}</section></div>`;
      body.querySelectorAll('[data-ct]').forEach((b) => (b.onclick = () => templateForm(S.get('consentTemplates', b.dataset.ct))));
      body.querySelector('#ct-new')?.addEventListener('click', () => templateForm());
      body.querySelector('#cs-new').onclick = async () => { const pid = await OS.app.pickPatient('Consentimiento para…'); if (pid) consentForm(pid); };
      wireConsents(body);
    } else {
      body.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('rx')}Recetas emitidas</h3><button class="btn btn-sm btn-primary" id="rx-new">${ui.icon('plus')}<span>Nueva receta</span></button></div>${rxTable(S.data.prescriptions, true)}</section>`;
      body.querySelector('#rx-new').onclick = async () => { const pid = await OS.app.pickPatient('Receta para…'); if (pid) rxForm(pid); };
      body.querySelectorAll('[data-rx]').forEach((b) => (b.onclick = () => OS.pdf.present(OS.pdf.prescriptionModel(S.get('prescriptions', b.dataset.rx)), { patientId: S.get('prescriptions', b.dataset.rx).patientId, category: 'Recetas' })));
    }
  }

  // ---------- Archivos ----------
  function grid(docs, showPatient) {
    if (!docs.length) return ui.empty('Sin documentos', 'Sube radiografías, fotos, estudios o PDFs.');
    return `<div class="doc-grid">${docs.map((d) => `<article class="doc-card"><button class="doc-thumb" data-view="${d.id}" style="border:0;cursor:pointer" aria-label="Ver ${esc(d.name)}">${d.mime?.startsWith('image') ? `<img src="${d.dataUrl}" alt="">` : ui.icon('file')}</button>
      <div class="meta"><b title="${esc(d.name)}">${esc(d.name)}</b><span class="muted small">${esc(d.category)} · ${U.fmtDate(d.date)}${d.tooth ? ` · pieza ${d.tooth}` : ''}</span>${showPatient ? `<button class="link small" data-pat="${d.patientId}" style="text-align:left">${esc(D.patientName(d.patientId))}</button>` : ''}</div>
      <div class="acts"><button class="btn btn-sm btn-ghost" data-dl="${d.id}">${ui.icon('download')}<span>Descargar</span></button><button class="icon-btn" data-del="${d.id}" aria-label="Eliminar">${ui.icon('trash')}</button></div></article>`).join('')}</div>`;
  }
  function wireGrid(root) {
    root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => view(b.dataset.view)));
    root.querySelectorAll('[data-dl]').forEach((b) => (b.onclick = () => { const d = S.get('documents', b.dataset.dl); OS.files.save(d.name, OS.files.dataUrlToBlob(d.dataUrl)); }));
    root.querySelectorAll('[data-pat]').forEach((b) => (b.onclick = () => OS.app.go('patient', { id: b.dataset.pat, tab: 'documentos' })));
    root.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => { const d = S.get('documents', b.dataset.del); if (await ui.confirm({ title: 'Eliminar documento', text: `"${d.name}" se eliminará de este equipo.`, ok: 'Eliminar', kind: 'danger' })) { S.remove('documents', d.id, `Documento ${d.name} de ${D.patientName(d.patientId)}`); OS.app.refresh(); } }));
  }
  function view(id) {
    const d = S.get('documents', id); if (!d) return;
    const m = ui.modal({ title: d.name, subtitle: `${esc(D.patientName(d.patientId))} · ${esc(d.category)} · ${U.fmtDate(d.date)}`, size: 'lg', guard: false,
      body: d.mime?.startsWith('image') ? `<img src="${d.dataUrl}" alt="${esc(d.name)}" style="max-height:65vh;object-fit:contain;margin:auto;border-radius:8px">` : `<div class="empty">${ui.icon('file')}<h3>${esc(d.name)}</h3><p>${U.fmtSize(d.size || 0)} · ${esc(d.note || '')}</p></div>`,
      actions: [...(OS.files.canOpenWindow && !d.mime?.startsWith('image') ? [{ label: 'Abrir', kind: 'ghost', id: 'dv-open', icon: 'eye' }] : []), { label: 'Descargar', kind: 'primary', id: 'dv-dl', icon: 'download' }] });
    m.el.querySelector('#dv-dl').onclick = () => OS.files.save(d.name, OS.files.dataUrlToBlob(d.dataUrl));
    m.el.querySelector('#dv-open')?.addEventListener('click', () => OS.files.openBlob(OS.files.dataUrlToBlob(d.dataUrl)));
  }
  function upload(pid, preset = {}) {
    const m = ui.modal({ title: 'Subir documento', subtitle: esc(D.patientName(pid)), size: 'md',
      body: `<form id="uf" class="form-grid">${ui.field('Archivos', '<input type="file" id="uf-files" multiple required accept="image/*,application/pdf,.doc,.docx">', { span: 2, hint: 'Imágenes o PDF de hasta 8 MB cada uno.' })}
        ${ui.field('Categoría', ui.select('category', CATS, preset.category || 'Radiografías'))}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}
        ${ui.field('Pieza (opcional)', ui.input('tooth', ''))}${ui.field('Nota', ui.input('note', preset.note || ''))}${preset.pair ? `<input type="hidden" name="pair" value="${esc(preset.pair)}"><input type="hidden" name="side" value="${esc(preset.side)}">` : ''}<p class="form-error field span-2" id="uf-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'uf', icon: 'upload' }] });
    m.el.querySelector('#uf').onsubmit = async (e) => {
      e.preventDefault(); const v = U.formData(e.target); const files = [...m.el.querySelector('#uf-files').files];
      const err = (t) => { const x = m.el.querySelector('#uf-err'); x.hidden = false; x.textContent = t; };
      if (!files.length) return err('Elige al menos un archivo.');
      const big = files.find((f) => f.size > MAX); if (big) return err(`${big.name} supera 8 MB.`);
      for (const f of files) S.insert('documents', { patientId: pid, ...v, tooth: v.tooth ? Number(v.tooth) || v.tooth : null, name: f.name, mime: f.type, size: f.size, dataUrl: await U.readFile(f) }, `Documento ${f.name} de ${D.patientName(pid)}`);
      m.markClean(); m.close(true); ui.toast(files.length > 1 ? `${files.length} documentos guardados.` : 'Documento guardado.'); OS.app.refresh();
    };
  }
  function listFor(el, pid) {
    const docs = S.data.documents.filter((d) => d.patientId === pid).sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('folder')}Documentos del paciente</h3><button class="btn btn-primary btn-sm" id="ld-up">${ui.icon('upload')}<span>Subir</span></button></div>${grid(docs, false)}</section>`;
    el.querySelector('#ld-up').onclick = () => upload(pid);
    wireGrid(el);
  }

  // ---------- Antes / después ----------
  function photosFor(el, pid) {
    const pairs = U.groupBy(S.data.documents.filter((d) => d.patientId === pid && d.pair), (d) => d.pair);
    el.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('image')}Fotografías antes / después</h3><button class="btn btn-primary btn-sm" id="ph-new">${ui.icon('plus')}<span>Nueva comparación</span></button></div>
      <p class="muted small">Ideal para ortodoncia, estética, blanqueamiento, carillas, rehabilitación e implantes. Desliza sobre la imagen para comparar.</p>
      ${Object.keys(pairs).length ? `<div class="grid-2">${Object.entries(pairs).map(([name, ds]) => { const b = ds.find((d) => d.side === 'antes'); const a = ds.find((d) => d.side === 'despues'); return `<div class="panel"><b>${esc(name)}</b>
        ${b && a ? `<div class="compare" data-cmp><img src="${b.dataUrl}" alt="Antes"><img class="after" src="${a.dataUrl}" alt="Después"><span class="tag" style="left:10px">ANTES</span><span class="tag" style="right:10px">DESPUÉS</span><span class="handle"></span><input type="range" min="0" max="100" value="50" aria-label="Comparar antes y después"></div>`
          : `<div class="row gap">${b ? `<img src="${b.dataUrl}" alt="Antes" style="width:48%;border-radius:8px">` : `<button class="btn btn-sm" data-add="${esc(name)}" data-side="antes">${ui.icon('upload')}<span>Subir ANTES</span></button>`}${a ? `<img src="${a.dataUrl}" alt="Después" style="width:48%;border-radius:8px">` : `<button class="btn btn-sm" data-add="${esc(name)}" data-side="despues">${ui.icon('upload')}<span>Subir DESPUÉS</span></button>`}</div>`}</div>`; }).join('')}</div>`
        : ui.empty('Sin comparaciones', 'Crea una comparación y sube la foto de antes; luego la de después.')}</section>`;
    el.querySelectorAll('[data-cmp]').forEach((c) => { const r = c.querySelector('input'); const after = c.querySelector('.after'); const h = c.querySelector('.handle'); r.oninput = () => { after.style.clipPath = `inset(0 0 0 ${r.value}%)`; h.style.left = `${r.value}%`; }; });
    el.querySelectorAll('[data-add]').forEach((b) => (b.onclick = () => upload(pid, { category: 'Fotografías', pair: b.dataset.add, side: b.dataset.side, note: `${b.dataset.add} (${b.dataset.side})` })));
    el.querySelector('#ph-new').onclick = () => compareForm(pid);
  }

  /** Nueva comparación: ambas fotos en una sola ventana, con vista previa. */
  function compareForm(pid) {
    const slot = (side, label) => `<label class="ba-slot" data-side="${side}"><span class="tag">${label}</span><input type="file" accept="image/*" name="f_${side}"><div class="ba-prev">${ui.icon('camera')}<b>Subir foto de ${label}</b><small>Hacé clic para elegir una imagen</small></div></label>`;
    const m = ui.modal({ title: 'Nueva comparación antes / después', subtitle: esc(D.patientName(pid)), size: 'lg',
      body: `<form id="pn" class="form-sections"><div class="form-grid">${ui.field('Tratamiento', ui.select('name', ['Ortodoncia', 'Estética dental', 'Blanqueamiento', 'Carillas', 'Rehabilitación', 'Implantes', 'Otro']))}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}</div>
        <div class="ba-drop">${slot('antes', 'ANTES')}${slot('despues', 'DESPUÉS')}</div><small class="hint">Podés subir solo la de ANTES hoy y agregar la de DESPUÉS cuando termine el tratamiento. Imágenes de hasta 8 MB.</small>
        <p class="form-error" id="pn-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar comparación', kind: 'primary', submit: true, form: 'pn', icon: 'check' }] });
    m.el.querySelectorAll('.ba-slot input').forEach((inp) => (inp.onchange = () => {
      const f = inp.files[0]; const prev = inp.parentElement.querySelector('.ba-prev'); if (!f) return;
      prev.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="Vista previa"><small>${esc(f.name)}</small>`; inp.parentElement.classList.add('has');
    }));
    m.el.querySelector('#pn').onsubmit = async (e) => {
      e.preventDefault(); const v = U.formData(e.target); const err = (t) => { const x = m.el.querySelector('#pn-err'); x.hidden = false; x.textContent = t; };
      const fa = m.el.querySelector('[name=f_antes]').files[0]; const fd = m.el.querySelector('[name=f_despues]').files[0];
      if (!fa && !fd) return err('Elegí al menos una foto (ANTES o DESPUÉS).');
      const big = [fa, fd].filter(Boolean).find((f) => f.size > MAX); if (big) return err(`${big.name} supera 8 MB.`);
      const name = `${v.name} · ${U.fmtDate(v.date || U.today())}`;
      for (const [side, f] of [['antes', fa], ['despues', fd]]) if (f) S.insert('documents', { patientId: pid, category: 'Fotografías', pair: name, side, date: v.date || U.today(), note: `${name} (${side})`, name: f.name, mime: f.type, size: f.size, dataUrl: await U.readFile(f) }, `Foto ${side} de ${name} (${D.patientName(pid)})`);
      m.markClean(); m.close(true); ui.toast('Comparación guardada.'); OS.app.refresh();
    };
  }

  // ---------- Recetas y consentimientos ----------
  const rxTable = (list, showPatient) => list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>N.º</th>${showPatient ? '<th>Paciente</th>' : ''}<th>Fecha</th><th>Medicamentos</th><th>Profesional</th><th></th></tr></thead><tbody>${list.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => `<tr><td class="mono">${r.number}</td>${showPatient ? `<td>${esc(D.patientName(r.patientId))}</td>` : ''}<td data-l="Fecha">${U.fmtDate(r.date)}</td><td>${esc(r.items.map((i) => i.drug).join(', '))}</td><td data-l="Profesional">${esc(D.profName(r.professionalId))}</td><td class="r"><button class="btn btn-sm btn-ghost" data-rx="${r.id}">${ui.icon('file')}<span>PDF</span></button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin recetas emitidas.</p>';
  const consentTable = (list, showPatient) => list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>N.º</th>${showPatient ? '<th>Paciente</th>' : ''}<th>Consentimiento</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>${list.slice().sort((a, b) => b.date.localeCompare(a.date)).map((c) => `<tr><td class="mono">${c.number}</td>${showPatient ? `<td>${esc(D.patientName(c.patientId))}</td>` : ''}<td>${esc(c.name)}</td><td data-l="Fecha">${U.fmtDate(c.date)}</td><td>${ui.badge(c.signed ? 'firmado' : 'sin_firmar')}</td><td class="r"><div class="row gap" style="justify-content:flex-end"><button class="btn btn-sm btn-ghost" data-cpdf="${c.id}">${ui.icon('file')}<span>PDF</span></button>${!c.signed ? `<label class="btn btn-sm">${ui.icon('upload')}<span>Subir firmado</span><input type="file" data-csign="${c.id}" accept="image/*,application/pdf" hidden></label>` : c.signedDocId ? `<button class="btn btn-sm btn-ghost" data-cview="${c.signedDocId}">${ui.icon('eye')}<span>Firmado</span></button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Sin consentimientos generados.</p>';
  function wireConsents(root) {
    root.querySelectorAll('[data-cpdf]').forEach((b) => (b.onclick = () => { const c = S.get('consents', b.dataset.cpdf); OS.pdf.present(OS.pdf.consentModel(c), { patientId: c.patientId, category: 'Consentimientos' }); }));
    root.querySelectorAll('[data-cview]').forEach((b) => (b.onclick = () => view(b.dataset.cview)));
    root.querySelectorAll('[data-csign]').forEach((inp) => (inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; if (f.size > MAX) return ui.toast('El archivo supera 8 MB.', 'warn');
      const c = S.get('consents', inp.dataset.csign);
      const doc = S.insert('documents', { patientId: c.patientId, category: 'Consentimientos', name: f.name, mime: f.type, size: f.size, dataUrl: await U.readFile(f), date: U.today(), note: `${c.name} firmado` });
      S.update('consents', c.id, { signed: true, signedDocId: doc.id }, `Consentimiento ${c.number} firmado`);
      ui.toast('Consentimiento firmado guardado.'); OS.app.refresh();
    }));
  }
  function rxFor(el, pid) {
    el.innerHTML = `<div class="grid-2"><section class="panel"><div class="panel-head"><h3>${ui.icon('rx')}Recetas</h3><button class="btn btn-sm btn-primary" id="rf-new">${ui.icon('plus')}<span>Nueva receta</span></button></div>${rxTable(S.data.prescriptions.filter((r) => r.patientId === pid))}</section>
      <section class="panel"><div class="panel-head"><h3>${ui.icon('shield')}Consentimientos</h3><button class="btn btn-sm btn-primary" id="cf-new">${ui.icon('plus')}<span>Generar</span></button></div>${consentTable(S.data.consents.filter((c) => c.patientId === pid))}</section></div>`;
    el.querySelector('#rf-new').onclick = () => rxForm(pid);
    el.querySelector('#cf-new').onclick = () => consentForm(pid);
    el.querySelectorAll('[data-rx]').forEach((b) => (b.onclick = () => OS.pdf.present(OS.pdf.prescriptionModel(S.get('prescriptions', b.dataset.rx)), { patientId: pid, category: 'Recetas' })));
    wireConsents(el);
  }

  function rxForm(pid) {
    const alerts = D.medicalAlerts(pid);
    const row = (i) => `<tr data-row><td><input name="drug" placeholder="Medicamento" value="${esc(i.drug || '')}"></td><td><input name="presentation" placeholder="Comprimidos 400 mg" value="${esc(i.presentation || '')}"></td><td><input name="dose" placeholder="1 comprimido" value="${esc(i.dose || '')}"></td><td><input name="frequency" placeholder="Cada 8 h" value="${esc(i.frequency || '')}"></td><td><input name="duration" placeholder="3 días" value="${esc(i.duration || '')}"></td></tr>`;
    const m = ui.modal({ title: 'Nueva receta', subtitle: esc(D.patientName(pid)), size: 'xl',
      body: `${alerts.length ? `<div class="med-alerts">${alerts.map((a) => `<span class="med-alert ${a.level}">${ui.icon('alert')}<b>${esc(a.type)}</b><span>${esc(a.text)}</span></span>`).join('')}</div>` : ''}
        <form id="rxf" class="form-sections"><div class="table-wrap items-table"><table class="tbl"><thead><tr><th>Medicamento</th><th>Presentación</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr></thead><tbody id="rx-rows">${row({})}</tbody></table></div>
        <button type="button" class="btn btn-sm btn-ghost" id="rx-add">${ui.icon('plus')}<span>Agregar medicamento</span></button>
        <div class="form-grid">${ui.field('Profesional', ui.select('professionalId', S.data.professionals.map((p) => [p.id, D.profName(p.id)]), OS.auth.current()?.professionalId))}${ui.field('Fecha', ui.input('date', U.today(), 'type="date"'))}${ui.field('Indicaciones', ui.textarea('indications', '', 'rows="3"'), { span: 2 })}</div><p class="form-error" id="rx-err" hidden></p></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Generar receta', kind: 'primary', submit: true, form: 'rxf', icon: 'file' }] });
    m.el.querySelector('#rx-add').onclick = () => m.el.querySelector('#rx-rows').insertAdjacentHTML('beforeend', row({}));
    m.el.querySelector('#rxf').onsubmit = (e) => {
      e.preventDefault();
      const items = [...m.el.querySelectorAll('[data-row]')].map((r) => Object.fromEntries([...r.querySelectorAll('input')].map((i) => [i.name, i.value.trim()]))).filter((i) => i.drug);
      if (!items.length) { const x = m.el.querySelector('#rx-err'); x.hidden = false; x.textContent = 'Agrega al menos un medicamento.'; return; }
      const f = e.target; const rx = S.insert('prescriptions', { number: `RX-${String(S.next('rx')).padStart(4, '0')}`, patientId: pid, professionalId: f.professionalId.value, date: f.date.value || U.today(), items, indications: f.indications.value.trim() }, `Receta para ${D.patientName(pid)}`);
      m.markClean(); m.close(true); OS.app.refresh(); OS.pdf.present(OS.pdf.prescriptionModel(rx), { patientId: pid, category: 'Recetas' });
    };
  }

  function consentForm(pid) {
    const tpls = S.data.consentTemplates;
    const m = ui.modal({ title: 'Generar consentimiento', subtitle: esc(D.patientName(pid)), size: 'lg',
      body: `<form id="csf" class="form-sections">${ui.field('Plantilla', ui.select('templateId', tpls.map((t) => [t.id, t.name])))}${ui.field('Texto (puedes ajustarlo para este paciente)', ui.textarea('body', '', 'rows="10"'))}</form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Generar PDF', kind: 'primary', submit: true, form: 'csf', icon: 'file' }] });
    const f = m.el.querySelector('#csf');
    const fill = () => { const t = S.get('consentTemplates', f.templateId.value); f.body.value = U.fillTemplate(t.body, { 'Nombre completo': D.patientName(pid), Nombre: D.firstName(pid), Consultorio: S.data.clinic.name }); };
    f.templateId.onchange = fill; fill(); m.markClean();
    f.onsubmit = (e) => {
      e.preventDefault(); const t = S.get('consentTemplates', f.templateId.value);
      const c = S.insert('consents', { number: `C-${String(S.next('consent')).padStart(4, '0')}`, patientId: pid, templateId: t.id, name: t.name, date: U.today(), body: f.body.value, signed: false }, `Consentimiento ${t.name} para ${D.patientName(pid)}`);
      m.markClean(); m.close(true); OS.app.refresh(); OS.pdf.present(OS.pdf.consentModel(c), { patientId: pid, category: 'Consentimientos' });
    };
  }

  function templateForm(t) {
    const m = ui.modal({ title: t ? 'Editar plantilla' : 'Nueva plantilla', size: 'lg',
      body: `<form id="tpf" class="form-sections">${ui.field('Nombre', ui.input('name', t?.name, 'required'))}${ui.field('Texto', ui.textarea('body', t?.body, 'rows="12" required'), { hint: 'Variables: [Nombre completo], [Nombre], [Consultorio].' })}</form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar plantilla', kind: 'primary', submit: true, form: 'tpf' }] });
    if (!OS.auth.can('config')) m.el.querySelectorAll('input,textarea').forEach((x) => (x.readOnly = true));
    m.el.querySelector('#tpf').onsubmit = (e) => { e.preventDefault(); if (!OS.auth.can('config')) return m.close(true); const d = U.formData(e.target); if (!d.name || !d.body) return; if (t) S.update('consentTemplates', t.id, d, `Plantilla ${d.name}`); else S.insert('consentTemplates', d, `Plantilla ${d.name}`); m.markClean(); m.close(true); ui.toast('Plantilla guardada.'); OS.app.refresh(); };
  }

  return { render, listFor, photosFor, rxFor, view, upload, perm: 'documentos' };
})();
