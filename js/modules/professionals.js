/* ODONTO SMART — Profesionales del consultorio. */
OS.views.professionals = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;

  function render(el) {
    const t = U.today(); const m = t.slice(0, 7);
    const lim = OS.license.canAddProfessional();
    el.innerHTML = `<div class="page-head"><div><span class="eyebrow">Profesionales</span><h1>Equipo del consultorio</h1><p>${lim.active} de ${lim.max === Infinity ? 'ilimitados' : lim.max} profesionales activos en tu plan ${esc(OS.license.plan().name)}</p></div>${OS.auth.can('config') ? `<div class="page-actions"><button class="btn btn-primary" id="pr-new">${ui.icon('plus')}<span>Nuevo profesional</span></button></div>` : ''}</div>
      <div class="grid-3">${S.data.professionals.map((p) => { const ap = S.data.appointments.filter((a) => a.professionalId === p.id); return `<article class="panel"><div class="row gap">${ui.avatar(p.name, p.photo, 48)}<div class="grow"><h3>${esc(D.profName(p.id))}</h3><span class="muted small">${esc(p.specialty || 'Odontología')}${p.registry ? ` · Reg. ${esc(p.registry)}` : ''}</span></div>${ui.badge(p.active === false ? 'inactivo' : 'activo')}</div>
        <dl class="kv"><dt>Teléfono</dt><dd class="mono">${esc(U.prettyPhone(p.phone))}</dd><dt>Citas hoy</dt><dd>${ap.filter((a) => a.date === t && a.status !== 'cancelada').length}</dd><dt>Atendidos este mes</dt><dd>${ap.filter((a) => a.date.startsWith(m) && a.status === 'atendida').length}</dd><dt>Pacientes a cargo</dt><dd>${S.data.patients.filter((x) => x.professionalId === p.id).length}</dd></dl>
        <div class="row gap"><button class="btn btn-sm" data-ag="${p.id}">${ui.icon('calendar')}<span>Ver agenda</span></button>${OS.auth.can('config') ? `<button class="btn btn-sm btn-ghost" data-edit="${p.id}">${ui.icon('edit')}<span>Editar</span></button>` : ''}</div></article>`; }).join('') || ui.empty('Sin profesionales', 'Agrega a los odontólogos del consultorio.')}</div>`;
    el.querySelector('#pr-new')?.addEventListener('click', () => form());
    el.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => form(S.get('professionals', b.dataset.edit))));
    el.querySelectorAll('[data-ag]').forEach((b) => (b.onclick = () => OS.app.go('agenda', { prof: b.dataset.ag, view: 'week' })));
  }

  function form(p) {
    if (!p) { const c = OS.license.canAddProfessional(); if (!c.ok) return limitMsg(c); }
    const v = p || { title: 'Dra.', active: true, color: '#0E7C86' };
    const m = ui.modal({ title: p ? 'Editar profesional' : 'Nuevo profesional', size: 'md',
      body: `<form id="prf" class="form-grid">${ui.field('Título', ui.select('title', ['Dra.', 'Dr.', 'Od.', 'Lic.'], v.title))}${ui.field('Nombre completo', ui.input('name', v.name, 'required'), { req: true })}
        ${ui.field('Especialidad', ui.input('specialty', v.specialty))}${ui.field('Registro profesional', ui.input('registry', v.registry))}${ui.field('Teléfono', ui.input('phone', v.phone, 'inputmode="tel"'))}${ui.field('Color en agenda', ui.input('color', v.color, 'type="color"'))}
        <label class="check field span-2"><input type="checkbox" name="active" ${v.active !== false ? 'checked' : ''}><span>Activo</span></label></form>`,
      actions: [{ label: 'Cancelar', kind: 'ghost', close: true }, { label: 'Guardar', kind: 'primary', submit: true, form: 'prf' }] });
    m.el.querySelector('#prf').onsubmit = (e) => { e.preventDefault(); const d = U.formData(e.target); if (!d.name) return;
      if (p && d.active && p.active === false) { const c = OS.license.canAddProfessional(); if (!c.ok) { m.close(true); return limitMsg(c); } } if (p) S.update('professionals', p.id, d, `Profesional ${d.name}`); else S.insert('professionals', d, `Profesional ${d.name}`); m.markClean(); m.close(true); ui.toast('Profesional guardado.'); OS.app.refresh(); };
  }

  function limitMsg(c) {
    const pl = OS.license.plan();
    ui.modal({ title: 'Límite de tu plan', size: 'sm', guard: false, body: `<p>Tu licencia <b>${esc(pl.edition)}</b> permite ${c.max} ${c.max === 1 ? 'profesional activo' : 'profesionales activos'} y ya tienes ${c.active}.</p><p class="muted">Para sumar profesionales, pide una licencia de un plan superior (Pro: hasta 3; Clínica: ilimitados) o desactiva a un profesional que ya no atiende.</p>`, actions: [{ label: 'Entendido', kind: 'primary', close: true }] });
  }

  return { render, perm: 'profesionales' };
})();
