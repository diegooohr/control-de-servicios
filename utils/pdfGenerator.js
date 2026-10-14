import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => `S/ ${Number(n || 0).toFixed(2)}`;

const parseCargos = (cargos) => {
  if (!cargos) return [];
  const lista = typeof cargos === 'string' ? JSON.parse(cargos) : cargos;
  return lista.filter((c) => c.nombre && c.monto !== '' && c.monto != null);
};

export const descargarReciboPDF = (registro, contrato) => {
  const doc = new jsPDF();
  const W = 210;
  const casa = registro.casa || 'General';
  const mes = registro.mes_anio || 'Desconocido';
  const NAVY = [15, 23, 42];
  const TEAL = [20, 184, 166];
  const SLATE = [100, 116, 139];

  // Encabezado con banda oscura y acento diagonal
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 46, 'F');
  doc.setFillColor(...TEAL);
  doc.triangle(W - 70, 0, W, 0, W, 46, 'F');
  doc.setFillColor(13, 148, 136);
  doc.triangle(W - 38, 0, W, 0, W, 46, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('RECIBO', 14, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text('CONTROL DE SERVICIOS · GESTIÓN DE INMUEBLES', 14, 31);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(mes, W - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emitido: ${new Date().toLocaleDateString()}`, W - 14, 25, { align: 'right' });

  // Tarjetas de inmueble e inquilino
  const tarjeta = (x, w, etiqueta, linea1, linea2) => {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, 54, w, 24, 3, 3, 'F');
    doc.setFillColor(...TEAL);
    doc.roundedRect(x, 54, 2, 24, 1, 1, 'F');
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(etiqueta, x + 7, 61);
    doc.setTextColor(...NAVY);
    doc.setFontSize(12);
    doc.text(String(linea1), x + 7, 68, { maxWidth: w - 12 });
    if (linea2) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SLATE);
      doc.text(String(linea2), x + 7, 74, { maxWidth: w - 12 });
    }
  };
  if (contrato) {
    tarjeta(14, 88, 'INMUEBLE', casa);
    tarjeta(108, 88, 'INQUILINO', contrato.inquilino, contrato.telefono ? `Tel. ${contrato.telefono}` : '');
  } else {
    tarjeta(14, 182, 'INMUEBLE', casa);
  }

  // Detalle por servicio
  const servicios = [
    { nombre: 'Luz', unidad: 'kWh', color: [245, 158, 11], ant: registro.luz_lectura_ant, act: registro.luz_lectura_act, consumo: registro.luz_consumo, total: registro.luz_total, cargos: parseCargos(registro.cargos_luz), lecturas: true },
    { nombre: 'Agua', unidad: 'm³', color: [59, 130, 246], ant: registro.agua_lectura_ant, act: registro.agua_lectura_act, consumo: registro.agua_consumo, total: registro.agua_total, cargos: parseCargos(registro.cargos_agua), lecturas: true },
    { nombre: 'Gas', unidad: '', color: [249, 115, 22], total: registro.gas_total, cargos: parseCargos(registro.cargos_gas), lecturas: false },
  ];

  let y = 88;
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DETALLE DE SERVICIOS', 14, y);
  y += 5;

  servicios.forEach((s) => {
    const alto = 20 + s.cargos.length * 6;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, y, 182, alto, 3, 3, 'FD');
    doc.setFillColor(...s.color);
    doc.roundedRect(14, y, 4, alto, 2, 2, 'F');

    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(s.nombre, 24, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(
      s.lecturas
        ? `Lectura ${s.ant} → ${s.act}  ·  Consumo: ${s.consumo} ${s.unidad}`
        : 'Según recibo del suministro (Calidda)',
      24, y + 15
    );
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(fmt(s.total), 190, y + 9, { align: 'right' });

    s.cargos.forEach((c, i) => {
      const cy = y + 21 + i * 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...SLATE);
      doc.text(`+ ${c.nombre}`, 28, cy);
      doc.text(fmt(c.monto), 190, cy, { align: 'right' });
    });
    y += alto + 5;
  });

  // Total destacado
  y += 3;
  doc.setFillColor(...NAVY);
  doc.roundedRect(14, y, 182, 26, 4, 4, 'F');
  doc.setFillColor(...TEAL);
  doc.roundedRect(14, y, 4, 26, 2, 2, 'F');
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL A PAGAR', 26, y + 10);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text(fmt(registro.monto_total_global), 190, y + 17, { align: 'right' });
  y += 36;

  // Datos de pago
  doc.setFillColor(250, 245, 255);
  doc.setDrawColor(216, 180, 254);
  doc.roundedRect(14, y, 182, 30, 3, 3, 'FD');
  doc.setFillColor(116, 34, 132);
  doc.circle(28, y + 15, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Y', 28, y + 18.5, { align: 'center' });
  doc.setTextColor(116, 34, 132);
  doc.setFontSize(8);
  doc.text('PAGA CON YAPE', 42, y + 9);
  doc.setTextColor(...NAVY);
  doc.setFontSize(14);
  doc.text('+51 969 368 759', 42, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text('A nombre de Yda Violeta Mestanza Montoya', 42, y + 24);

  // Pie
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text('Envía tu comprobante una vez realizado el pago. ¡Gracias!', W / 2, 287, { align: 'center' });

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
