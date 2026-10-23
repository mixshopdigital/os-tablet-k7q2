/* ODONTO SMART — Facturación electrónica (DNIT / SIFEN), etapa 1.
   Cada consultorio carga SUS datos fiscales y prepara facturas desde los cobros. El sistema calcula IVA,
   numera y exporta el documento con la estructura de datos de SIFEN para emitirlo en e-Kuatia'i o en
   el facturador del contribuyente. Un borrador NO tiene validez tributaria hasta ser emitido y aprobado por la DNIT. */
OS.views.invoicing = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const fiscal = () => (S.data.clinic.fiscal = S.data.clinic.fiscal || { env: 'test', est: '001', punto: '001', next: 1, contrib: 'fisica', ivaDefault: 10 });
  const fmtNum = (f, n) => `${f.est || '001'}-${f.punto || '001'}-${String(n).padStart(7, '0')}`;
  const ST = { borrador: ['Borrador', 'warn'], emitida: ['Emitida', 'ok'], anulada: ['Anulada', 'danger'] };

  /** IVA incluido en el precio (práctica habitual en Paraguay). */
  function totals(items) {
    const sum = (r) => U.sum(items.filter((i) => Number(i.iva) === r), (i) => i.qty * i.price);
    const g10 = sum(10); const g5 = sum(5); const ex = sum(0);
    return { g10, g5, ex, iva10: Math.round(g10 / 11), iva5: Math.round(g5 / 21), total: g10 + g5 + ex };
  }
  const missing = () => { const f = fiscal(); return ['ruc', 'razon', 'timbrado'].filter((k) => !f[k]); };

  function render(el, params) {
    S.data.invoices = S.data.invoices || [];
    const tab = params.tab || (missing().length ? 'datos' : 'facturas');
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Facturación electrónica</span><h1>Facturación DNIT</h1><p>Preparé tus facturas desde los cobros, con IVA calculado y numeración, listas para emitir en e-Kuatia'i o con tu facturador.</p></div></div>
      <nav class="tabs" id="iv-tabs">${[['facturas', 'Facturas', 'quote'], ['datos', 'Mis datos fiscales', 'settings'], ['guia', 'Cómo habilitarte', 'help']].map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'active' : ''}">${ui.icon(i)}${l}</button>`).join('')}</nav><div id="iv-body"></div>`;
    ui.tabs(el.querySelector('#iv-tabs'), (k) => OS.app.refresh({ tab: k }));
    const b = el.querySelector('#iv-body');
    (tab === 'datos' ? datos : tab === 'guia' ? guia : facturas)(b);
  }

  const NOTE = `<p class="note note-warn">${ui.icon('alert')}<span>Un borrador creado acá <b>no tiene validez tributaria</b>. Para que sea factura legal debe emitirse y ser aprobada por la DNIT (SIFEN), con tu timbrado y firma digital. Esta pantalla te lo deja listo y ordenado.</span></p>`;

  function datos(b) {
    const f = fiscal();
    b.innerHTML = `${NOTE}<form class="panel" id="fz"><div class="panel-head"><h3>${ui.icon('settings')}Datos del contribuyente emisor</h3></div><div class="form-grid">
      ${ui.field('RUC (sin dígito verificador)', ui.input('ruc', f.ruc || '', 'inputmode="numeric"'), { req: true })}${ui.field('Dígito verificador', ui.input('dv', f.dv || '', 'maxlength="1"'))}
      ${ui.field('Razón social / nombre', ui.input('razon', f.razon || S.data.clinic.doctorName || '', ''), { span: 2, req: true })}
      ${ui.field('Nombre de fantasía', ui.input('fantasia', f.fantasia || S.data.clinic.name || ''), { span: 2 })}
      ${ui.field('Actividad económica', ui.input('actividad', f.actividad || 'Servicios odontológicos'))}${ui.field('Tipo de contribuyente', ui.select('contrib', [['fisica', 'Persona física'], ['juridica', 'Persona jurídica']], f.contrib))}
      ${ui.field('Nº de timbrado electrónico', ui.input('timbrado', f.timbrado || '', 'inputmode="numeric"'), { req: true, hint: 'Lo entrega la DNIT al habilitarte como facturador electrónico.' })}${ui.field('Vigencia desde', ui.input('desde', f.desde || '', 'type="date"'))}
      ${ui.field('Establecimiento', ui.input('est', f.est || '001', 'maxlength="3"'))}${ui.field('Punto de expedición', ui.input('punto', f.punto || '001', 'maxlength="3"'))}
      ${ui.field('Próximo número de factura', ui.input('next', f.next || 1, 'type="number" min="1"'))}${ui.field('IVA habitual de tus servicios', ui.select('ivaDefault', [['10', 'IVA 10%'], ['5', 'IVA 5%'], ['0', 'Exento']], String(f.ivaDefault ?? 10)))}
      ${ui.field('Dirección del establecimiento', ui.input('dir', f.dir || S.data.clinic.address || ''), { span: 2 })}
      ${ui.field('Ambiente', ui.select('env', [['test', 'Pruebas (sin valor legal)'], ['prod', 'Producción']], f.env))}${ui.field('Identificador CSC (opcional)', ui.input('cscId', f.cscId || '', 'maxlength="4"'), { hint: 'Código de seguridad del contribuyente, para el QR del KuDE.' })}
      </div><div class="row"><button class="btn btn-primary right" type="submit">${ui.icon('check')}<span>Guardar datos fiscales</span></button></div></form>`;
    b.querySelector('#fz').onsubmit = (e) => { e.preventDefault(); Object.assign(fiscal(), U.formData(e.target), { ivaDefault: Number(e.target.ivaDefault.value), next: Number(e.target.next.value) || 1 }); S.log('Facturación', 'clinic', '', 'Datos fiscales actualizados'); S.persist(); ui.toast('Datos fiscales guardados.'); };
  }

  function guia(b) {
    b.innerHTML = `<section class="panel"><div class="panel-head"><h3>${ui.icon('help')}Para facturar electrónicamente necesitás (cada profesional, con sus propios datos)</h3></div>
      <ol class="list-plain"><li><b>1.</b> RUC activo y clave de acceso a <b>Marangatu</b>.</li><li><b>2.</b> Solicitar la <b>habilitación como facturador electrónico</b> en Marangatu (la DNIT te asigna el timbrado electrónico).</li><li><b>3.</b> Certificado de firma digital (.p12) de un prestador acreditado, a nombre del RUC (solo si usás un sistema propio).</li><li><b>4.</b> Obtener tu <b>CSC</b> (código de seguridad) para el código QR del KuDE.</li><li><b>5.</b> Pasar por el ambiente de pruebas de SIFEN (sin valor legal) antes de pasar a producción.</li></ol>
      <p class="muted">Alternativa gratuita para pequeños contribuyentes: la herramienta <b>e-Kuatia'i</b> de la DNIT (1 establecimiento y 1 punto de expedición). Odonto Smart te prepara cada factura con IVA y numeración para cargarla allí o en tu facturador.</p>
      <p class="muted">Conexión directa con SIFEN desde Odonto Smart: requiere tu certificado digital y tu habilitación; se hace con un módulo aparte y cada profesional usa sus propias credenciales, que nunca salen de su equipo.</p></section>`;
  }

  function facturas(b) {
    const list = [...S.data.invoices].sort((a, c) => (c.createdAt || 0) - (a.createdAt || 0));
    b.innerHTML = `${missing().length ? `<p class="note note-warn">${ui.icon('alert')}<span>Completá tus <button class="link" id="iv-go">datos fiscales</button> (RUC, razón social y timbrado) antes de emitir.</span></p>` : ''}${NOTE}
      <div class="row gap wrap" style="margin-bottom:12px"><button class="btn btn-primary" id="iv-new">${ui.icon('plus')}<span>Nueva factura</span></button></div>
      ${list.length ? `<div class="table-wrap"><table class="tbl cards"><thead><tr><th>Fecha</th><th>Número</th><th>Cliente</th><th class="r">Total</th><th>Estado</th><th></th></tr></thead><tbody>${list.map((i) => `<tr><td>${U.fmtDate(i.date)}</td><td class="mono">${esc(i.number || '—')}</td><td>${esc(i.rcvName)}<small class="muted"> ${esc(i.rcvDoc || '')}</small></td><td class="r">${U.money(totals(i.items).total)}</td><td><span class="badge badge-${ST[i.status][1]}">${ST[i.status][0]}</span></td><td class="r"><button class="btn btn-sm" data-open="${i.id}">Ver</button></td></tr>`).join('')}</tbody></table></div>` : ui.empty('Todavía no hay facturas', 'Creá la primera desde un cobro registrado.')}`;
    b.querySelector('#iv-go')?.addEventListener('click', () => OS.app.refresh({ tab: 'datos' }));
    b.querySelector('#iv-new').onclick = nueva;
    b.querySelectorAll('[data-open]').forEach((x) => (x.onclick = () => ver(x.dataset.open)));
  }

  async function nueva() {
    const pid = await OS.app.pickPatient('Facturar a…'); if (!pid) return; const p = D.patient(pid); const f = fiscal();
    const pays = S.data.payments.filter((x) => x.patientId === pid && !x.invoiceId).sort((a, c) => c.date.localeCompare(a.date));
    const m = ui.modal({ title: 'Nueva factura', subtitle: esc(D.fullName(p)), size: 'lg', guard: false, body: `<form id="nf" class="form-grid">
      ${ui.field('Nombre o razón social', ui.input('name', D.fullName(p), 'required'), { span: 2 })}${ui.field('RUC o C.I.', ui.input('doc', p.ruc || p.ci || ''))}${ui.field('Condición', ui.select('cond', [['contado', 'Contado'], ['credito', 'Crédito']], 'contado'))}
      <div class="field span-2"><span class="lbl">Cobros a facturar</span>${pays.length ? pays.map((x) => `<label class="check"><input type="checkbox" name="pay" value="${x.id}" checked> ${U.fmtDate(x.date)} · ${esc(x.note || x.method)} · <b>${U.money(x.amount)}</b></label>`).join('') : '<small class="muted">No hay cobros sin facturar. Agregá un concepto manual.</small>'}</div>
      ${ui.field('Concepto adicional (opcional)', ui.input('xdesc', ''), { span: 2 })}${ui.field('Monto adicional', ui.input('xamt', '', 'inputmode="numeric"'))}${ui.field('IVA', ui.select('iva', [['10', 'IVA 10%'], ['5', 'IVA 5%'], ['0', 'Exento']], String(f.ivaDefault ?? 10)))}</form>`, actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Crear borrador', kind: 'primary', id: 'nf-ok' }] });
    m.el.querySelector('#nf-ok').onclick = () => {
      const fm = m.el.querySelector('#nf'); const d = U.formData(fm); const iva = Number(d.iva);
      const ids = [...fm.querySelectorAll('[name=pay]:checked')].map((x) => x.value);
      const items = ids.map((id) => { const x = S.get('payments', id); return { desc: x.note || `Servicios odontológicos (recibo ${x.receiptNo})`, qty: 1, price: x.amount, iva, payId: id }; });
      const xa = U.parseMoney(d.xamt); if (xa > 0) items.push({ desc: d.xdesc || 'Servicios odontológicos', qty: 1, price: xa, iva });
      if (!items.length) return ui.toast('Elegí un cobro o ingresá un monto.', 'warn');
      const inv = S.insert('invoices', { patientId: pid, date: U.today(), rcvName: d.name, rcvDoc: d.doc, cond: d.cond, items, status: 'borrador', number: '', cdc: '' }, 'Borrador de factura');
      ids.forEach((id) => S.update('payments', id, { invoiceId: inv.id })); m.close(true); OS.app.refresh({ tab: 'facturas' }); setTimeout(() => ver(inv.id), 200);
    };
  }

  /** Estructura de datos alineada a los campos principales del DE de SIFEN (para facturador / importación). */
  function toJSON(i) {
    const f = fiscal(); const t = totals(i.items);
    return { tipoDocumento: 1, descripcion: 'Factura electrónica', ambiente: f.env, timbrado: f.timbrado, numero: i.number, fecha: i.date, condicion: i.cond,
      emisor: { ruc: `${f.ruc}-${f.dv || ''}`, razonSocial: f.razon, nombreFantasia: f.fantasia, actividad: f.actividad, direccion: f.dir, establecimiento: f.est, puntoExpedicion: f.punto },
      receptor: { nombre: i.rcvName, documento: i.rcvDoc }, items: i.items.map((x) => ({ descripcion: x.desc, cantidad: x.qty, precioUnitario: x.price, tasaIVA: x.iva })),
      totales: { gravada10: t.g10, gravada5: t.g5, exenta: t.ex, iva10: t.iva10, iva5: t.iva5, total: t.total, moneda: 'PYG' }, cdc: i.cdc || null };
  }

  function ver(id) {
    const i = S.get('invoices', id); if (!i) return; const f = fiscal(); const t = totals(i.items); const draft = i.status === 'borrador';
    const m = ui.modal({ title: `Factura ${i.number || '(borrador)'}`, subtitle: `${esc(i.rcvName)} · ${ST[i.status][0]}`, size: 'lg', guard: false, body: `
      <table class="tbl"><thead><tr><th>Descripción</th><th class="r">Cant.</th><th class="r">Precio</th><th>IVA</th><th class="r">Subtotal</th></tr></thead><tbody>${i.items.map((x) => `<tr><td>${esc(x.desc)}</td><td class="r">${x.qty}</td><td class="r">${U.money(x.price)}</td><td>${x.iva ? x.iva + '%' : 'Exento'}</td><td class="r">${U.money(x.qty * x.price)}</td></tr>`).join('')}</tbody></table>
      <p class="small muted" style="margin-top:8px">Gravado 10%: ${U.money(t.g10)} · Gravado 5%: ${U.money(t.g5)} · Exento: ${U.money(t.ex)} · IVA 10%: ${U.money(t.iva10)} · IVA 5%: ${U.money(t.iva5)}</p><h3 class="r">Total ${U.money(t.total)}</h3>
      ${draft ? `<div class="form-grid"><label class="field"><span class="lbl">Número emitido (DNIT)</span><input id="iv-n" value="${esc(i.number || fmtNum(f, f.next || 1))}"></label><label class="field"><span class="lbl">CDC (44 dígitos, opcional)</span><input id="iv-c" value="${esc(i.cdc || '')}" inputmode="numeric" maxlength="44"></label></div><p class="note note-info">${ui.icon('alert')}<span>Emití esta factura en e-Kuatia'i o en tu facturador; luego marcala como emitida con el número y CDC que te dio la DNIT.</span></p>` : `<p class="small">CDC: <span class="mono">${esc(i.cdc || '—')}</span></p>`}`,
      actions: [{ label: 'Cerrar', kind: 'ghost', close: true }, { label: 'Exportar datos (JSON)', id: 'iv-json' }, { label: 'Exportar Excel', id: 'iv-xls' }, ...(draft ? [{ label: 'Eliminar', kind: 'danger', id: 'iv-del' }, { label: 'Marcar como emitida', kind: 'primary', id: 'iv-ok' }] : [{ label: 'Anular', kind: 'danger', id: 'iv-void' }])] });
    const q = (s) => m.el.querySelector(s);
    q('#iv-json').onclick = () => OS.files.save(`factura_${(i.number || 'borrador').replace(/\W/g, '')}.json`, JSON.stringify(toJSON({ ...i, number: draft ? q('#iv-n')?.value : i.number }), null, 2), 'application/json');
    q('#iv-xls').onclick = () => OS.files.exportExcel(`factura_${i.number || 'borrador'}`, i.items, [{ label: 'Descripción', get: 'desc' }, { label: 'Cantidad', get: 'qty' }, { label: 'Precio unitario', get: 'price' }, { label: 'IVA %', get: 'iva' }]);
    if (draft) {
      q('#iv-ok').onclick = () => { const n = q('#iv-n').value.trim(); if (!n) return; S.update('invoices', i.id, { status: 'emitida', number: n, cdc: q('#iv-c').value.trim() }, `Factura ${n} marcada como emitida`); if (n === fmtNum(f, f.next || 1)) { f.next = (f.next || 1) + 1; S.persist(); } m.close(true); OS.app.refresh({ tab: 'facturas' }); };
      q('#iv-del').onclick = () => { S.data.payments.filter((x) => x.invoiceId === i.id).forEach((x) => S.update('payments', x.id, { invoiceId: null })); S.remove('invoices', i.id, 'Borrador eliminado'); m.close(true); OS.app.refresh({ tab: 'facturas' }); };
    } else q('#iv-void').onclick = () => { S.update('invoices', i.id, { status: 'anulada' }, `Factura ${i.number} anulada (recordá anularla también en la DNIT)`); m.close(true); OS.app.refresh({ tab: 'facturas' }); };
  }

  return { render, perm: 'cobros' };
})();
