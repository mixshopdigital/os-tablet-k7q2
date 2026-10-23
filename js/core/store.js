/* ODONTO SMART — capa de datos local (offline-first).
   El prototipo guarda una base documental con las mismas entidades que el
   esquema SQLite (ver /database/schema.sql). El adaptador se elige al iniciar:
     1. Escritorio (Electron): window.odontoNative → archivo en la carpeta de datos del usuario.
     2. Navegador: IndexedDB (mayor capacidad para radiografías y PDFs).
     3. Último recurso: memoria (se avisa al usuario que debe hacer backup).
   Ningún módulo de interfaz toca el almacenamiento directamente: todo pasa por OS.store. */
OS.store = (() => {
  const SCHEMA_VERSION = 1;
  const DB_NAME = 'odontosmart';
  const KEY = 'main';

  // ---------- Adaptadores de persistencia ----------
  const nativeAdapter = {
    name: 'escritorio',
    ok: () => !!window.odontoNative,
    load: () => window.odontoNative.load(),
    save: (json) => window.odontoNative.save(json),
  };

  const idbAdapter = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('kv'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode); const req = fn(t.objectStore('kv')); t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
    return {
      name: 'navegador',
      ok: () => { try { return !!window.indexedDB; } catch { return false; } },
      load: () => tx('readonly', (s) => s.get(KEY)),
      save: (json) => tx('readwrite', (s) => s.put(json, KEY)),
      getSnapshot: (k) => tx('readonly', (s) => s.get('snap:' + k)),
      putSnapshot: (k, json) => tx('readwrite', (s) => s.put(json, 'snap:' + k)),
      deleteSnapshot: (k) => tx('readwrite', (s) => s.delete('snap:' + k)),
      clear: () => tx('readwrite', (s) => s.clear()),
    };
  })();

  const memoryAdapter = { name: 'memoria', ok: () => true, _v: null, load() { return Promise.resolve(this._v); }, save(j) { this._v = j; return Promise.resolve(); } };

  let adapter = memoryAdapter;
  let data = null;
  let listeners = [];
  let saveTimer = null;
  let lastSaveError = null;

  const empty = () => ({
    meta: { schema: SCHEMA_VERSION, createdAt: Date.now(), demo: false, onboarded: false, lastBackup: null, autoBackup: 'semanal', snapshots: [] },
    clinic: { name: '', logo: null, logoPng: null, ruc: '', address: '', city: '', phone: '', whatsapp: '', email: '', social: '', doctorName: '', registry: '', signature: null, hours: defaultHours(), quoteValidityDays: 15, quoteNotes: 'Los precios pueden variar si cambia el diagnóstico durante el tratamiento.', paymentTerms: 'Efectivo, transferencia, tarjeta o QR.', currencyPrefix: 'G.', country: '595', edition: 'pro' },
    settings: { theme: 'system', fontScale: 1, autoLockMin: 15 },
    users: [], roles: defaultRoles(), professionals: [], patients: [], medical: {},
    appointments: [], clinicalNotes: [], toothRecords: [], perio: [],
    treatments: [], quotes: [], payments: [], invoices: [],
    inventory: [], inventoryMoves: [], suppliers: [], labs: [], labOrders: [],
    documents: [], consentTemplates: [], consents: [], prescriptions: [],
    messageTemplates: [], notifications: [], audit: [],
    counters: { quote: 0, receipt: 0, rx: 0, consent: 0 },
  });

  function defaultHours() {
    return ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'].map((d, i) => ({ day: d, open: i < 5 ? '08:00' : i === 5 ? '08:00' : '', close: i < 5 ? '19:00' : i === 5 ? '12:00' : '', closed: i === 6 }));
  }

  /** Permisos por módulo. Agregar un rol nuevo = agregar un objeto aquí o desde Configuración. */
  function defaultRoles() {
    return [
      { id: 'admin', name: 'Administrador', system: true, permissions: ['*'] },
      { id: 'odontologo', name: 'Odontólogo', system: true, permissions: ['pacientes', 'clinica', 'agenda', 'presupuestos', 'cobros', 'inventario', 'laboratorio', 'documentos', 'reportes', 'seguimientos', 'profesionales', 'ia'] },
      { id: 'recepcion', name: 'Recepción', system: true, permissions: ['pacientes', 'agenda', 'presupuestos', 'cobros', 'seguimientos'] },
      { id: 'asistente', name: 'Asistente', system: true, permissions: ['pacientes', 'agenda', 'inventario', 'laboratorio'] },
    ];
  }

  // ---------- Inicio ----------
  async function init() {
    for (const a of [nativeAdapter, idbAdapter, memoryAdapter]) {
      if (!a.ok()) continue;
      try {
        const raw = await a.load();
        adapter = a;
        data = raw ? migrate(typeof raw === 'string' ? JSON.parse(raw) : raw) : empty();
        return { adapter: a.name, fresh: !raw };
      } catch (e) { console.warn('Adaptador no disponible:', a.name, e); }
    }
    adapter = memoryAdapter; data = empty();
    return { adapter: 'memoria', fresh: true };
  }

  /** Completa colecciones nuevas en bases creadas con versiones anteriores. */
  function migrate(d) {
    const base = empty();
    for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
    d.meta = { ...base.meta, ...d.meta };
    d.clinic = { ...base.clinic, ...d.clinic };
    d.settings = { ...base.settings, ...d.settings };
    d.counters = { ...base.counters, ...d.counters };
    d.meta.schema = SCHEMA_VERSION;
    return d;
  }

  // ---------- Guardado ----------
  function persistNow() {
    clearTimeout(saveTimer); saveTimer = null;
    let json;
    try { json = JSON.stringify(data); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(adapter.save(json)).then(() => { lastSaveError = null; }).catch((e) => {
      lastSaveError = e; console.error(e);
      OS.ui?.toast('No pudimos guardar la información en este equipo. Haz una copia de seguridad para no perder cambios.', 'danger');
    });
  }
  function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(persistNow, 250); }
  function emit(what) { listeners.forEach((fn) => { try { fn(what); } catch (e) { console.error(e); } }); }
  function changed(what) { persist(); emit(what); }

  // ---------- CRUD genérico ----------
  const list = (col) => data[col];
  const get = (col, id) => data[col].find((x) => x.id === id) || null;
  function insert(col, obj, auditText) {
    const rec = { id: obj.id || OS.util.uid(col.slice(0, 3)), createdAt: Date.now(), ...obj };
    data[col].push(rec);
    if (auditText) log('Creó', col, rec.id, auditText);
    changed(col);
    return rec;
  }
  function update(col, id, patch, auditText) {
    const rec = get(col, id); if (!rec) return null;
    Object.assign(rec, patch, { updatedAt: Date.now() });
    if (auditText) log('Modificó', col, id, auditText);
    changed(col);
    return rec;
  }
  function remove(col, id, auditText) {
    const i = data[col].findIndex((x) => x.id === id); if (i < 0) return false;
    data[col].splice(i, 1);
    if (auditText) log('Eliminó', col, id, auditText);
    changed(col);
    return true;
  }
  function next(counter) { data.counters[counter] = (data.counters[counter] || 0) + 1; persist(); return data.counters[counter]; }

  // ---------- Auditoría y notificaciones ----------
  function log(action, entity, entityId, detail) {
    const u = OS.auth?.current();
    data.audit.unshift({ id: OS.util.uid('aud'), date: Date.now(), userId: u?.id || null, userName: u ? OS.auth.displayName(u) : 'Sistema', action, entity, entityId, detail });
    if (data.audit.length > 3000) data.audit.length = 3000;
  }
  function notify(type, text, link, key) {
    if (key && data.notifications.some((n) => n.key === key)) return;
    data.notifications.unshift({ id: OS.util.uid('ntf'), date: Date.now(), type, text, link: link || null, key: key || null, read: false });
    if (data.notifications.length > 200) data.notifications.length = 200;
    changed('notifications');
  }

  // ---------- Copias internas (backup automático dentro del equipo) ----------
  async function snapshot(reason) {
    if (!adapter.putSnapshot) return false;
    const k = Date.now();
    await adapter.putSnapshot(k, JSON.stringify(data));
    data.meta.snapshots = [{ key: k, reason }, ...(data.meta.snapshots || [])];
    while (data.meta.snapshots.length > 7) { const old = data.meta.snapshots.pop(); adapter.deleteSnapshot(old.key).catch(() => {}); }
    changed('meta');
    return true;
  }
  async function readSnapshot(k) { return adapter.getSnapshot ? adapter.getSnapshot(k) : null; }

  /** Reemplaza toda la base (restauración). Valida estructura mínima antes. */
  function replaceAll(obj) {
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.patients) || !obj.clinic) throw new Error('formato');
    const keep = data ? { license: data.meta.license, licenseHistory: data.meta.licenseHistory, maxSeen: data.meta.maxSeen } : null;
    data = migrate(obj);
    if (keep?.license) Object.assign(data.meta, keep); // la licencia de este equipo no se reemplaza al restaurar
    return persistNow().then(() => emit('*'));
  }
  async function wipe() { const lic = { license: data.meta.license, licenseHistory: data.meta.licenseHistory, maxSeen: data.meta.maxSeen }; data = empty(); Object.assign(data.meta, lic); await persistNow(); emit('*'); }

  return {
    init, get data() { return data; }, get adapterName() { return adapter.name; }, get hasSnapshots() { return !!adapter.putSnapshot; }, get lastSaveError() { return lastSaveError; },
    list, get, insert, update, remove, next, log, notify, changed, persist, persistNow, snapshot, readSnapshot, replaceAll, wipe,
    on: (fn) => { listeners.push(fn); return () => { listeners = listeners.filter((f) => f !== fn); }; },
    defaultRoles,
  };
})();
