/* ODONTO SMART — datos base (catálogo, plantillas) y MODO DEMO.
   Todos los registros demo llevan demo:true y se eliminan con "Eliminar datos demo".
   Los nombres, cédulas y teléfonos son ficticios. */
OS.seed = (() => {
  const U = OS.util;

  const TREATMENTS = [
    ['Consulta y diagnóstico', 'Diagnóstico', 150000, 30], ['Radiografía periapical', 'Diagnóstico', 60000, 10], ['Control', 'Diagnóstico', 100000, 20],
    ['Limpieza / profilaxis', 'Prevención', 250000, 40], ['Destartraje', 'Periodoncia', 300000, 45], ['Sellante', 'Prevención', 120000, 20],
    ['Restauración de resina simple', 'Operatoria', 300000, 40], ['Restauración de resina compuesta', 'Operatoria', 400000, 50],
    ['Endodoncia unirradicular', 'Endodoncia', 800000, 60], ['Endodoncia multirradicular', 'Endodoncia', 1200000, 90],
    ['Corona metal-porcelana', 'Rehabilitación', 1200000, 60], ['Corona de porcelana', 'Rehabilitación', 1800000, 60], ['Prótesis removible', 'Rehabilitación', 2200000, 60],
    ['Extracción simple', 'Cirugía', 250000, 30], ['Extracción de tercer molar', 'Cirugía', 700000, 60], ['Implante dental', 'Implantes', 4500000, 90],
    ['Blanqueamiento', 'Estética', 1500000, 60], ['Carilla de resina', 'Estética', 600000, 60],
    ['Ortodoncia: instalación', 'Ortodoncia', 3500000, 90], ['Control de ortodoncia', 'Ortodoncia', 250000, 30],
  ];

  const CONSENTS = [
    ['Extracción dental', 'Yo, [Nombre completo], declaro haber sido informado/a de manera clara sobre el procedimiento de extracción de la pieza indicada, sus beneficios, riesgos frecuentes (dolor, inflamación, sangrado, infección, alveolitis) y riesgos poco frecuentes (lesión de piezas vecinas, comunicación con el seno maxilar, alteración de la sensibilidad). Me fueron explicadas las alternativas y las indicaciones posteriores. Autorizo al profesional a realizar el tratamiento.'],
    ['Implante dental', 'Yo, [Nombre completo], fui informado/a sobre la colocación de implantes dentales, el tiempo de integración, la necesidad de controles, los cuidados de higiene y los riesgos (dolor, inflamación, infección, falta de integración del implante, lesión de estructuras vecinas). Comprendo que el éxito depende también de mis hábitos y del cumplimiento de las indicaciones. Autorizo el procedimiento.'],
    ['Cirugía oral', 'Yo, [Nombre completo], autorizo la realización de la cirugía oral indicada. Se me explicaron los riesgos (dolor, sangrado, inflamación, infección, alteraciones transitorias de la sensibilidad), las alternativas y los cuidados posteriores.'],
    ['Endodoncia', 'Yo, [Nombre completo], fui informado/a de que la endodoncia busca conservar la pieza dental eliminando el tejido pulpar afectado. Comprendo que pueden presentarse molestias posteriores, fractura de instrumentos, necesidad de retratamiento o de una restauración definitiva (corona). Autorizo el tratamiento.'],
    ['Ortodoncia', 'Yo, [Nombre completo], fui informado/a sobre el tratamiento de ortodoncia, su duración estimada, la importancia de asistir a los controles, de la higiene y del uso de contención al finalizar. Comprendo los riesgos (descalcificaciones, reabsorción radicular, molestias) y autorizo el tratamiento.'],
    ['Blanqueamiento dental', 'Yo, [Nombre completo], fui informado/a de que el blanqueamiento puede producir sensibilidad transitoria, que el resultado varía en cada persona y que las restauraciones existentes no cambian de color. Autorizo el procedimiento.'],
    ['Tratamientos estéticos', 'Yo, [Nombre completo], fui informado/a sobre el tratamiento estético propuesto (carillas, contorneado u otros), sus alcances, limitaciones y cuidados de mantenimiento. Autorizo su realización.'],
    ['Uso de imágenes', 'Yo, [Nombre completo], autorizo a [Consultorio] a tomar fotografías y radiografías de mi tratamiento para mi historia clínica. Marque si además autoriza su uso con fines educativos o de difusión, sin datos que permitan identificarme: ☐ Sí ☐ No.'],
  ];

  /** Datos mínimos que necesita cualquier consultorio (también fuera del modo demo). */
  function base() {
    const S = OS.store; const d = S.data;
    if (!d.treatments.length) TREATMENTS.forEach(([name, category, price, duration]) => S.insert('treatments', { name, category, price, duration, active: true }));
    if (!d.messageTemplates.length) OS.wa.DEFAULT_TEMPLATES.forEach((t) => S.insert('messageTemplates', { ...t }));
    // Plantillas guardadas con versiones anteriores: se limpian los emojis una sola vez.
    d.messageTemplates.forEach((t) => { const c = OS.wa.clean(t.body); if (c !== t.body) { t.body = c; S.persist(); } });
    if (!d.consentTemplates.length) CONSENTS.forEach(([name, body]) => S.insert('consentTemplates', { name, body }));
  }

  // RNG determinístico para que el demo sea estable.
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  async function demo() {
    const S = OS.store; const d = S.data; const T = U.today(); const day = (n) => U.addDays(T, n);
    base();
    d.clinic = { ...d.clinic, name: 'Sonrisa Clara · Odontología Integral', ruc: '80012345-6', address: 'Av. España 1234 c/ Brasilia', city: 'Asunción', phone: '021 600 123', whatsapp: '0981 600 123', email: 'turnos@sonrisaclara.com.py', social: '@sonrisaclara.py', doctorName: 'Dra. Laura Benítez', registry: '4521' };
    const profDefs = [
      ({ title: 'Dra.', name: 'Laura Benítez', specialty: 'Odontología general y estética', registry: '4521', phone: '0981 600 123', color: '#0E7C86', active: true, demo: true }),
      ({ title: 'Dr.', name: 'Martín Ortiz', specialty: 'Endodoncia', registry: '5110', phone: '0982 410 220', color: '#2F6FD0', active: true, demo: true }),
      ({ title: 'Dra.', name: 'Sofía Ramírez', specialty: 'Ortodoncia', registry: '6034', phone: '0971 330 410', color: '#7A5AE0', active: true, demo: true }),
    ];
    // Solo se crean los profesionales que permite el plan de la licencia.
    const max = OS.license.plan().maxProfessionals;
    const made = profDefs.slice(0, Math.min(profDefs.length, max)).map((p) => S.insert('professionals', p));
    const profs = [0, 1, 2].map((i) => made[i] || made[0]);
    if (!d.users.some((u) => u.username === 'demo')) await OS.auth.createUser({ username: 'demo', name: 'Laura Benítez', roleId: 'admin', password: 'demo1234', professionalId: profs[0].id });
    if (!d.users.some((u) => u.username === 'recepcion')) await OS.auth.createUser({ username: 'recepcion', name: 'Carmen Recepción', roleId: 'recepcion', password: 'demo1234' });

    const people = [
      ['Pedro', 'López', 'M', '1988-03-14', 'Contador'], ['Ana', 'Benítez', 'F', '1992-07-22', 'Docente'], ['Lucía', 'Fernández', 'F', '1979-11-02', 'Abogada'],
      ['Jorge', 'Villalba', 'M', '1965-05-30', 'Comerciante'], ['Rosa', 'Martínez', 'F', '1958-01-18', 'Jubilada'], ['Diego', 'Acosta', 'M', '2001-09-09', 'Estudiante'],
      ['Camila', 'Duarte', 'F', '1996-12-12', 'Diseñadora'], ['Miguel', 'Cáceres', 'M', '1983-04-27', 'Ingeniero'], ['Valeria', 'Giménez', 'F', '2010-06-05', 'Estudiante'], ['Andrés', 'Rojas', 'M', '1975-08-16', 'Chofer'],
    ];
    const pts = people.map(([firstName, lastName, sex, birthDate, occupation], i) => S.insert('patients', {
      firstName, lastName, sex, birthDate, occupation, ci: String(3100000 + i * 371 + 42), phone: `0981 ${100 + i * 7} ${String(200 + i * 13).padStart(3, '0')}`, whatsapp: `0981 ${100 + i * 7} ${String(200 + i * 13).padStart(3, '0')}`,
      email: `${U.norm(firstName)}.${U.norm(lastName)}@ejemplo.com`, address: pick(['Barrio Jara', 'Villa Morra', 'Sajonia', 'Lambaré', 'San Lorenzo', 'Fernando de la Mora']), professionalId: profs[i % 3 === 2 ? 2 : i % 3 === 1 ? 1 : 0].id,
      status: i === 9 ? 'inactivo' : 'activo', notes: '', demo: true, createdAt: Date.now() - (i === 8 ? 3 : 60 + i * 40) * 86400000,
    }));
    const med = [
      { allergies: 'Penicilina', medications: '', diseases: '', hypertension: false }, { allergies: '', medications: 'Anticonceptivos orales' },
      { allergies: '', medications: 'Losartán 50 mg', hypertension: true }, { allergies: 'Látex', medications: 'Metformina 850 mg', diabetes: true, hypertension: true },
      { allergies: '', medications: 'Aspirina 100 mg', cardio: true, coagulation: true }, {}, { pregnant: true, other: 'Segundo trimestre' }, {}, {}, {},
    ];
    pts.forEach((p, i) => { d.medical[p.id] = { diseases: '', background: '', surgeries: '', other: '', ...med[i], updatedAt: Date.now(), demo: true }; });

    const tr = (name) => d.treatments.find((t) => t.name === name);
    const appt = (pi, date, time, treatment, status, pfi = 0, dur, box = 'Box 1') => S.insert('appointments', { patientId: pts[pi].id, professionalId: profs[pfi].id, date, time, duration: dur || tr(treatment)?.duration || 30, treatment, box, status, notes: '', demo: true });
    const note = (pi, date, reason, diagnosis, procedure, pfi = 0, extra = {}) => S.insert('clinicalNotes', { patientId: pts[pi].id, professionalId: profs[pfi].id, date, reason, diagnosis, procedure, observations: '', indications: extra.ind || '', materials: extra.mat || '', demo: true });

    // Historia de visitas pasadas
    note(0, day(-40), 'Consulta inicial', 'Caries oclusal en 36 y 46. Gingivitis leve.', 'Examen clínico, radiografías periapicales.', 0);
    note(0, day(-26), 'Restauración', 'Caries en 36', 'Restauración de resina compuesta en 36 (O).', 0, { mat: 'Resina A2, adhesivo', ind: 'Evitar alimentos duros por 24 h.' });
    note(1, day(-12), 'Dolor en molar superior', 'Pulpitis irreversible en 16', 'Apertura cameral y medicación intraconducto.', 1, { ind: 'Ibuprofeno 400 mg cada 8 h por 3 días si hay dolor.' });
    note(2, day(-200), 'Limpieza', 'Placa y cálculo supragingival', 'Destartraje y profilaxis.', 0);
    note(3, day(-95), 'Evaluación protésica', 'Ausencia de 46 y 36', 'Toma de impresiones para prótesis.', 0);
    note(4, day(-60), 'Control periodontal', 'Periodontitis estadio II', 'Raspado y alisado radicular cuadrante 1.', 0);
    note(5, day(-30), 'Ortodoncia', 'Maloclusión clase II', 'Control de ortodoncia: cambio de arco.', 2);
    note(6, day(-220), 'Blanqueamiento', 'Pigmentación extrínseca', 'Profilaxis previa.', 0);
    note(7, day(-15), 'Fractura', 'Fractura coronaria en 21', 'Reconstrucción provisoria.', 0);
    note(9, day(-400), 'Extracción', 'Resto radicular 48', 'Extracción simple.', 0);

    [[0, -40, 'Consulta y diagnóstico'], [0, -26, 'Restauración de resina compuesta'], [1, -12, 'Endodoncia multirradicular', 1], [2, -200, 'Limpieza / profilaxis'], [3, -95, 'Consulta y diagnóstico'], [4, -60, 'Destartraje'], [5, -30, 'Control de ortodoncia', 2], [6, -220, 'Blanqueamiento'], [7, -15, 'Consulta y diagnóstico'], [9, -400, 'Extracción simple']]
      .forEach(([pi, n, t, pf]) => appt(pi, day(n), pick(['08:30', '10:00', '15:00', '16:30']), t, 'atendida', pf || 0));
    appt(6, day(-5), '09:30', 'Control', 'ausente', 0);

    // Agenda de hoy
    appt(0, T, '08:00', 'Restauración de resina compuesta', 'atendida', 0, 50);
    appt(1, T, '09:00', 'Endodoncia multirradicular', 'atendida', 1, 90, 'Box 2');
    appt(2, T, '10:00', 'Limpieza / profilaxis', 'atendida', 0, 40);
    appt(5, T, '11:00', 'Control de ortodoncia', 'ausente', 2, 30, 'Box 2');
    appt(3, T, '14:30', 'Prótesis removible', 'confirmada', 0, 60);
    appt(7, T, '15:30', 'Corona de porcelana', 'confirmada', 0, 60);
    appt(4, T, '16:30', 'Control', 'pendiente', 0, 30, 'Box 2');
    appt(8, T, '17:30', 'Consulta y diagnóstico', 'pendiente', 2, 30);
    // Próximos días
    appt(1, day(1), '09:00', 'Endodoncia multirradicular', 'pendiente', 1, 60, 'Box 2');
    appt(5, day(1), '11:00', 'Control de ortodoncia', 'pendiente', 2, 30);
    appt(7, day(3), '10:30', 'Corona de porcelana', 'confirmada', 0, 60);
    appt(3, day(6), '15:00', 'Prótesis removible', 'pendiente', 0, 60);
    appt(0, day(14), '08:30', 'Control', 'pendiente', 0, 20);

    // Odontogramas
    const tooth = (pi, t, state, surfaces, date, kind = 'diagnostico', note = '') => S.insert('toothRecords', { patientId: pts[pi].id, tooth: t, state, surfaces, date, kind, note, professionalId: profs[0].id, demo: true });
    tooth(0, 36, 'caries', ['O'], day(-40)); tooth(0, 46, 'caries', ['O', 'D'], day(-40)); tooth(0, 36, 'restauracion', ['O'], day(-26), 'tratamiento', 'Resina A2'); tooth(0, 18, 'ausente', [], day(-40)); tooth(0, 28, 'ausente', [], day(-40));
    tooth(1, 16, 'caries', ['O', 'M'], day(-12)); tooth(1, 16, 'endodoncia', [], day(-12), 'tratamiento', 'Conductos en tratamiento'); tooth(1, 26, 'restauracion', ['O'], day(-300), 'tratamiento');
    tooth(3, 46, 'ausente', []); tooth(3, 36, 'ausente', []); tooth(3, 17, 'corona', [], day(-500), 'tratamiento'); tooth(3, 25, 'caries', ['D'], day(-95));
    tooth(4, 11, 'protesis', [], day(-700), 'tratamiento'); tooth(4, 21, 'protesis', [], day(-700), 'tratamiento'); tooth(4, 47, 'extraccion', [], day(-60));
    tooth(7, 21, 'fractura', ['M', 'O'], day(-15)); tooth(5, 14, 'sellante', ['O'], day(-300), 'tratamiento'); tooth(5, 24, 'sellante', ['O'], day(-300), 'tratamiento');
    d.toothRecords.forEach((r) => { if (!r.date) r.date = day(-500); });

    // Presupuestos
    const item = (name, toothN, qty = 1, done = false, price) => ({ id: U.uid('itm'), treatmentId: tr(name)?.id, name, tooth: toothN || '', qty, price: price ?? tr(name).price, done });
    const quote = (pi, date, items, extra) => S.insert('quotes', { number: `P-${String(S.next('quote')).padStart(4, '0')}`, patientId: pts[pi].id, professionalId: profs[extra.pf || 0].id, date, items, discount: 0, validDays: 15, paymentTerms: d.clinic.paymentTerms, notes: '', status: 'borrador', demo: true, ...extra });
    const q0 = quote(0, day(-40), [item('Restauración de resina compuesta', 36, 1, true), item('Restauración de resina compuesta', 46, 1, false), item('Limpieza / profilaxis', '', 1, true)], { status: 'aceptado', acceptedAt: day(-40), discount: 50000 });
    const q1 = quote(1, day(-12), [item('Endodoncia multirradicular', 16, 1, false), item('Corona de porcelana', 16), item('Radiografía periapical', 16, 2, true)], { status: 'aceptado', acceptedAt: day(-12), pf: 1, discount: 120000, installments: { count: 3, start: day(-12) } });
    const q3 = quote(3, day(-95), [item('Prótesis removible', '', 1), item('Restauración de resina simple', 25)], { status: 'aceptado', acceptedAt: day(-90), installments: { count: 6, start: day(-90) } });
    const q7 = quote(7, day(-15), [item('Corona de porcelana', 21), item('Endodoncia unirradicular', 21)], { status: 'enviado' });
    quote(2, day(-9), [item('Blanqueamiento', ''), item('Carilla de resina', 11), item('Carilla de resina', 21)], { status: 'enviado', discount: 100000 });
    quote(6, day(-30), [item('Implante dental', 36)], { status: 'rechazado' });
    const q4 = quote(4, day(-60), [item('Destartraje', '', 4, true, 300000), item('Control', '', 1)], { status: 'aceptado', acceptedAt: day(-60) });
    const q5 = quote(5, day(-4), [item('Control de ortodoncia', '', 6)], { status: 'aceptado', acceptedAt: day(-2), pf: 2, installments: { count: 6, start: day(-2) } });
    void q7;

    const pay = (q, date, amount, method, inst) => S.insert('payments', { patientId: q.patientId, quoteId: q.id, date, amount, method, installmentNo: inst || null, note: '', receiptNo: `R-${String(S.next('receipt')).padStart(4, '0')}`, demo: true });
    pay(q0, day(-40), 400000, 'Efectivo'); pay(q0, T, 300000, 'Transferencia');
    pay(q1, day(-12), 1000000, 'Tarjeta', 1); pay(q1, T, 650000, 'QR', 2);
    pay(q3, day(-90), 400000, 'Efectivo', 1); pay(q3, day(-60), 400000, 'Transferencia', 2); pay(q3, day(-31), 300000, 'Transferencia', 3);
    pay(q4, day(-60), 1200000, 'Tarjeta'); pay(q4, T, 100000, 'Efectivo'); pay(q5, day(-2), 250000, 'Efectivo', 1);
    // Historial de ingresos de meses anteriores (para reportes)
    for (let m = 1; m <= 5; m++) for (let k = 0; k < 6; k++) { const pi = Math.floor(rnd() * 8); S.insert('payments', { patientId: pts[pi].id, quoteId: null, date: U.addDays(U.addMonths(T, -m), -Math.floor(rnd() * 25)), amount: pick([150000, 250000, 300000, 400000, 800000, 1200000]), method: pick(['Efectivo', 'Transferencia', 'Tarjeta', 'QR']), note: 'Pago de consulta', receiptNo: `R-${String(S.next('receipt')).padStart(4, '0')}`, demo: true }); }

    // Inventario
    const sup = [S.insert('suppliers', { name: 'Dental Paraguay S.A.', phone: '021 555 100', demo: true }), S.insert('suppliers', { name: 'OdontoInsumos', phone: '0985 222 333', demo: true })];
    [['Resina A2', 'Restauración', '3M Filtek', 0, 'L2306', U.addMonths(T, 8), 2, 5, 185000, 'jeringas'], ['Resina A3', 'Restauración', '3M Filtek', 0, 'L2307', U.addMonths(T, 9), 6, 4, 185000, 'jeringas'], ['Adhesivo universal', 'Restauración', 'Single Bond', 0, 'B114', U.addMonths(T, 5), 3, 2, 320000, 'frascos'],
      ['Anestesia lidocaína 2%', 'Anestesia', 'Lidocaína', 1, 'AN55', day(30), 40, 50, 9500, 'carpules'], ['Guantes de nitrilo M', 'Bioseguridad', 'Nipro', 1, 'G778', U.addMonths(T, 20), 6, 5, 65000, 'cajas'], ['Limas K 25 mm', 'Endodoncia', 'Dentsply', 0, 'K25', U.addMonths(T, 30), 3, 4, 120000, 'paquetes'],
      ['Hipoclorito 2,5%', 'Endodoncia', 'Odontosol', 1, 'H12', day(20), 4, 2, 25000, 'litros'], ['Barbijos tricapa', 'Bioseguridad', 'Medix', 1, 'BX9', U.addMonths(T, 18), 12, 4, 30000, 'cajas'], ['Alginato', 'Impresión', 'Jeltrate', 0, 'AL3', U.addMonths(T, 7), 2, 2, 90000, 'bolsas']]
      .forEach(([name, category, brand, si, lot, expiry, stock, min, cost, unit]) => S.insert('inventory', { name, category, brand, supplierId: sup[si].id, lot, expiry, stock, min, cost, unit, demo: true }));
    const resina = d.inventory.find((i) => i.name === 'Resina A2');
    S.insert('inventoryMoves', { itemId: resina.id, date: day(-30), type: 'entrada', qty: 5, note: 'Compra mensual', demo: true });
    S.insert('inventoryMoves', { itemId: resina.id, date: day(-1), type: 'salida', qty: 3, note: 'Uso en restauraciones', demo: true });

    // Laboratorio
    const labs = [S.insert('labs', { name: 'Laboratorio Dental Norte', phone: '021 444 210', demo: true }), S.insert('labs', { name: 'Prótesis Asunción', phone: '0983 120 455', demo: true })];
    S.insert('labOrders', { patientId: pts[3].id, tooth: '', work: 'Prótesis removible superior', labId: labs[1].id, sentDate: day(-20), dueDate: day(-3), receivedDate: '', cost: 900000, status: 'proceso', demo: true });
    S.insert('labOrders', { patientId: pts[7].id, tooth: '21', work: 'Corona de porcelana', labId: labs[0].id, sentDate: day(-8), dueDate: day(2), receivedDate: '', cost: 650000, status: 'proceso', demo: true });
    S.insert('labOrders', { patientId: pts[4].id, tooth: '', work: 'Placa de descanso', labId: labs[0].id, sentDate: day(-40), dueDate: day(-28), receivedDate: day(-29), cost: 350000, status: 'recibido', demo: true });

    // Periodontograma (dos sesiones para comparar)
    const perio = (date, factor) => { const teeth = {}; [...OS.domain.UPPER, ...OS.domain.LOWER].forEach((t) => { if ([11, 21, 47].includes(t)) return; const base = [16, 26, 36, 46, 17, 27].includes(t) ? 4 : 2; const dd = Array.from({ length: 6 }, () => Math.max(1, Math.round(base + rnd() * 2 * factor))); teeth[t] = { depth: dd, bleeding: dd.map((v) => v >= 4 && rnd() > 0.35), recession: dd.map(() => (rnd() > 0.85 ? 1 : 0)), plaque: rnd() > 0.6, mobility: base > 2 && rnd() > 0.7 ? 1 : 0, furcation: base > 2 && rnd() > 0.75 ? 1 : 0 }; }); return teeth; };
    S.insert('perio', { patientId: pts[4].id, date: day(-120), teeth: perio(day(-120), 1.2), professionalId: profs[0].id, demo: true });
    S.insert('perio', { patientId: pts[4].id, date: day(-60), teeth: perio(day(-60), 0.6), professionalId: profs[0].id, demo: true });

    // Receta y consentimiento
    S.insert('prescriptions', { number: `RX-${String(S.next('rx')).padStart(4, '0')}`, patientId: pts[1].id, professionalId: profs[1].id, date: day(-12), items: [{ drug: 'Ibuprofeno', presentation: 'Comprimidos 400 mg', dose: '1 comprimido', frequency: 'Cada 8 horas', duration: '3 días' }], indications: 'Tomar después de las comidas. Si el dolor persiste, comunicarse con el consultorio.', demo: true });
    const ct = d.consentTemplates.find((c) => c.name === 'Endodoncia');
    S.insert('consents', { number: `C-${String(S.next('consent')).padStart(4, '0')}`, patientId: pts[1].id, templateId: ct.id, name: ct.name, date: day(-12), body: U.fillTemplate(ct.body, { 'Nombre completo': OS.domain.fullName(pts[1]), Consultorio: d.clinic.name }), signed: true, demo: true });

    d.meta.demo = true;
    S.log('Creó', 'meta', null, 'Datos de demostración cargados');
    S.changed('*');
  }

  /** Elimina todo lo marcado como demo (pacientes, citas, cobros, inventario…). */
  function removeDemo() {
    const S = OS.store; const d = S.data;
    const demoPatients = new Set(d.patients.filter((p) => p.demo).map((p) => p.id));
    ['patients', 'appointments', 'clinicalNotes', 'toothRecords', 'perio', 'quotes', 'payments', 'inventory', 'inventoryMoves', 'suppliers', 'labs', 'labOrders', 'documents', 'consents', 'prescriptions'].forEach((col) => {
      d[col] = d[col].filter((x) => !x.demo && !demoPatients.has(x.patientId));
    });
    demoPatients.forEach((id) => delete d.medical[id]);
    d.notifications = [];
    d.meta.demo = false;
    S.log('Eliminó', 'meta', null, 'Datos de demostración eliminados');
    S.changed('*');
  }

  return { base, demo, removeDemo };
})();
