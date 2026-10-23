/* ODONTO SMART — usuarios, sesión, roles y bloqueo automático.
   Las contraseñas nunca se guardan en texto plano: PBKDF2-SHA256 con sal aleatoria
   (Web Crypto). Si el entorno no ofrece Web Crypto se usa SHA-256 iterado (fallback). */
OS.auth = (() => {
  let session = null;      // { userId, since }
  let locked = false;
  let idleTimer = null;
  const ITER = 120000;

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const randomSalt = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return hex(a); };

  async function pbkdf2(password, salt) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: ITER }, key, 256);
    return hex(bits);
  }
  // SHA-256 compacto para entornos sin crypto.subtle.
  function sha256(str) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const bytes = [...new TextEncoder().encode(str)]; const l = bytes.length * 8;
    bytes.push(0x80); while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push((l / 2 ** (i * 8)) & 0xff);
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3); const s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25); const ch = (e & f) ^ (~e & g); const t1 = (h + S1 + ch + K[i] + w[i]) | 0; const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22); const mj = (a & b) ^ (a & c) ^ (b & c); const t2 = (S0 + mj) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0; }
      H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) | 0);
    }
    return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }
  async function hashPassword(password, salt) {
    if (window.crypto?.subtle) return { algo: 'pbkdf2', hash: await pbkdf2(password, salt) };
    let h = salt + password; for (let i = 0; i < 2000; i++) h = sha256(h);
    return { algo: 'sha256x2000', hash: h };
  }
  async function verify(user, password) {
    if (user.algo === 'pbkdf2' && window.crypto?.subtle) return (await pbkdf2(password, user.salt)) === user.hash;
    if (user.algo === 'sha256x2000') { let h = user.salt + password; for (let i = 0; i < 2000; i++) h = sha256(h); return h === user.hash; }
    return false;
  }

  /** Política: mínimo 8 caracteres, con letras y números. Devuelve el mensaje de error o ''. */
  function policy(password) {
    const p = String(password || '');
    if (p.length < 8 || !/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(p) || !/\d/.test(p)) return 'La contraseña debe tener al menos 8 caracteres, con letras y números.';
    return '';
  }

  async function createUser({ username, name, roleId, password, professionalId }) {
    const S = OS.store;
    const uname = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(uname)) throw new Error('El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion.');
    if (S.data.users.some((u) => u.username === uname)) throw new Error('Ese nombre de usuario ya existe.');
    if (policy(password)) throw new Error(policy(password));
    const salt = randomSalt();
    const { algo, hash } = await hashPassword(password, salt);
    return S.insert('users', { username: uname, name, roleId, salt, algo, hash, active: true, professionalId: professionalId || null }, `Usuario ${uname}`);
  }
  async function setPassword(userId, password) {
    if (policy(password)) throw new Error(policy(password));
    const salt = randomSalt(); const { algo, hash } = await hashPassword(password, salt);
    OS.store.update('users', userId, { salt, algo, hash }, 'Cambio de contraseña');
  }

  // ---------- Bloqueo progresivo: tras 5 intentos fallidos, espera creciente (30 s, 1 min, 2 min… hasta 15 min) ----------
  function waitSeconds() { const f = OS.store.data.meta.loginFails; if (!f?.until) return 0; return Math.max(0, Math.ceil((f.until - Date.now()) / 1000)); }
  function registerFail() {
    const m = OS.store.data.meta; const f = m.loginFails || { count: 0, until: 0 };
    f.count += 1; if (f.count >= 5) f.until = Date.now() + Math.min(900, 30 * 2 ** (f.count - 5)) * 1000;
    m.loginFails = f; OS.store.persist();
  }
  const clearFails = () => { OS.store.data.meta.loginFails = { count: 0, until: 0 }; };

  /** Devuelve true, false o { wait: segundos } si está bloqueado. */
  async function login(username, password) {
    const w = waitSeconds(); if (w) return { wait: w };
    const u = OS.store.data.users.find((x) => x.username === String(username || '').trim().toLowerCase() && x.active);
    if (!u || !(await verify(u, password))) { registerFail(); OS.store.log('Intento fallido', 'users', u?.id || null, `Inicio de sesión: ${username}`); OS.store.persist(); const w2 = waitSeconds(); return w2 ? { wait: w2 } : false; }
    clearFails();
    session = { userId: u.id, since: Date.now() };
    locked = false;
    try { sessionStorage.setItem('os_session', u.id); } catch { /* sin sessionStorage */ }
    OS.store.log('Inició sesión', 'users', u.id, OS.auth.displayName(u)); OS.store.persist();
    armIdle();
    return true;
  }
  function logout() {
    const u = current(); if (u) { OS.store.log('Cerró sesión', 'users', u.id, displayName(u)); OS.store.persist(); }
    session = null; locked = false; clearTimeout(idleTimer);
    try { sessionStorage.removeItem('os_session'); } catch { /* sin sessionStorage */ }
  }
  /** Recupera la sesión al recargar la pestaña (no sobrevive al cerrar el navegador). */
  function resume() {
    let id = null; try { id = sessionStorage.getItem('os_session'); } catch { /* sin sessionStorage */ }
    const u = id && OS.store.get('users', id);
    if (u && u.active) { session = { userId: u.id, since: Date.now() }; armIdle(); return true; }
    return false;
  }
  async function unlock(password) {
    if (waitSeconds()) return false;
    const u = current(); if (u && await verify(u, password)) { clearFails(); locked = false; armIdle(); return true; }
    registerFail(); return false;
  }

  // ---------- Código de recuperación (20 caracteres, se muestra una sola vez; se guarda solo como hash) ----------
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newRecoveryCode() { const a = new Uint8Array(20); crypto.getRandomValues(a); const raw = [...a].map((b) => ALPH[b % ALPH.length]).join(''); return raw.match(/.{4}/g).join('-'); }
  const normCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  async function setRecoveryCode(userId) {
    const code = newRecoveryCode(); const salt = randomSalt(); const { algo, hash } = await hashPassword(normCode(code), salt);
    OS.store.update('users', userId, { recSalt: salt, recAlgo: algo, recHash: hash }, 'Nuevo código de recuperación');
    return code;
  }
  /** Restablece la contraseña con el código de recuperación o con la licencia instalada. */
  async function recover({ username, code, license, newPassword }) {
    const w = waitSeconds(); if (w) throw new Error(`Demasiados intentos. Espera ${w} segundos.`);
    const u = OS.store.data.users.find((x) => x.username === String(username || '').trim().toLowerCase() && x.active);
    let ok = false;
    if (u && code && u.recHash) ok = await verify({ algo: u.recAlgo, salt: u.recSalt, hash: u.recHash }, normCode(code));
    if (u && license && u.roleId === 'admin') { const r = await OS.license.verify(license); const cur = OS.license.current.lic; ok = r.ok && cur && r.lic.id === cur.id && r.lic.e === cur.e; }
    if (!ok) { registerFail(); OS.store.log('Recuperación fallida', 'users', u?.id || null, username); throw new Error(license && u && u.roleId !== 'admin' ? 'Con la licencia solo se puede recuperar la cuenta de un administrador. Pide a tu administrador que te asigne una contraseña.' : 'Los datos no coinciden. Revisa el usuario y el código.'); }
    if (policy(newPassword)) throw new Error(policy(newPassword));
    clearFails(); await setPassword(u.id, newPassword);
    OS.store.log('Recuperó contraseña', 'users', u.id, `${u.username} (${code ? 'código de recuperación' : 'licencia'})`);
    await OS.store.persistNow();
    return u;
  }

  function armIdle() {
    clearTimeout(idleTimer);
    const min = Number(OS.store.data.settings.autoLockMin) || 0;
    if (!min || !session) return;
    idleTimer = setTimeout(() => { locked = true; OS.app?.showLock(); }, min * 60000);
  }
  ['pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, () => { if (session && !locked) armIdle(); }, { passive: true }));

  const current = () => (session ? OS.store.get('users', session.userId) : null);
  const role = (u = current()) => OS.store.data.roles.find((r) => r.id === u?.roleId);
  const can = (perm) => { const r = role(); if (!r) return false; return r.permissions.includes('*') || r.permissions.includes(perm); };
  function displayName(u) {
    if (!u) return '';
    const p = u.professionalId && OS.store.get('professionals', u.professionalId);
    return p ? `${p.title || ''} ${p.name}`.trim() : u.name;
  }

  return { policy, waitSeconds, setRecoveryCode, recover, createUser, setPassword, login, logout, resume, unlock, current, role, can, displayName, armIdle, get locked() { return locked; } };
})();
