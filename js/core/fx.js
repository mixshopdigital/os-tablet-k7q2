/* ODONTO SMART — efectos visuales y ayudas didácticas: contadores animados y tour guiado del primer uso. */
OS.fx = (() => {
  const U = OS.util; const ui = OS.ui; const { esc } = U;

  /** Anima los números marcados con data-count (y data-fmt="money"). */
  function countUp(root = document) {
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count) || 0; const money = el.dataset.fmt === 'money';
      const f = (v) => (money ? U.money(Math.round(v)) : String(Math.round(v)));
      if (to <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = f(to); return; }
      const t0 = performance.now(); const D = 900; el.textContent = f(0);
      const step = (t) => { const k = Math.min(1, (t - t0) / D); const e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  // ---------- Tour guiado ----------
  const STEPS = [
    { sel: '[data-go=dashboard]', icon: 'home', title: 'Tu día de un vistazo', text: 'En Inicio ves las citas de hoy, los cobros y las sugerencias del sistema: a quién confirmar, quién debe volver a control y qué presupuestos siguen sin respuesta.' },
    { sel: '[data-go=patients]', icon: 'users', title: 'Tus pacientes', text: 'Buscá por nombre, cédula o teléfono. Cada paciente tiene su ficha con alertas médicas, historial, saldo y fotos.' },
    { sel: '[data-go=agenda]', icon: 'calendar', title: 'Agenda', text: 'Citas por día, semana o mes para todos tus profesionales y boxes. Cada cita cambia de color según su estado.' },
    { sel: '[data-go=odontogram]', icon: 'tooth', title: 'Odontograma interactivo', text: 'Tocá una pieza y registrá caries, restauraciones, endodoncias, coronas o implantes. Queda guardado con fecha y profesional.' },
    { sel: '[data-go=quotes]', icon: 'quote', title: 'Presupuestos en PDF', text: 'Armalos en segundos desde tu catálogo, con descuentos y cuotas. Descargalos con tu logo y enviálos por WhatsApp.' },
    { sel: '[data-go=payments]', icon: 'card', title: 'Cobros y cuenta corriente', text: 'Registrá pagos parciales, emití recibos y mirá quién tiene saldo pendiente.' },
    { sel: '[data-go=messages]', icon: 'whatsapp', title: 'Mensajes de hoy', text: 'Cada día el sistema te arma los mensajes de WhatsApp: confirmaciones, recordatorios, controles, cumpleaños y cobros. Los enviás con un clic.' },
    { sel: '[data-go=documents]', icon: 'image', title: 'Fotos y documentos', text: 'Subí radiografías y fotos de antes y después de cada tratamiento. Deslizá sobre la imagen para mostrar el resultado al paciente.' },
    { sel: '[data-go=settings]', icon: 'settings', title: 'Configurá tu consultorio', text: 'Cargá tu logo y tus datos para los PDF, elegí el tema claro u oscuro y programá tus copias de seguridad.' },
  ];

  function tour(force) {
    if (document.querySelector('.tour-pop')) return;
    const steps = STEPS.map((s) => ({ ...s, el: document.querySelector(`.sidebar ${s.sel}`) })).filter((s) => s.el);
    if (!steps.length) return;
    let i = 0;
    const shade = document.createElement('div'); shade.className = 'tour-shade';
    const hole = document.createElement('div'); hole.className = 'tour-hole';
    const pop = document.createElement('div'); pop.className = 'tour-pop';
    document.body.append(shade, hole, pop);
    const end = (done) => { shade.remove(); hole.remove(); pop.remove(); window.removeEventListener('keydown', onKey); if (done !== false) { OS.store.data.meta.tourDone = true; OS.store.persist(); } };
    const onKey = (e) => { if (e.key === 'Escape') end(); if (e.key === 'ArrowRight' || e.key === 'Enter') show(i + 1); if (e.key === 'ArrowLeft') show(i - 1); };
    window.addEventListener('keydown', onKey);
    function show(n) {
      if (n >= steps.length) return end();
      if (n < 0) n = 0; i = n; const s = steps[i];
      const r = s.el.getBoundingClientRect(); const pad = 5;
      Object.assign(hole.style, { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
      pop.innerHTML = `<h4>${ui.icon(s.icon)}${esc(s.title)}</h4><p class="small">${esc(s.text)}</p>
        <div class="row"><div class="tour-dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <span class="right row gap"><button class="btn btn-sm btn-ghost" data-t="skip">Saltar</button>${i ? '<button class="btn btn-sm" data-t="prev">Atrás</button>' : ''}<button class="btn btn-sm btn-primary" data-t="next">${i === steps.length - 1 ? '¡Listo!' : 'Siguiente'}</button></span></div>`;
      const top = Math.min(Math.max(12, r.top - 10), window.innerHeight - pop.offsetHeight - 12);
      pop.style.left = `${r.right + 18}px`; pop.style.top = `${top}px`;
    }
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; if (b.dataset.t === 'skip') end(); else if (b.dataset.t === 'prev') show(i - 1); else show(i + 1); });
    shade.addEventListener('click', () => end());
    show(0);
  }

  /** Primer uso: lanza el tour una sola vez (no en modo demo). */
  function maybeTour() {
    const m = OS.store.data.meta;
    if (m.tourDone || m.demo || new URLSearchParams(location.search).has('notour')) return;
    setTimeout(() => { if (document.querySelector('.shell') && !document.querySelector('.modal-wrap')) tour(); }, 900);
  }

  return { countUp, tour, maybeTour };
})();
