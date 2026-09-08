import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const descargarReciboPDF = (registro, contrato) => {
  const doc = new jsPDF();
  const casa = registro.casa || 'General';
  const mes = registro.mes_anio || 'Desconocido';

  // 1. Encabezado Personalizado
  doc.setFillColor(30, 58, 138); 
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CONTROL DE SERVICIOS", 14, 17);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gestión de Inmuebles", 150, 15);

  // 2. Datos del Recibo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE PAGO", 14, 40);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Inmueble: ${casa}`, 14, 48);
  doc.text(`Mes de Facturación: ${mes}`, 14, 54);
  doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 60);

  // 2b. Datos del inquilino (si hay un contrato vigente registrado para esta casa)
  if (contrato) {
    doc.setFont("helvetica", "bold");
    doc.text(`Inquilino: ${contrato.inquilino}`, 120, 48);
    doc.setFont("helvetica", "normal");
    if (contrato.telefono) doc.text(`Teléfono: ${contrato.telefono}`, 120, 54);
  }

  // 3. Generar Tabla Principal
  const bodyData = [
    ['Luz (kWh)', registro.luz_lectura_ant, registro.luz_lectura_act, registro.luz_consumo, `S/ ${registro.luz_total?.toFixed(2)}`],
    ['Agua (m³)', registro.agua_lectura_ant, registro.agua_lectura_act, registro.agua_consumo, `S/ ${registro.agua_total?.toFixed(2)}`],
    ['Gas (m³)', registro.gas_lectura_ant, registro.gas_lectura_act, registro.gas_consumo, `S/ ${registro.gas_total?.toFixed(2)}`],
  ];

  autoTable(doc, {
    startY: 68,
    head: [['Servicio', 'Lectura Ant.', 'Lectura Act.', 'Consumo', 'Subtotal']],
    body: bodyData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } }
  });

  // 4. NUEVO: Tabla de Desglose de Cargos Adicionales
  const cargosAdicionales = [];

  const procesarCargos = (cargos, servicio) => {
    if (!cargos) return;
    // Si viene de la base de datos o del estado local, aseguramos que sea un arreglo
    const lista = typeof cargos === 'string' ? JSON.parse(cargos) : cargos;
    lista.forEach(cargo => {
      if (cargo.nombre && cargo.monto) {
        cargosAdicionales.push([servicio, cargo.nombre, `S/ ${Number(cargo.monto).toFixed(2)}`]);
      }
    });
  };

  procesarCargos(registro.cargos_luz, 'Luz');
  procesarCargos(registro.cargos_agua, 'Agua');
  procesarCargos(registro.cargos_gas, 'Gas');

  if (cargosAdicionales.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Servicio', 'Detalle de Cargo Adicional', 'Monto Extra']],
      body: cargosAdicionales,
      theme: 'plain',
      headStyles: { fillColor: [226, 232, 240], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 2: { fontStyle: 'bold', halign: 'right' } }
    });
  }

  // 5. Total Final Dinámico (se empuja hacia abajo si hay tabla de cargos)
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38); 
  doc.text(`TOTAL A PAGAR: S/ ${registro.monto_total_global?.toFixed(2)}`, 130, finalY);

  // 6. Pie de página sin datos ficticios
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS PARA EL PAGO:", 14, finalY + 15);
  doc.setFont("helvetica", "normal");
  doc.text("Banco: por definir", 14, finalY + 22);
  doc.text("Referencia / Yape: por definir", 14, finalY + 28);
  doc.text("Enviar comprobante una vez realizado el pago.", 14, finalY + 36);

  doc.save(`Recibo_${casa.replace(/\s+/g, '_')}_${mes}.pdf`);
};

// ===================== GENERADOR DE CONTRATO DE ARRENDAMIENTO =====================

const formatearFecha = (f) => {
  if (!f) return '_______________';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
};

const soles = (n) => (n === null || n === undefined || n === '' ? '_______________' : `S/ ${Number(n).toFixed(2)}`);

// Datos fijos de la arrendadora, tal como figuran en la plantilla legal original.
const ARRENDADORA = {
  nombre: 'YDA VIOLETA MESTANZA MONTOYA',
  dni: '20538540',
  domicilio: 'Joaquín Olmedo 262 Cercado de Lima',
  cuentaBcp: '1922 2559 0501 090',
};

