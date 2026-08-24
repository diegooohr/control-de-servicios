import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const descargarReciboPDF = (registro) => {
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