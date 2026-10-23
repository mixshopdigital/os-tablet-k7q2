/* ODONTO SMART — archivos: descargas, copias de seguridad, CSV/Excel.
   Descarga: en escritorio o navegador usa un enlace de descarga normal; dentro
   de la vista publicada usa el permiso de descargas del visor (pide confirmación). */
OS.files = (() => {
  const U = OS.util;
  const inFrame = (() => { try { return window.self !== window.top; } catch { return true; } })();
  let dlPromise = null;
  const hostDownloads = () => {
    if (!window.claude?.use) return Promise.resolve(null);
    return dlPromise || (dlPromise = window.claude.use('downloads').catch(() => null));
  };

  /** Guarda un archivo en el equipo. Devuelve true si se entregó. */
  async function save(filename, data, mime = 'application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
    if (window.odontoNative?.saveFile) {
      const ok = await window.odontoNative.saveFile(filename, new Uint8Array(await blob.arrayBuffer()));
      if (ok) OS.ui.toast(`Archivo guardado: ${filename}`);
      return ok;
    }
    const host = await hostDownloads();
    if (host) {
      try { await host.save({ filename, data: blob }); OS.ui.toast(`Archivo listo: ${filename}`); return true; }
      catch (e) { if (e?.code !== 'declined') OS.ui.toast('No se pudo descargar el archivo en esta vista.', 'warn'); return false; }
    }
    if (inFrame && window.claude) { OS.ui.toast('Esta vista no permite descargar archivos.', 'warn'); return false; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    OS.ui.toast(`Archivo descargado: ${filename}`);
    return true;
  }
  /** Abrir en otra pestaña / imprimir sólo funciona fuera de la vista incrustada. */
  const canOpenWindow = !inFrame || !!window.odontoNative;
  function openBlob(blob) { const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60000); }
  function dataUrlToBlob(dataUrl) {
    const [head, b64] = dataUrl.split(','); const mime = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // ---------- Copias de seguridad ----------
  async function backupNow() {
    const S = OS.store;
    const stamp = new Date(); const name = `OdontoSmart_backup_${U.toISO(stamp)}_${U.pad(stamp.getHours())}${U.pad(stamp.getMinutes())}.json`;
    const payload = JSON.stringify({ app: 'ODONTO SMART', format: 1, exportedAt: stamp.toISOString(), licensee: OS.license?.holder() || '', data: S.data });
    const ok = await save(name, payload, 'application/json');
    if (ok) { S.data.meta.lastBackup = Date.now(); S.log('Backup', 'backups', null, name); S.changed('meta'); }
    return ok;
  }
  async function restoreFromFile(file) {
    const txt = await U.readText(file);
    let obj; try { obj = JSON.parse(txt); } catch { throw new Error('El archivo no es una copia de ODONTO SMART válida.'); }
    const data = obj?.app === 'ODONTO SMART' ? obj.data : obj;
    try { await OS.store.snapshot('Antes de restaurar'); } catch { /* sin copias internas */ }
    try { await OS.store.replaceAll(data); } catch { throw new Error('El archivo no contiene una base de ODONTO SMART válida.'); }
    OS.store.log('Restauración', 'backups', null, file.name); OS.store.persist();
  }
  /** Backup automático: copia interna en el equipo según la frecuencia elegida. */
  async function autoBackupCheck() {
    const S = OS.store; const m = S.data.meta;
    if (m.autoBackup === 'manual' || !S.hasSnapshots) return;
    const lastSnap = m.snapshots?.[0]?.key || 0;
    const every = m.autoBackup === 'diario' ? 1 : 7;
    if (Date.now() - lastSnap >= every * 86400000) await S.snapshot(`Automático ${m.autoBackup}`);
    if (!m.lastBackup || Date.now() - m.lastBackup > every * 86400000) S.notify('backup', 'Conviene guardar una copia de seguridad en un USB o disco externo.', ['settings', { tab: 'backup' }], `bk:${U.today()}`);
  }

  // ---------- CSV ----------
  function toCSV(rows, cols) {
    const cell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return '﻿' + [cols.map((c) => cell(c.label)).join(';'), ...rows.map((r) => cols.map((c) => cell(typeof c.get === 'function' ? c.get(r) : r[c.get])).join(';'))].join('\r\n');
  }
  const exportCSV = (filename, rows, cols) => save(filename, toCSV(rows, cols), 'text/csv;charset=utf-8');
  /** Hoja «Licencia» que identifica al licenciatario en cada Excel exportado. */
  function licSheet(row) {
    const l = OS.license?.current?.lic; if (!l) return '';
    return `<Worksheet ss:Name="Licencia"><Table>${row(['Generado con', 'ODONTO SMART'])}${row(['Licenciatario', l.n])}${row(['Correo', l.e])}${row(['N.° de licencia', l.id])}${row(['Exportado', U.fmtDateTime(Date.now())])}${row(['Aviso', 'Licencia personal e intransferible.'])}</Table></Worksheet>`;
  }
  /** Hoja de cálculo que Excel abre directamente (SpreadsheetML 2003, sin librerías). */
  function exportExcel(filename, rows, cols, sheet = 'Datos') {
    const x = (v) => U.esc(v ?? '');
    const row = (vals) => `<Row>${vals.map((v) => `<Cell><Data ss:Type="${typeof v === 'number' ? 'Number' : 'String'}">${x(v)}</Data></Cell>`).join('')}</Row>`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${x(sheet)}"><Table>${row(cols.map((c) => c.label))}${rows.map((r) => row(cols.map((c) => (typeof c.get === 'function' ? c.get(r) : r[c.get])))).join('')}</Table></Worksheet>${licSheet(row)}</Workbook>`;
    return save(filename.replace(/\.xlsx?$/, '') + '.xls', xml, 'application/vnd.ms-excel');
  }
  /** Parser CSV tolerante (separador , o ;, comillas, BOM). */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const firstLine = text.split(/\r?\n/)[0] || '';
    const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = []; let cur = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; continue; }
      if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }

  return { save, canOpenWindow, inFrame, openBlob, dataUrlToBlob, backupNow, restoreFromFile, autoBackupCheck, toCSV, exportCSV, exportExcel, parseCSV };
})();
