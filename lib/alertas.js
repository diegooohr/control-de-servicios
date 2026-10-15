const DIA_MS = 24 * 60 * 60 * 1000;

const hoyLocal = () => {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

export const mesActual = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
};

export function diasHasta(fecha) {
  if (!fecha) return null;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Math.round((new Date(anio, mes - 1, dia) - hoyLocal()) / DIA_MS);
}

function diasParaDiaDePago(diaPago) {
  const dia = Number(diaPago);
  if (!dia || dia < 1 || dia > 31) return null;
  const hoy = hoyLocal();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const vencimiento = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(dia, ultimoDia));
  return Math.round((vencimiento - hoy) / DIA_MS);
}

// Devuelve alertas de vencimiento del contrato y de pago mensual de servicios.
export function alertasContrato(contrato, ultimoRegistro) {
  if (!contrato || contrato.estado !== 'activo') return [];
  const alertas = [];

  const diasContrato = diasHasta(contrato.fecha_fin);
  if (diasContrato !== null && diasContrato <= 60) {
    alertas.push(
      diasContrato < 0
        ? { tone: 'red', texto: `Contrato vencido hace ${Math.abs(diasContrato)} días` }
        : { tone: diasContrato <= 30 ? 'amber' : 'blue', texto: diasContrato === 0 ? 'El contrato vence hoy' : `Contrato vence en ${diasContrato} días` }
    );
  }

  const serviciosAlDia = ultimoRegistro?.mes_anio === mesActual();
  const diasPago = diasParaDiaDePago(contrato.dia_pago_mensual);
  if (!serviciosAlDia && diasPago !== null && diasPago <= 5) {
    alertas.push(
      diasPago < 0
        ? { tone: 'red', texto: `Pago de servicios vencido hace ${Math.abs(diasPago)} días` }
        : { tone: 'amber', texto: diasPago === 0 ? 'Hoy vence el pago de servicios' : `Pago de servicios vence en ${diasPago} días` }
    );
  }

  return alertas;
}

export const alertaClases = {
  red: 'border-red-500/40 bg-red-500/10 text-red-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  blue: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
};