export const generarClausulasContrato = (datos) => {
  const {
    inquilino, dni, domicilio, direccionInmueble,
    montoAlquiler, diaPago, mesesAdelantados, montoAdelanto, fechaPagoAdelanto,
    montoGarantia, fechaPagoGarantia,
    duracionMeses, fechaInicio, fechaFin,
    clausulasAdicionales,
  } = datos;

  const parrafos = [
    { titulo: 'CONTRATO DE ARRENDAMIENTO', texto: '', esTitulo: true },
    {
      texto: `Conste por el presente contrato privado que celebran de una parte como LA ARRENDADORA la señora ${ARRENDADORA.nombre}, identificada con DNI N° ${ARRENDADORA.dni}, con domicilio en la calle ${ARRENDADORA.domicilio}; y de la otra parte como EL ARRENDATARIO, el señor(a) ${inquilino || '_______________'}, identificado con DNI N° ${dni || '_______________'}, con domicilio en ${domicilio || '_______________'}, quienes convienen de mutuo acuerdo y regulado por las leyes vigentes sobre la materia, en los términos y condiciones siguientes:`,
    },
    {
      texto: `PRIMERO.- LA ARRENDADORA es propietaria del inmueble ubicado en ${direccionInmueble || '_______________'}, Pachacútec - Ventanilla - Callao, del departamento de Lima, cuya área, linderos y medidas perimétricas se hallan consignadas en el referido documento registral.`,
    },
    {
      texto: 'SEGUNDO.- LA ARRENDADORA deja constancia que el inmueble al que se refiere la cláusula anterior se encuentra desocupado, en perfecto estado para ser ocupado de inmediato.',
    },
    {
      texto: 'TERCERO.- Mediante el presente contrato LA ARRENDADORA da en alquiler al ARRENDATARIO, el inmueble descrito en la cláusula primera para destinarlo únicamente a vivienda, el cual es recibido en perfecto estado de operatividad, conforme a lo señalado en la cláusula segunda. Por su parte, el ARRENDATARIO se obliga a pagar a LA ARRENDADORA el monto de la renta pactada convenida mutuamente.',
    },
    {
      texto: `CUARTO.- Las partes acuerdan que el monto de la renta que pagará EL ARRENDATARIO, en calidad de alquiler del inmueble, será de ${soles(montoAlquiler)} por mes, el cual debe ser depositado en la cuenta de LA ARRENDADORA los días ${diaPago || '___'} de cada mes; así mismo se acuerda que se abonará ${soles(montoAdelanto)} en calidad de ${mesesAdelantados || '___'} meses adelantados, los cuales fueron cancelados el ${formatearFecha(fechaPagoAdelanto)}. Se abona ${soles(montoGarantia)} en calidad de garantía, el cual es abonado el ${formatearFecha(fechaPagoGarantia)}. Se hace constar que la garantía está exceptuada de interés y rentas; el mismo que será devuelto una vez que venza el presente contrato y de encontrarse la casa en perfecto estado, tal y como lo recibe EL ARRENDATARIO.`,
    },
    {
      texto: `QUINTO.- Los montos del alquiler deben ser abonados por EL ARRENDATARIO en la cuenta N° ${ARRENDADORA.cuentaBcp} del Banco de Crédito del Perú (BCP) a nombre de la señora ${ARRENDADORA.nombre}, de manera puntual.`,
    },
    {
      texto: `SEXTO.- El plazo del presente contrato es de ${duracionMeses || '___'} meses, el cual regirá a partir del ${formatearFecha(fechaInicio)} hasta el ${formatearFecha(fechaFin)}, podrá renovarse según acuerdo de ambas partes, pudiendo variar las condiciones establecidas en el presente contrato, en cuanto al plazo, monto de la renta y uso del bien.`,
    },
    {
      texto: 'SÉPTIMO.- LA ARRENDADORA se obliga a entregar el bien objeto de la prestación a su cargo en la fecha establecida en el presente contrato, la misma que se verificará con la entrega de las llaves.',
    },
    {
      texto: 'OCTAVO.- Asimismo, EL ARRENDATARIO está obligado a pagar puntualmente el importe de todos los servicios públicos, tales como agua, energía eléctrica, gas y otros suministros que sean en beneficio del ARRENDATARIO.',
    },
    {
      texto: 'NOVENO.- EL ARRENDATARIO está obligado a permitir la inspección del bien arrendado por parte de LA ARRENDADORA, para cuyo efecto ésta deberá cursar previo aviso por escrito, con una anticipación no menor de dos días. Queda convenido que forma parte de la inspección del bien arrendado, la exhibición de los recibos debidamente cancelados correspondientes a los servicios que se refiere en la cláusula octava.',
    },
    {
      texto: 'DÉCIMO.- EL ARRENDATARIO está obligado a efectuar por cuenta y caso propio las reparaciones y mantenimientos que sean necesarios para conservar el bien en el mismo estado en que fue recibido.',
    },
    {
      texto: 'DÉCIMO PRIMERO.- EL ARRENDATARIO queda prohibido de ejecutar mejoras, cambios o modificaciones internas y externas en el bien arrendado, sin el consentimiento expreso y por escrito de LA ARRENDADORA. Todas las mejoras, inclusive las de recreo, serán de beneficio de LA ARRENDADORA, sin obligación de pago alguno.',
    },
    {
      texto: 'DÉCIMO SEGUNDO.- EL ARRENDATARIO no podrá ceder a terceros el bien materia del presente contrato bajo ningún título, ni subarrendarlo, total o parcialmente, ni ceder su posición contractual, salvo que cuente con el consentimiento expreso y por escrito de LA ARRENDADORA, en cuyo caso se suscribirán los documentos que fueren necesarios.',
    },
    {
      texto: 'DÉCIMO TERCERO.- EL ARRENDATARIO se obliga a desocupar el bien arrendado en la fecha de vencimiento del plazo estipulado en la cláusula sexta de este contrato, salvo renovación del mismo que será informado a LA ARRENDADORA con una anticipación de treinta días.',
    },
    { texto: 'CLÁUSULA PENAL:', esSubtitulo: true },
    {
      texto: 'DÉCIMO CUARTO.- En caso de incumplimiento de lo estipulado en la cláusula sexta, EL ARRENDATARIO deberá pagar en calidad de penalidad compensatoria un importe ascendente a S/ 35.00 (TREINTA Y CINCO Y 00/100 SOLES), por cada día de demora en la entrega del bien.',
    },
    { texto: 'CLÁUSULA DE ALLANAMIENTO:', esSubtitulo: true },
    {
      texto: 'DÉCIMO QUINTO.- EL ARRENDATARIO, en caso de incurrir en más de dos meses y quince días de incumplimiento en el pago de la renta convenida o de haberse concluido el plazo del contrato, deberá desocupar y restituir inmediatamente el bien a LA ARRENDADORA, de conformidad con el artículo 594 y 692-A del Código Procesal Civil. Conforme a la Ley 30201, tal como lo establece la Primera Disposición Transitoria de la acotada Ley.',
    },
  ];

  if (clausulasAdicionales && clausulasAdicionales.trim()) {
    parrafos.push({ texto: 'CLÁUSULAS ADICIONALES:', esSubtitulo: true });
    parrafos.push({ texto: clausulasAdicionales.trim() });
  }

  return parrafos;
};

