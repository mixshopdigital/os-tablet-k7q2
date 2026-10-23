/* ODONTO SMART — documentos PDF profesionales.
   Un mismo "modelo de documento" se dibuja dos veces: como vista previa HTML
   y como PDF real con jsPDF (incluido en /vendor, funciona sin Internet).
   Tipos: presupuesto, recibo, receta, consentimiento, historia clínica, reportes. */
OS.pdf = (() => {
  const U = OS.util; const { esc } = U;
  const BRAND = [11, 79, 94]; const TEAL = [14, 124, 134]; const INK = [22, 40, 48]; const MUTED = [96, 118, 128]; const LINE = [214, 226, 231];
  const WINANSI = '–—‘’“”•…€™';
  const clean = (s) => String(s ?? '').replace(/[^\u0000-ÿ]/g, (ch) => (WINANSI.includes(ch) ? ch : '')).replace(/\s{2,}/g, ' ');

  function clinicLines() {
    const c = OS.store.data.clinic;
    return {
      name: c.name || 'Consultorio odontológico',
      lines: [
        [c.doctorName, c.registry && `Reg. Prof. ${c.registry}`].filter(Boolean).join(' · '),
        [c.address, c.city].filter(Boolean).join(', '),
        [c.phone && `Tel. ${c.phone}`, c.whatsapp && `WhatsApp ${U.prettyPhone(c.whatsapp)}`].filter(Boolean).join(' · '),
        [c.email, c.ruc && `RUC ${c.ruc}`].filter(Boolean).join(' · '),
        c.social,
      ].filter(Boolean),
      logo: c.logoPng || (c.logo && !c.logo.startsWith('data:image/svg') ? c.logo : null),
    };
  }

  // ---------- Vista previa HTML ----------
  function html(model) {
    const c = clinicLines();
    const block = (b) => {
      if (b.type === 'table') return `<table class="p-table"><thead><tr>${b.head.map((h, i) => `<th class="${b.align?.[i] === 'right' ? 'r' : ''}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((v, i) => `<td class="${b.align?.[i] === 'right' ? 'r' : ''}">${esc(v)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${b.head.length}" class="muted">Sin elementos</td></tr>`}</tbody></table>`;
      if (b.type === 'totals') return `<div class="p-totals">${b.rows.map(([k, v, strong]) => `<div class="${strong ? 'strong' : ''}"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}</div>`;
      if (b.type === 'kv') return `<dl class="p-kv">${b.rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v || '—')}</dd></div>`).join('')}</dl>`;
      if (b.type === 'text') return `<div class="p-text">${b.title ? `<h4>${esc(b.title)}</h4>` : ''}<p>${esc(b.text || '—').replace(/\n/g, '<br>')}</p></div>`;
      if (b.type === 'signature') return `<div class="p-sign">${(b.labels || [b.label]).map((l) => `<div>${l === 'Profesional' && OS.store.data.clinic.signature ? `<img src="${OS.store.data.clinic.signature}" alt="Firma">` : ''}<span>${esc(l)}</span></div>`).join('')}</div>`;
      return '';
    };
    return `<article class="paper">
      <header class="p-head"><div class="p-clinic">${c.logo ? `<img src="${c.logo}" alt="Logo">` : `<span class="p-logo-ph">${OS.ui.logoMark(40)}</span>`}<div><strong>${esc(c.name)}</strong>${c.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div></div>
        <div class="p-doc"><b>${esc(model.title)}</b>${model.number ? `<span>N.º ${esc(model.number)}</span>` : ''}<span>${esc(U.fmtDate(model.date))}</span></div></header>
      ${model.patient ? `<section class="p-patient"><div><small>Paciente</small><b>${esc(model.patient.name)}</b></div>${model.patient.ci ? `<div><small>Cédula</small><span>${esc(model.patient.ci)}</span></div>` : ''}${model.patient.phone ? `<div><small>Teléfono</small><span>${esc(model.patient.phone)}</span></div>` : ''}${model.patient.extra ? `<div><small>${esc(model.patient.extra[0])}</small><span>${esc(model.patient.extra[1])}</span></div>` : ''}</section>` : ''}
      ${model.blocks.map(block).join('')}
      ${model.footer ? `<p class="p-foot">${esc(model.footer)}</p>` : ''}
      ${OS.license?.holder() ? `<p class="p-foot" style="font-size:.72em;border:0;padding:0">Generado con ODONTO SMART · ${esc(OS.license.holder())}</p>` : ''}
    </article>`;
  }

  // ---------- PDF ----------
  function build(model) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210; const M = 16; let y = M;
    const c = clinicLines();
    doc.setProperties({ title: clean(`${model.title} ${model.number || ''}`), creator: 'ODONTO SMART' });

    // Encabezado
    let tx = M;
    if (c.logo) {
      try { const p = doc.getImageProperties(c.logo); const h = 18; const w = Math.min(34, (p.width / p.height) * h); doc.addImage(c.logo, M, y, w, (w / ((p.width / p.height) * h)) * h); tx = M + w + 5; } catch { /* logo ilegible: se omite */ }
    }
    doc.setTextColor(...BRAND); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(clean(c.name), tx, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...MUTED);
    c.lines.slice(0, 4).forEach((l, i) => doc.text(clean(l), tx, y + 10 + i * 3.8, { maxWidth: 108 }));
    doc.setTextColor(...TEAL); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(clean(model.title), W - M, y + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...INK);
    if (model.number) doc.text(clean(`N.º ${model.number}`), W - M, y + 10.5, { align: 'right' });
    doc.text(U.fmtDate(model.date), W - M, y + 15, { align: 'right' });
    y += 28;
    doc.setDrawColor(...TEAL); doc.setLineWidth(0.6); doc.line(M, y, W - M, y); y += 6;

    // Paciente
    if (model.patient) {
      const cells = [['PACIENTE', model.patient.name], model.patient.ci && ['CÉDULA', model.patient.ci], model.patient.phone && ['TELÉFONO', model.patient.phone], model.patient.extra].filter(Boolean);
      doc.setFillColor(242, 247, 248); doc.roundedRect(M, y, W - 2 * M, 14, 2, 2, 'F');
      const cw = (W - 2 * M) / cells.length;
      cells.forEach(([k, v], i) => { doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text(clean(k), M + 4 + i * cw, y + 5); doc.setFontSize(9.5); doc.setTextColor(...INK); doc.setFont('helvetica', i === 0 ? 'bold' : 'normal'); doc.text(clean(v), M + 4 + i * cw, y + 10.5, { maxWidth: cw - 6 }); doc.setFont('helvetica', 'normal'); });
      y += 20;
    }

    const ensure = (h) => { if (y + h > 297 - 22) { doc.addPage(); y = M; } };
    model.blocks.forEach((b) => {
      if (b.type === 'table') {
        doc.autoTable({
          startY: y, margin: { left: M, right: M }, head: [b.head.map(clean)], body: b.rows.map((r) => r.map(clean)),
          styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2.4, lineColor: LINE, lineWidth: 0.1 },
          headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
          alternateRowStyles: { fillColor: [247, 250, 251] },
          columnStyles: Object.fromEntries((b.align || []).map((a, i) => [i, { halign: a || 'left' }])),
          didParseCell: (c) => { if (c.section === 'head' && b.align?.[c.column.index]) c.cell.styles.halign = b.align[c.column.index]; },
        });
        y = doc.lastAutoTable.finalY + 5;
      } else if (b.type === 'totals') {
        ensure(b.rows.length * 6 + 4);
        b.rows.forEach(([k, v, strong]) => {
          if (strong) { doc.setFillColor(...TEAL); doc.roundedRect(W - M - 80, y - 4.2, 80, 7.5, 1.5, 1.5, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); }
          else { doc.setTextColor(...INK); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); }
          doc.text(clean(k), W - M - 76, y); doc.text(clean(v), W - M - 3, y, { align: 'right' }); y += strong ? 9 : 6;
        });
        doc.setFont('helvetica', 'normal'); y += 2;
      } else if (b.type === 'kv') {
        b.rows.forEach(([k, v]) => {
          const lines = doc.splitTextToSize(clean(v || '—'), W - 2 * M - 52);
          ensure(lines.length * 4.4 + 2);
          doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(clean(k), M, y);
          doc.setTextColor(...INK); doc.setFontSize(9.5); doc.text(lines, M + 52, y); y += lines.length * 4.4 + 2;
        });
        y += 2;
      } else if (b.type === 'text') {
        if (b.title) { ensure(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...BRAND); doc.text(clean(b.title), M, y); y += 5; }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
        doc.splitTextToSize(clean(b.text || '—'), W - 2 * M).forEach((ln) => { ensure(5); doc.text(ln, M, y); y += 4.6; });
        y += 3;
      } else if (b.type === 'signature') {
        ensure(34); y += 18;
        const labels = b.labels || [b.label]; const cw = (W - 2 * M) / labels.length;
        labels.forEach((l, i) => {
          const x = M + i * cw + 8; const w = cw - 16;
          if (l === 'Profesional' && OS.store.data.clinic.signature) { try { doc.addImage(OS.store.data.clinic.signature, x + w / 2 - 20, y - 17, 40, 15); } catch { /* firma ilegible */ } }
          doc.setDrawColor(...MUTED); doc.setLineWidth(0.3); doc.line(x, y, x + w, y);
          doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(clean(l), x + w / 2, y + 4.5, { align: 'center' });
        });
        y += 12;
      }
    });
    if (model.footer) { ensure(12); doc.setFontSize(8.2); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(clean(model.footer), W - 2 * M), M, y + 2); }

    // Pie y numeración
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, 297 - 14, W - M, 297 - 14);
      doc.setFontSize(7.5); doc.setTextColor(...MUTED);
      doc.text(clean(`${c.name}${model.number ? ` · ${model.title} N.º ${model.number}` : ''}`), M, 297 - 9.5);
      doc.text(`Página ${i} de ${n}`, W - M, 297 - 9.5, { align: 'right' });
      const lh = OS.license?.holder(); if (lh) { doc.setFontSize(6.5); doc.text(clean(`Generado con ODONTO SMART · ${lh}`), M, 297 - 5.5); }
    }
    return doc;
  }
  const blob = (model) => build(model).output('blob');
  const dataUrl = (model) => build(model).output('datauristring');
  const fileName = (model) => `${model.title.replace(/\s+/g, '_')}${model.number ? '_' + model.number : ''}_${(model.patient?.name || '').replace(/\s+/g, '_')}.pdf`.replace(/_+/g, '_');

  /**
   * Muestra "Documento listo": vista previa + acciones reales.
   * opts: { patientId, waKey, category, onSaved }
   */
  function present(model, opts = {}) {
    const actions = [{ label: 'Descargar PDF', kind: 'primary', id: 'pdf-dl', icon: 'download' }];
    if (opts.patientId) actions.unshift({ label: 'Guardar en la ficha', kind: 'ghost', id: 'pdf-save', icon: 'folder' });
    if (OS.files.canOpenWindow) actions.unshift({ label: 'Abrir / imprimir', kind: 'ghost', id: 'pdf-open', icon: 'print' });
    const m = OS.ui.modal({
      title: `${model.title.charAt(0) + model.title.slice(1).toLowerCase()} listo`, subtitle: model.number ? `N.º ${esc(model.number)} · ${esc(model.patient?.name || '')}` : esc(model.patient?.name || ''), size: 'lg', guard: false,
      body: `<div class="paper-wrap">${html(model)}</div>${opts.patientId && opts.waKey ? `<div class="wa-strip">${OS.ui.icon('whatsapp')}<div><b>Enviar por WhatsApp</b><span>Primero descarga el PDF; WhatsApp se abrirá con el mensaje listo y adjuntas el archivo con el clip.</span></div>${OS.wa.button(opts.patientId, { key: opts.waKey, label: 'Abrir WhatsApp' })}</div>` : ''}`,
      actions,
    });
    const $ = (s) => m.el.querySelector(s);
    $('#pdf-dl').onclick = () => OS.files.save(fileName(model), blob(model), 'application/pdf');
    $('#pdf-open')?.addEventListener('click', () => OS.files.openBlob(blob(model)));
    $('#pdf-save')?.addEventListener('click', (e) => {
      const d = dataUrl(model);
      OS.store.insert('documents', { patientId: opts.patientId, category: opts.category || 'PDF', name: fileName(model), mime: 'application/pdf', dataUrl: d, size: Math.round(d.length * 0.75), date: U.today(), note: `${model.title} generado` }, `${model.title} guardado en ficha de ${model.patient?.name}`);
      OS.ui.toast('PDF guardado en los documentos del paciente.');
      e.currentTarget.disabled = true; opts.onSaved?.();
    });
    return m;
  }

  // ---------- Modelos de cada documento ----------
  const patientBlock = (p, extra) => ({ name: OS.domain.fullName(p), ci: p.ci, phone: U.prettyPhone(p.whatsapp || p.phone), extra });

  function quoteModel(q) {
    const D = OS.domain; const p = D.patient(q.patientId); const t = D.quoteTotals(q); const c = OS.store.data.clinic;
    const blocks = [
      { type: 'table', head: ['Pieza', 'Tratamiento', 'Cant.', 'Precio unit.', 'Importe'], align: ['center', 'left', 'center', 'right', 'right'], rows: q.items.map((i) => [i.tooth || '—', i.name, String(i.qty || 1), U.money(i.price), U.money((i.qty || 1) * i.price)]) },
      { type: 'totals', rows: [['Subtotal', U.money(t.subtotal)], ...(t.discount ? [['Descuento', '- ' + U.money(t.discount)]] : []), ['TOTAL', U.money(t.total), true]] },
    ];
    const sch = D.schedule(q);
    if (sch.length) blocks.push({ type: 'table', head: ['Cuota', 'Vencimiento', 'Monto'], align: ['center', 'center', 'right'], rows: sch.map((s) => [`${s.no} de ${sch.length}`, U.fmtDate(s.due), U.money(s.amount)]) });
    blocks.push({ type: 'kv', rows: [['Forma de pago', q.paymentTerms || c.paymentTerms], ['Validez', `${q.validDays || c.quoteValidityDays} días desde la emisión (hasta ${U.fmtDate(U.addDays(q.date, Number(q.validDays || c.quoteValidityDays)))})`], ['Profesional', D.profName(q.professionalId)]] });
    if (q.notes) blocks.push({ type: 'text', title: 'Observaciones', text: q.notes });
    blocks.push({ type: 'signature', labels: ['Profesional', 'Conformidad del paciente'] });
    return { title: 'PRESUPUESTO', number: q.number, date: q.date, patient: patientBlock(p), blocks, footer: c.quoteNotes };
  }

  function receiptModel(pay) {
    const D = OS.domain; const p = D.patient(pay.patientId); const b = D.balance(pay.patientId); const q = pay.quoteId && OS.store.get('quotes', pay.quoteId);
    return {
      title: 'RECIBO', number: pay.receiptNo, date: pay.date, patient: patientBlock(p),
      blocks: [
        { type: 'table', head: ['Concepto', 'Método', 'Importe'], align: ['left', 'center', 'right'], rows: [[`${pay.note || 'Pago de tratamiento odontológico'}${q ? ` · Presupuesto N.º ${q.number}` : ''}${pay.installmentNo ? ` · Cuota ${pay.installmentNo}` : ''}`, pay.method, U.money(pay.amount)]] },
        { type: 'totals', rows: [['Total tratamientos', U.money(b.charged)], ['Total pagado a la fecha', U.money(b.paid)], ['SALDO PENDIENTE', U.money(Math.max(0, b.balance)), true]] },
        { type: 'signature', labels: ['Recibí conforme'] },
      ],
      footer: 'Este recibo es un comprobante interno del consultorio y no reemplaza a la factura legal.',
    };
  }

  function prescriptionModel(rx) {
    const D = OS.domain; const p = D.patient(rx.patientId); const prof = D.professional(rx.professionalId);
    return {
      title: 'RECETA', number: rx.number, date: rx.date, patient: patientBlock(p, p.birthDate ? ['Edad', `${U.age(p.birthDate)} años`] : null),
      blocks: [
        { type: 'table', head: ['Medicamento', 'Presentación', 'Dosis', 'Frecuencia', 'Duración'], rows: rx.items.map((i) => [i.drug, i.presentation, i.dose, i.frequency, i.duration]) },
        ...(rx.indications ? [{ type: 'text', title: 'Indicaciones', text: rx.indications }] : []),
        { type: 'signature', labels: ['Profesional'] },
      ],
      footer: prof ? `${prof.title || ''} ${prof.name} · ${prof.specialty || 'Odontología'}${prof.registry ? ` · Reg. Prof. ${prof.registry}` : ''}` : '',
    };
  }

  function consentModel(cs) {
    const p = OS.domain.patient(cs.patientId);
    return { title: 'CONSENTIMIENTO', number: cs.number, date: cs.date, patient: patientBlock(p), blocks: [{ type: 'text', title: cs.name, text: cs.body }, { type: 'signature', labels: ['Firma del paciente o responsable', 'Profesional'] }], footer: 'Documento informativo. Revise su contenido con la normativa vigente aplicable a su práctica.' };
  }

  function historyModel(pid) {
    const D = OS.domain; const p = D.patient(pid); const m = OS.store.data.medical[pid] || {};
    const yn = (v) => (v ? 'Sí' : 'No');
    const notes = OS.store.data.clinicalNotes.filter((n) => n.patientId === pid).sort((a, b) => b.date.localeCompare(a.date));
    const teeth = [...D.UPPER, ...D.LOWER].map((t) => ({ t, s: D.toothState(pid, t) })).filter((x) => x.s.whole || Object.keys(x.s.surfaces).length);
    return {
      title: 'HISTORIA CLÍNICA', date: U.today(), patient: patientBlock(p, p.birthDate ? ['Edad', `${U.age(p.birthDate)} años`] : null),
      blocks: [
        { type: 'kv', rows: [['Alergias', m.allergies], ['Medicamentos', m.medications], ['Enfermedades', m.diseases], ['Antecedentes', m.background], ['Cirugías', m.surgeries], ['Diabetes / Hipertensión', `${yn(m.diabetes)} / ${yn(m.hypertension)}`], ['Cardiopatías / Coagulación', `${yn(m.cardio)} / ${yn(m.coagulation)}`], ['Embarazo', yn(m.pregnant)], ['Observaciones', m.other]] },
        { type: 'table', head: ['Pieza', 'Estado actual'], rows: teeth.map(({ t, s }) => [String(t), [s.whole && D.STATES[s.whole].label, ...Object.entries(s.surfaces).map(([k, v]) => `${D.STATES[v].label} (${k})`)].filter(Boolean).join(', ')]) },
        { type: 'table', head: ['Fecha', 'Profesional', 'Motivo', 'Procedimiento', 'Indicaciones'], rows: notes.map((n) => [U.fmtDate(n.date), D.profName(n.professionalId), n.reason, [n.diagnosis, n.procedure].filter(Boolean).join(' — '), n.indications || '']) },
      ],
      footer: 'Documento confidencial. Contiene información clínica protegida.',
    };
  }

  function reportModel(title, period, blocks) { return { title: 'REPORTE', number: '', date: U.today(), patient: { name: title, extra: ['Período', period] }, blocks }; }

  return { html, build, blob, dataUrl, fileName, present, quoteModel, receiptModel, prescriptionModel, consentModel, historyModel, reportModel };
})();
