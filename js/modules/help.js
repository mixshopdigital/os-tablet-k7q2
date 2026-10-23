/* ODONTO SMART — Ayuda: guía rápida, preguntas frecuentes, atajos y procedimientos. */
OS.views.help = (() => {
  const ui = OS.ui;
  const k = (s) => s.split('+').map((x) => `<kbd class="k">${x.trim()}</kbd>`).join(' + ');
  const SECTIONS = [
    ['guia', 'Guía rápida', `<h3>Tu primer día con ODONTO SMART</h3><ol>
      <li>Completa <b>Configuración → Mi consultorio</b> con tu logo y datos: aparecen en todos los PDF.</li>
      <li>Crea pacientes desde <b>Pacientes → Nuevo paciente</b> (o importa un CSV).</li>
      <li>En la ficha del paciente registra la <b>historia clínica</b>; las alergias y medicaciones quedan como alertas visibles.</li>
      <li>Abre el <b>Odontograma</b>, toca una pieza y usa <b>+ Diagnóstico</b> o <b>+ Tratamiento</b>. El tratamiento se agrega a un presupuesto.</li>
      <li>En el presupuesto ajusta precios, descuento y cuotas; luego <b>Generar PDF</b> y envíalo por <b>WhatsApp</b>.</li>
      <li>Cuando el paciente acepta, marca <b>Aceptado</b>: se suma a su cuenta corriente. Registra pagos desde <b>Cobros</b>.</li>
      <li>Agenda la próxima cita. Al atenderla, <b>Atender</b> abre la evolución clínica.</li></ol>`],
    ['faq', 'Preguntas frecuentes', `<h3>Preguntas frecuentes</h3><ul>
      <li><b>¿Necesito Internet?</b> No. Pacientes, agenda, odontograma, presupuestos, PDF, cobros y reportes funcionan sin conexión. Solo el asistente de IA es opcional y requiere conexión.</li>
      <li><b>¿Dónde se guardan los datos?</b> En este equipo. Haz un backup semanal en un USB o disco externo.</li>
      <li><b>¿Por qué WhatsApp no adjunta el PDF solo?</b> El enlace oficial de WhatsApp no permite adjuntar archivos. Descarga el PDF y adjúntalo con el clip; el mensaje ya queda escrito.</li>
      <li><b>¿Puedo usarlo en el teléfono?</b> Sí, la interfaz se adapta. La sincronización entre la PC y el teléfono está prevista para la Fase 3.</li>
      <li><b>Olvidé mi contraseña.</b> En el inicio de sesión toca «¿Olvidaste tu contraseña?» y usa tu código de recuperación. La administradora también puede usar su licencia. Otros usuarios: la administradora les asigna una nueva en Configuración → Usuarios.</li></ul>`],
    ['licencia', 'Licencia', `<h3>Tu licencia</h3><ul><li>La licencia es personal e intransferible y está a nombre del comprador. Su nombre aparece en pantalla, en los PDF y en los Excel exportados.</li><li>Puedes ver el plan, el n.° de licencia y el vencimiento en <b>Configuración → Licencia</b>.</li><li>Cuando falten 30 días para vencer verás un aviso. Al vencer, tus datos se conservan y puedes descargar un backup; para seguir usando el programa, pega tu licencia de renovación.</li><li>Planes: Individual (1 profesional), Pro (hasta 3) y Clínica (ilimitados).</li></ul>`],
    ['atajos', 'Atajos de teclado', `<h3>Atajos de teclado</h3><table class="tbl"><tbody>
      <tr><td>${k('Ctrl + P')}</td><td>Nuevo paciente</td></tr><tr><td>${k('Ctrl + A')}</td><td>Nueva cita</td></tr><tr><td>${k('Ctrl + B')}</td><td>Buscar</td></tr><tr><td>${k('Ctrl + O')}</td><td>Odontograma</td></tr><tr><td>${k('Ctrl + R')}</td><td>Nuevo presupuesto</td></tr><tr><td>${k('Esc')}</td><td>Cerrar ventana</td></tr><tr><td>${k('↑ / ↓ + Enter')}</td><td>Moverse por los resultados de búsqueda</td></tr></tbody></table>
      <p class="muted small">Los atajos no se activan mientras escribes en un campo (salvo ${k('Ctrl + B')}).</p>`],
    ['backup', 'Backup y restauración', `<h3>Cómo hacer backup</h3><ol><li>Ve a <b>Configuración → Copias de seguridad</b>.</li><li>Presiona <b>Backup ahora</b>: se descarga un archivo .json.</li><li>Cópialo a un USB o disco externo y guárdalo en un lugar seguro.</li></ol>
      <h3>Cómo restaurar</h3><ol><li>En <b>Copias de seguridad</b>, elige <b>Restaurar copia</b> y selecciona el archivo.</li><li>Confirma: los datos actuales se reemplazan (antes se guarda una copia interna).</li><li>Vuelve a iniciar sesión.</li></ol>`],
    ['whatsapp', 'Configurar WhatsApp', `<h3>Configurar WhatsApp</h3><ol><li>En <b>Configuración → WhatsApp</b> carga el número del consultorio y el código de país (595).</li><li>Carga el WhatsApp de cada paciente en su ficha (si lo dejas vacío se usa el teléfono).</li><li>Edita los mensajes en <b>Seguimientos → Plantillas</b>. Usa [Nombre], [fecha], [hora] y [monto].</li><li>Con WhatsApp Desktop instalado, el enlace abre la aplicación; si no, abre WhatsApp Web.</li></ol>`],
    ['presupuestos', 'Crear presupuestos', `<h3>Crear presupuestos</h3><ol><li>Desde la ficha: botón <b>Presupuesto</b>, o desde el odontograma: <b>+ Tratamiento</b> en una pieza.</li><li>Agrega tratamientos del catálogo (los precios se editan en <b>Tratamientos → Catálogo</b>).</li><li>Aplica descuento en guaraníes o porcentaje y elige cuotas (3, 6, 12 u otra).</li><li><b>Generar PDF</b> muestra la vista previa con tu logo; descárgalo, guárdalo en la ficha o envíalo por WhatsApp.</li></ol>`],
  ];
  function open(section = 'guia') {
    const m = ui.modal({ title: 'Ayuda', size: 'lg', guard: false, body: `<a class="btn btn-soft" href="ODONTO-SMART-Instructivo.html" target="_blank" rel="noopener" style="justify-self:start">${ui.icon('file')}<span>Abrir el instructivo completo (con imágenes)</span></a><div class="help-grid"><nav class="help-nav">${SECTIONS.map(([id, l]) => `<button data-h="${id}" class="${id === section ? 'active' : ''}">${l}</button>`).join('')}</nav><div class="help-body" id="h-body"></div></div>` });
    const show = (id) => { m.el.querySelector('#h-body').innerHTML = SECTIONS.find((s) => s[0] === id)[2]; m.el.querySelectorAll('[data-h]').forEach((b) => b.classList.toggle('active', b.dataset.h === id)); };
    m.el.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => show(b.dataset.h)));
    show(section);
  }
  return { open, render: (el) => { el.innerHTML = ''; open(); } };
})();
