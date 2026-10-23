/* ODONTO SMART — Periodontograma: sondaje (6 sitios por pieza), sangrado, recesión,
   nivel de inserción (calculado), movilidad, furcación y placa. Autoguardado y comparación entre sesiones. */
OS.views.perio = (() => {
  const U = OS.util; const ui = OS.ui; const D = OS.domain; const S = OS.store; const { esc } = U;
  const blank = () => ({ depth: [0, 0, 0, 0, 0, 0], bleeding: [false, false, false, false, false, false], recession: [0, 0, 0, 0, 0, 0], plaque: false, mobility: 0, furcation: 0 });

  function stats(rec) {
    if (!rec) return null;
    const teeth = Object.values(rec.teeth || {}); const sites = teeth.flatMap((t) => t.depth).filter((d) => d > 0);
    const bleed = teeth.flatMap((t) => t.bleeding.filter((_, i) => t.depth[i] > 0));
    return { avg: sites.length ? U.sum(sites) / sites.length : 0, bop: bleed.length ? Math.round((bleed.filter(Boolean).length / bleed.length) * 100) : 0, plaque: teeth.length ? Math.round((teeth.filter((t) => t.plaque).length / teeth.length) * 100) : 0, deep: sites.filter((d) => d >= 4).length, sites: sites.length };
  }

  function mount(el, pid) {
    const sessions = () => S.data.perio.filter((r) => r.patientId === pid).sort((a, b) => a.date.localeCompare(b.date));
    let curId = sessions().slice(-1)[0]?.id || null;
    const draw = () => {
      const list = sessions(); const cur = list.find((r) => r.id === curId); const idx = list.indexOf(cur); const prev = idx > 0 ? list[idx - 1] : null;
      const s = stats(cur); const ps = stats(prev);
      const delta = (a, b, unit = '', inv = false) => { if (b == null) return ''; const d = a - b; if (Math.abs(d) < 0.05) return '<span class="sub">sin cambios</span>'; const good = inv ? d > 0 : d < 0; return `<span class="sub" style="color:var(--${good ? 'ok' : 'danger'})">${d > 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(unit === '%' || unit === '' ? 0 : 1)}${unit} vs. anterior</span>`; };
      el.innerHTML = `<div class="toolbar"><div class="chip-row">${list.map((r) => `<button class="chip ${r.id === curId ? 'active' : ''}" data-s="${r.id}">${U.fmtDate(r.date)}</button>`).join('') || '<span class="muted">Sin sesiones registradas.</span>'}</div>
        ${OS.auth.can('clinica') ? `<button class="btn btn-primary btn-sm right" id="pe-new">${ui.icon('plus')}<span>Nueva sesión</span></button>` : ''}</div>
        ${cur ? `<div class="kpis">
          <div class="kpi"><small>Profundidad media</small><b>${s.avg.toFixed(1)} mm</b>${delta(s.avg, ps?.avg, ' mm')}</div>
          <div class="kpi"><small>Sangrado al sondaje</small><b>${s.bop}%</b>${delta(s.bop, ps?.bop, '%')}</div>
          <div class="kpi"><small>Índice de placa</small><b>${s.plaque}%</b>${delta(s.plaque, ps?.plaque, '%')}</div>
          <div class="kpi"><small>Sitios ≥ 4 mm</small><b>${s.deep}</b>${delta(s.deep, ps?.deep)}</div></div>
          <section class="panel perio-chart"><div class="panel-head"><h3>${ui.icon('chart')}Profundidad media por pieza</h3><span class="legend" style="grid-auto-flow:column;gap:14px"><span><i style="background:var(--primary)"></i>${U.fmtDate(cur.date)}</span>${prev ? `<span><i style="background:var(--line-strong)"></i>${U.fmtDate(prev.date)}</span>` : ''}</span></div>${chart(cur, prev)}</section>
          <div class="row gap wrap"><p class="muted small">${ui.icon('check')} Los cambios se guardan automáticamente. NI = nivel de inserción (sondaje + recesión). Valores ≥ 4 mm se resaltan.</p>${OS.auth.can('clinica') ? `<button class="btn btn-sm btn-ghost right" id="pe-del">${ui.icon('trash')}<span>Eliminar sesión</span></button>` : ''}</div>
          ${grid(cur, D.UPPER, 'Superior', pid)}${grid(cur, D.LOWER, 'Inferior', pid)}`
        : ui.empty('Sin periodontograma', 'Crea una sesión para registrar el sondaje periodontal de este paciente.')}`;
      el.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { curId = b.dataset.s; draw(); }));
      el.querySelector('#pe-new')?.addEventListener('click', () => {
        const teeth = {}; [...D.UPPER, ...D.LOWER].forEach((t) => { if (D.toothState(pid, t).whole !== 'ausente') teeth[t] = blank(); });
        const r = S.insert('perio', { patientId: pid, date: U.today(), teeth, professionalId: OS.auth.current()?.professionalId || null }, `Periodontograma de ${D.patientName(pid)}`);
        curId = r.id; draw();
      });
      el.querySelector('#pe-del')?.addEventListener('click', async () => { if (await ui.confirm({ title: 'Eliminar sesión', text: `Se eliminará el periodontograma del ${U.fmtDate(cur.date)}.`, ok: 'Eliminar', kind: 'danger' })) { S.remove('perio', cur.id, `Periodontograma ${U.fmtDate(cur.date)} de ${D.patientName(pid)}`); curId = sessions().slice(-1)[0]?.id || null; draw(); } });
      if (cur) wire(el, cur, draw);
    };
    draw();
  }

  function grid(rec, teeth, label) {
    const ro = !OS.auth.can('clinica');
    const td = (t, fn) => `<td>${rec.teeth[t] ? fn(rec.teeth[t]) : '<span class="muted">—</span>'}</td>`;
    const trio = (t, side, key) => (x) => `<div class="trio">${[0, 1, 2].map((i) => { const k = side * 3 + i; const v = x[key][k]; return key === 'bleeding' ? `<button type="button" class="bop ${v ? 'on' : ''}" data-t="${t}" data-k="${key}" data-i="${k}" aria-pressed="${v}" aria-label="Sangrado pieza ${t} sitio ${k + 1}" ${ro ? 'disabled' : ''}></button>` : `<input class="pd ${key === 'depth' && v >= 4 ? 'deep' : ''}" inputmode="numeric" maxlength="2" value="${v || ''}" data-t="${t}" data-k="${key}" data-i="${k}" aria-label="${key === 'depth' ? 'Sondaje' : 'Recesión'} pieza ${t} sitio ${k + 1}" ${ro ? 'readonly' : ''}>`; }).join('')}</div>`;
    const ni = (side) => (x) => `<span class="small num">${[0, 1, 2].map((i) => (x.depth[side * 3 + i] ? x.depth[side * 3 + i] + x.recession[side * 3 + i] : '·')).join(' ')}</span>`;
    const sel = (t, key, max) => (x) => `<select class="pd" style="width:40px;min-height:26px;padding:0 2px" data-t="${t}" data-k="${key}" aria-label="${key} pieza ${t}" ${ro ? 'disabled' : ''}>${Array.from({ length: max + 1 }, (_, i) => `<option ${x[key] === i ? 'selected' : ''}>${i}</option>`).join('')}</select>`;
    const row = (name, fn) => `<tr><td class="rl">${name}</td>${teeth.map((t) => td(t, fn(t))).join('')}</tr>`;
    return `<section><h3 class="eyebrow" style="margin:6px 0">${label}</h3><div class="perio-grid"><table><thead><tr><th></th>${teeth.map((t) => `<th>${t}</th>`).join('')}</tr></thead><tbody>
      ${row('Movilidad', (t) => sel(t, 'mobility', 3))}${row('Furcación', (t) => sel(t, 'furcation', 3))}
      ${row('Placa', (t) => (x) => `<button type="button" class="bop pl ${x.plaque ? 'on' : ''}" data-t="${t}" data-k="plaque" aria-pressed="${x.plaque}" aria-label="Placa pieza ${t}" ${ro ? 'disabled' : ''}></button>`)}
      ${row('Sangrado V', (t) => trio(t, 0, 'bleeding'))}${row('Sondaje V', (t) => trio(t, 0, 'depth'))}${row('Recesión V', (t) => trio(t, 0, 'recession'))}${row('NI V', () => ni(0))}
      ${row('Sondaje L/P', (t) => trio(t, 1, 'depth'))}${row('Recesión L/P', (t) => trio(t, 1, 'recession'))}${row('Sangrado L/P', (t) => trio(t, 1, 'bleeding'))}${row('NI L/P', () => ni(1))}
      </tbody></table></div></section>`;
  }

  function wire(el, rec, redraw) {
    const save = U.debounce(() => S.update('perio', rec.id, { teeth: rec.teeth }, null), 400);
    let needsRedraw = false;
    const later = U.debounce(() => { if (needsRedraw && !document.activeElement?.closest?.('.perio-grid')) { needsRedraw = false; redraw(); } }, 600);
    el.querySelectorAll('.perio-grid [data-k]').forEach((x) => {
      const t = x.dataset.t; const k = x.dataset.k; const i = Number(x.dataset.i);
      if (x.tagName === 'BUTTON') x.onclick = () => { const tooth = rec.teeth[t]; if (k === 'plaque') tooth.plaque = !tooth.plaque; else tooth[k][i] = !tooth[k][i]; x.classList.toggle('on'); x.setAttribute('aria-pressed', x.classList.contains('on')); save(); needsRedraw = true; later(); };
      else if (x.tagName === 'SELECT') x.onchange = () => { rec.teeth[t][k] = Number(x.value); save(); };
      else x.oninput = () => {
        const v = Math.min(15, Math.max(0, parseInt(x.value.replace(/\D/g, ''), 10) || 0)); x.value = v || '';
        rec.teeth[t][k][i] = v; if (k === 'depth') x.classList.toggle('deep', v >= 4); save(); needsRedraw = true; later();
        if (x.value.length >= 1) { const all = [...el.querySelectorAll('.perio-grid input.pd')]; const n = all[all.indexOf(x) + 1]; if (n && v >= 1 && v <= 9) n.focus(); }
      };
    });
    // No se redibuja mientras el foco está en la tabla (no se pierde lo que se tipea); al salir se actualizan indicadores y gráfico.
    el.querySelectorAll('.perio-grid').forEach((g) => g.addEventListener('focusout', (e) => { if (!g.contains(e.relatedTarget) && needsRedraw) later(); }));
  }

  function chart(cur, prev) {
    const teeth = [...D.UPPER, ...D.LOWER]; const W = 960; const H = 190; const pl = 34; const pb = 26; const pt = 10;
    const avg = (r, t) => { const x = r?.teeth?.[t]; if (!x) return null; const v = x.depth.filter((d) => d > 0); return v.length ? U.sum(v) / v.length : null; };
    const max = 8; const sx = (i) => pl + (i + 0.5) * ((W - pl - 6) / teeth.length); const sy = (v) => pt + (1 - v / max) * (H - pt - pb);
    const line = (r, color, w) => { let d = ''; teeth.forEach((t, i) => { const v = avg(r, t); if (v == null) return; d += `${d ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)} `; }); return d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round"/>` : ''; };
    const pts = teeth.map((t, i) => { const v = avg(cur, t); return v == null ? '' : `<circle cx="${sx(i)}" cy="${sy(v)}" r="3" fill="${v >= 4 ? 'var(--danger)' : 'var(--primary)'}"><title>${t}: ${v.toFixed(1)} mm</title></circle>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Profundidad media de sondaje por pieza">
      ${[0, 2, 4, 6, 8].map((v) => `<line x1="${pl}" x2="${W - 6}" y1="${sy(v)}" y2="${sy(v)}" stroke="${v === 4 ? 'var(--danger)' : 'var(--line)'}" stroke-dasharray="${v === 4 ? '4 4' : '0'}" stroke-width="1"/><text x="${pl - 6}" y="${sy(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${v}</text>`).join('')}
      <line x1="${sx(15.5)}" x2="${sx(15.5)}" y1="${pt}" y2="${H - pb}" stroke="var(--line-strong)"/>
      ${line(prev, 'var(--line-strong)', 2)}${line(cur, 'var(--primary)', 2.5)}${pts}
      ${teeth.map((t, i) => `<text x="${sx(i)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--font-mono)">${t}</text>`).join('')}</svg>`;
  }

  return { mount, stats };
})();
