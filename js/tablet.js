/* Odonto Smart — modo tablet (app instalable, funciona sin internet) */
(function () {
  'use strict';
  var KEY = 'osm_pwa_hide';
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function hidden() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function hide() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
  function bar(text, btn, fn) {
    if (document.querySelector('.pwa-bar')) return;
    var d = document.createElement('div'); d.className = 'pwa-bar'; d.setAttribute('role', 'status');
    var p = document.createElement('p'); p.textContent = text; d.appendChild(p);
    if (btn) { var b = document.createElement('button'); b.className = 'btn btn-primary'; b.textContent = btn; b.onclick = function () { fn(); d.remove(); }; d.appendChild(b); }
    var c = document.createElement('button'); c.className = 'btn'; c.textContent = 'Cerrar'; c.onclick = function () { hide(); d.remove(); }; d.appendChild(c);
    document.body.appendChild(d);
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  // pedir al navegador que NO borre los datos
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (!standalone() && !hidden()) setTimeout(function () { bar('Instalá Odonto Smart en esta tablet para usarla como una app, sin internet.', 'Instalar', function () { deferred.prompt(); }); }, 2500);
  });
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !standalone() && !hidden()) {
    setTimeout(function () { bar('Para instalar: tocá el botón Compartir de Safari y elegí "Agregar a pantalla de inicio". Así tus datos quedan protegidos.', null, null); }, 3500);
  }
})();
