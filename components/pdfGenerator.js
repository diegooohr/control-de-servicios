import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const descargarReciboPDF = (registro) => {
  const doc = new jsPDF();
  const casa = registro.casa || 'General';
  const mes = registro.mes_anio || 'Desconocido';

  // 1. Encabezado Personalizado (Caja de color y Título)
  doc.setFillColor(30, 58, 138); // Azul oscuro
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

  // 3. Generar Tabla de Desglose
  const bodyData = [
    ['Luz (kWh)', registro.luz_lectura_ant, registro.luz_lectura_act, registro.luz_consumo, `S/ ${registro.luz_total.toFixed(2)}`],
    ['Agua (m³)', registro.agua_lectura_ant, registro.agua_lectura_act, registro.agua_consumo, `S/ ${registro.agua_total.toFixed(2)}`],
    ['Gas (m³)', registro.gas_lectura_ant, registro.gas_lectura_act, registro.gas_consumo, `S/ ${registro.gas_total.toFixed(2)}`],
  ];

  doc.autoTable({
    startY: 68,
    head: [['Servicio', 'Lectura Ant.', 'Lectura Act.', 'Consumo', 'Subtotal']],
    body: bodyData,
    theme: 'striped',
    headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } }
  });

  // 4. Total Final
  const finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(220, 38, 38); // Color rojo para el total
  doc.text(`TOTAL A PAGAR: S/ ${registro.monto_total_global.toFixed(2)}`, 130, finalY);

  // 5. Pie de página (Cuentas bancarias)
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