export const descargarContratoPDF = (datos) => {
  const doc = new jsPDF();
  const marginX = 18;
  const maxWidth = 210 - marginX * 2;
  let y = 20;
  const pageHeight = 297;
  const bottomLimit = 275;

  const parrafos = generarClausulasContrato(datos);

  const nuevaPagina = () => {
    doc.addPage();
    y = 20;
  };

  parrafos.forEach((p) => {
    if (p.esTitulo) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(p.titulo, 105, y, { align: 'center' });
      y += 10;
      return;
    }

    doc.setFont('helvetica', p.esSubtitulo ? 'bold' : 'normal');
    doc.setFontSize(11);
    const lineas = doc.splitTextToSize(p.texto, maxWidth);
    const alturaBloque = lineas.length * 5.4 + 4;

    if (y + alturaBloque > bottomLimit) nuevaPagina();

    doc.text(lineas, marginX, y);
    y += alturaBloque;
  });

  // Firmas al final
  if (y + 40 > bottomLimit) nuevaPagina();
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('_____________________________', marginX, y);
  doc.text('_____________________________', 120, y);
  y += 6;
  doc.text('LA ARRENDADORA', marginX, y);
  doc.text('EL ARRENDATARIO', 120, y);
  y += 5;
  doc.text(`${ARRENDADORA.nombre}`, marginX, y);
  doc.text(`${datos.inquilino || ''}`, 120, y);
  y += 5;
  doc.text(`DNI: ${ARRENDADORA.dni}`, marginX, y);
  doc.text(`DNI: ${datos.dni || ''}`, 120, y);

  const nombreArchivo = `Contrato_${(datos.inquilino || 'inquilino').replace(/\s+/g, '_')}.pdf`;
  doc.save(nombreArchivo);
};