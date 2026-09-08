"use client";
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';
import { useConfirm } from './ConfirmProvider';
import { descargarContratoPDF } from '../utils/pdfGenerator';

const hoy = () => new Date().toISOString().slice(0, 10);

function calcularEstadoVisual(contrato) {
  if (contrato.estado === 'finalizado') return { label: 'Finalizado', tone: 'slate' };
  if (!contrato.fecha_fin) return { label: 'Activo (sin vencimiento)', tone: 'emerald' };

  const fin = new Date(contrato.fecha_fin);
  const diffDias = Math.ceil((fin - new Date(hoy())) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { label: 'Vencido', tone: 'red' };
  if (diffDias <= 30) return { label: `Vence en ${diffDias} días`, tone: 'amber' };
  return { label: 'Activo', tone: 'emerald' };
}

const toneClasses = {
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  red: 'border-red-500/30 bg-red-500/10 text-red-300',
  slate: 'border-slate-600/40 bg-slate-700/20 text-slate-400',
};

export default function Contratos({ casaSeleccionada }) {
  const confirm = useConfirm();
  const [casas, setCasas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [casaFiltro, setCasaFiltro] = useState(casaSeleccionada || 'Todas');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    casa_id: '', inquilino: '', telefono: '', fecha_inicio: hoy(), fecha_fin: '', monto_alquiler: '', observaciones: '', estado: 'activo',
  });

  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [contratoPlantillaId, setContratoPlantillaId] = useState(null);
  const [plantillaData, setPlantillaData] = useState({
    arrendatario_dni: '', arrendatario_domicilio: '', direccion_inmueble: '',
    dia_pago_mensual: '', meses_adelantados: '', monto_adelanto: '', fecha_pago_adelanto: '',
    monto_garantia: '', fecha_pago_garantia: '', duracion_contrato: '', clausulas_adicionales: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (casaSeleccionada) setCasaFiltro(casaSeleccionada);
  }, [casaSeleccionada]);

  async function fetchData() {
    setLoading(true);
    try {
      const [{ data: casasData, error: errCasas }, { data: contratosData, error: errContratos }] = await Promise.all([
        supabase.from('casas').select('id, nombre').order('nombre', { ascending: true }),
        supabase.from('contratos').select('*').order('fecha_inicio', { ascending: false }),
      ]);
      if (errCasas) throw errCasas;
      if (errContratos) throw errContratos;
      setCasas(casasData || []);
      setContratos(contratosData || []);
    } catch (err) {
      console.error('Error cargando contratos:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const casaNombrePorId = useMemo(() => {
    const map = {};
    casas.forEach((c) => { map[c.id] = c.nombre; });
    return map;
  }, [casas]);

  const abrirModalNuevo = () => {
    setEditingId(null);
    const casaPreseleccionada = casas.find((c) => c.nombre === casaSeleccionada);
    setFormData({
      casa_id: casaPreseleccionada?.id || '', inquilino: '', telefono: '', fecha_inicio: hoy(), fecha_fin: '', monto_alquiler: '', observaciones: '', estado: 'activo',
    });
    setShowModal(true);
  };

  const abrirModalEditar = (contrato) => {
    setEditingId(contrato.id);
    setFormData({
      casa_id: contrato.casa_id,
      inquilino: contrato.inquilino || '',
      telefono: contrato.telefono || '',
      fecha_inicio: contrato.fecha_inicio || hoy(),
      fecha_fin: contrato.fecha_fin || '',
      monto_alquiler: contrato.monto_alquiler ?? '',
      observaciones: contrato.observaciones || '',
      estado: contrato.estado || 'activo',
    });
    setShowModal(true);
  };

  const guardarContrato = async (e) => {
    e.preventDefault();
    if (!formData.casa_id) {
      toast.warning('Selecciona un inmueble para el contrato.');
      return;
    }
    const payload = {
      casa_id: formData.casa_id,
      inquilino: formData.inquilino,
      telefono: formData.telefono || null,
      fecha_inicio: formData.fecha_inicio,
      fecha_fin: formData.fecha_fin || null,
      monto_alquiler: formData.monto_alquiler === '' ? null : Number(formData.monto_alquiler),
      observaciones: formData.observaciones || null,
      estado: formData.estado,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('contratos').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('contratos').insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchData();
      toast.success(editingId ? 'Contrato actualizado.' : 'Contrato creado.');
    } catch (err) {
      console.error('Error al guardar contrato:', err.message);
      toast.error('Error al guardar el contrato.');
    }
  };

  const finalizarContrato = async (contrato) => {
    const ok = await confirm({
      title: 'Finalizar contrato',
      message: `¿Finalizar el contrato de ${contrato.inquilino}? Se marcará como finalizado con fecha de hoy.`,
      confirmLabel: 'Finalizar',
      tone: 'default',
    });
    if (!ok) return;
    try {
      const { error } = await supabase
        .from('contratos')
        .update({ estado: 'finalizado', fecha_fin: contrato.fecha_fin || hoy() })
        .eq('id', contrato.id);
      if (error) throw error;
      fetchData();
      toast.success('Contrato finalizado.');
    } catch (err) {
      console.error('Error al finalizar contrato:', err.message);
      toast.error('No se pudo finalizar el contrato.');
    }
  };

  const eliminarContrato = async (id, inquilino) => {
    const ok = await confirm({
      title: 'Eliminar contrato',
      message: `¿Eliminar definitivamente el contrato de ${inquilino}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) throw error;
      fetchData();
      toast.success('Contrato eliminado.');
    } catch (err) {
      console.error('Error al eliminar contrato:', err.message);
      toast.error('No se pudo eliminar el contrato.');
    }
  };

  const abrirModalPlantilla = (contrato) => {
    setContratoPlantillaId(contrato.id);
    setPlantillaData({
      arrendatario_dni: contrato.arrendatario_dni || '',
      arrendatario_domicilio: contrato.arrendatario_domicilio || '',
      direccion_inmueble: contrato.direccion_inmueble || '',
      dia_pago_mensual: contrato.dia_pago_mensual || '',
      meses_adelantados: contrato.meses_adelantados || '',
      monto_adelanto: contrato.monto_adelanto ?? '',
      fecha_pago_adelanto: contrato.fecha_pago_adelanto || '',
      monto_garantia: contrato.monto_garantia ?? '',
      fecha_pago_garantia: contrato.fecha_pago_garantia || '',
      duracion_contrato: contrato.duracion_contrato || '',
      clausulas_adicionales: contrato.clausulas_adicionales || '',
    });
    setShowPlantillaModal(true);
  };

  const guardarYGenerarContrato = async (e) => {
    e.preventDefault();
    const contrato = contratos.find((c) => c.id === contratoPlantillaId);
    if (!contrato) return;

    const payload = {
      arrendatario_dni: plantillaData.arrendatario_dni || null,
      arrendatario_domicilio: plantillaData.arrendatario_domicilio || null,
      direccion_inmueble: plantillaData.direccion_inmueble || null,
      dia_pago_mensual: plantillaData.dia_pago_mensual || null,
      meses_adelantados: plantillaData.meses_adelantados || null,
      monto_adelanto: plantillaData.monto_adelanto === '' ? null : Number(plantillaData.monto_adelanto),
      fecha_pago_adelanto: plantillaData.fecha_pago_adelanto || null,
      monto_garantia: plantillaData.monto_garantia === '' ? null : Number(plantillaData.monto_garantia),
      fecha_pago_garantia: plantillaData.fecha_pago_garantia || null,
      duracion_contrato: plantillaData.duracion_contrato || null,
      clausulas_adicionales: plantillaData.clausulas_adicionales || null,
    };

    try {
      const { error } = await supabase.from('contratos').update(payload).eq('id', contratoPlantillaId);
      if (error) throw error;

      descargarContratoPDF({
        inquilino: contrato.inquilino,
        dni: payload.arrendatario_dni,
        domicilio: payload.arrendatario_domicilio,
        direccionInmueble: payload.direccion_inmueble,
        montoAlquiler: contrato.monto_alquiler,
        diaPago: payload.dia_pago_mensual,
        mesesAdelantados: payload.meses_adelantados,
        montoAdelanto: payload.monto_adelanto,
        fechaPagoAdelanto: payload.fecha_pago_adelanto,
        montoGarantia: payload.monto_garantia,
        fechaPagoGarantia: payload.fecha_pago_garantia,
        duracionMeses: payload.duracion_contrato,
        fechaInicio: contrato.fecha_inicio,
        fechaFin: contrato.fecha_fin,
        clausulasAdicionales: payload.clausulas_adicionales,
      });

      setShowPlantillaModal(false);
      fetchData();
      toast.success('Contrato guardado y PDF generado.');
    } catch (err) {
      console.error('Error al generar contrato:', err.message);
      toast.error('No se pudo generar el contrato.');
    }
  };

  const casasUnicas = ['Todas', ...casas.map((c) => c.nombre)];

  const contratosFiltrados = contratos.filter((c) => {
    const nombreCasa = casaNombrePorId[c.casa_id] || 'Desconocida';
    const pasaCasa = casaFiltro === 'Todas' || nombreCasa === casaFiltro;
    const pasaEstado = estadoFiltro === 'Todos' || c.estado === estadoFiltro;
    return pasaCasa && pasaEstado;
  });

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando contratos...</div>;

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Gestión</p>
          <h2 className="text-2xl font-bold text-white">Contratos de Alquiler</h2>
        </div>
        <button
          onClick={abrirModalNuevo}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          + Nuevo Contrato
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="text-sm whitespace-nowrap text-slate-400">Inmueble:</label>
          <select
            value={casaFiltro}
            onChange={(e) => setCasaFiltro(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 sm:w-auto"
          >
            {casasUnicas.map((casa) => (
              <option key={casa} value={casa}>{casa}</option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <label className="text-sm whitespace-nowrap text-slate-400">Estado:</label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 sm:w-auto"
          >
            <option value="Todos">Todos</option>
            <option value="activo">Activo</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      {contratosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
          No hay contratos para mostrar con estos filtros.
        </div>
      ) : (
        <div className="space-y-4">
          {contratosFiltrados.map((c) => {
            const estadoVisual = calcularEstadoVisual(c);
            return (
              <div key={c.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800/90 p-4 transition hover:border-slate-500 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-blue-400">{c.inquilino}</span>
                    <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                      📍 {casaNombrePorId[c.casa_id] || 'Desconocida'}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${toneClasses[estadoVisual.tone]}`}>
                      {estadoVisual.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>📅 Inicio: <strong className="text-slate-200">{c.fecha_inicio}</strong></span>
                    <span>🏁 Fin: <strong className="text-slate-200">{c.fecha_fin || 'Indefinido'}</strong></span>
                    {c.telefono && <span>📞 {c.telefono}</span>}
                    {c.monto_alquiler != null && <span>💰 S/ {Number(c.monto_alquiler).toFixed(2)} / mes</span>}
                  </div>
                  {c.observaciones && (
                    <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-xs leading-relaxed text-slate-300">
                      {c.observaciones}
                    </p>
                  )}
                </div>

                <div className="flex w-full flex-wrap gap-2 md:w-auto">
                  <button onClick={() => abrirModalEditar(c)} className="flex-1 rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-600 md:flex-none">
                    ✏️ Editar
                  </button>
                  <button onClick={() => abrirModalPlantilla(c)} className="flex-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:bg-blue-500 hover:text-white md:flex-none">
                    📄 Generar Contrato
                  </button>
                  {c.estado === 'activo' && (
                    <button onClick={() => finalizarContrato(c)} className="flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500 hover:text-white md:flex-none">
                      🏁 Finalizar
                    </button>
                  )}
                  <button onClick={() => eliminarContrato(c.id, c.inquilino)} className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500 hover:text-white md:flex-none">
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="my-auto flex max-h-[90vh] w-[min(92vw,40rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/95 shadow-[0_30px_80px_rgba(2,6,23,0.9)] ring-1 ring-white/5">
            <div className="shrink-0 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/90 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-blue-300/80">Contrato</p>
                  <h3 className="text-lg font-bold text-white sm:text-xl">{editingId ? 'Editar Contrato' : 'Nuevo Contrato'}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xl leading-none text-slate-400 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
                  aria-label="Cerrar modal"
                >
                  &times;
                </button>
              </div>
            </div>

              <form onSubmit={guardarContrato} className="space-y-4 overflow-y-auto p-4 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Inmueble *</label>
                  <select
                    required
                    value={formData.casa_id}
                    onChange={(e) => setFormData({ ...formData, casa_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Selecciona un inmueble...</option>
                    {casas.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Inquilino *</label>
                    <input
                      required
                      type="text"
                      value={formData.inquilino}
                      onChange={(e) => setFormData({ ...formData, inquilino: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ej: 999 888 777"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Fecha de Inicio *</label>
                    <input
                      required
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Fecha de Fin</label>
                    <input
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">Déjalo vacío si el contrato es indefinido.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Monto Alquiler (S/)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.monto_alquiler}
                      onChange={(e) => setFormData({ ...formData, monto_alquiler: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="activo">Activo</option>
                      <option value="finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Observaciones</label>
                  <textarea
                    rows="3"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Cláusulas especiales, garantías, etc..."
                  />
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(59,130,246,0.35)] transition hover:brightness-110"
                  >
                    {editingId ? 'Actualizar Contrato' : 'Guardar Contrato'}
                  </button>
                </div>
              </form>
          </div>
        </Modal>
      )}

      {showPlantillaModal && (
        <Modal onClose={() => setShowPlantillaModal(false)}>
          <div className="my-auto flex max-h-[90vh] w-[min(92vw,44rem)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/95 shadow-[0_30px_80px_rgba(2,6,23,0.9)] ring-1 ring-white/5">
            <div className="shrink-0 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/90 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-blue-300/80">Plantilla Legal</p>
                  <h3 className="text-lg font-bold text-white sm:text-xl">📄 Generar Contrato de Arrendamiento</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlantillaModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xl leading-none text-slate-400 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
                  aria-label="Cerrar modal"
                >
                  &times;
                </button>
              </div>
            </div>

            <form onSubmit={guardarYGenerarContrato} className="space-y-4 overflow-y-auto p-4 sm:p-6">
              <p className="rounded-lg border border-blue-700/40 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-200">
                Completa los datos faltantes de la plantilla legal. Los datos de la arrendadora ya están fijos en el contrato. Al guardar se generará el PDF listo para firmar.
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">DNI del Arrendatario</label>
                  <input
                    type="text"
                    value={plantillaData.arrendatario_dni}
                    onChange={(e) => setPlantillaData({ ...plantillaData, arrendatario_dni: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: 45678912"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Domicilio (según DNI)</label>
                  <input
                    type="text"
                    value={plantillaData.arrendatario_domicilio}
                    onChange={(e) => setPlantillaData({ ...plantillaData, arrendatario_domicilio: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: Av. Los Álamos 123, Callao"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Dirección del Inmueble en Alquiler</label>
                <input
                  type="text"
                  value={plantillaData.direccion_inmueble}
                  onChange={(e) => setPlantillaData({ ...plantillaData, direccion_inmueble: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ej: Mz. A Lt. 5, sector..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Día de pago mensual</label>
                  <input
                    type="text"
                    value={plantillaData.dia_pago_mensual}
                    onChange={(e) => setPlantillaData({ ...plantillaData, dia_pago_mensual: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: primeros 5 días"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">N° meses adelantados</label>
                  <input
                    type="text"
                    value={plantillaData.meses_adelantados}
                    onChange={(e) => setPlantillaData({ ...plantillaData, meses_adelantados: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: 2"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Monto adelantado (S/)</label>
                  <input
                    type="number"
                    step="any"
                    value={plantillaData.monto_adelanto}
                    onChange={(e) => setPlantillaData({ ...plantillaData, monto_adelanto: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Fecha de pago del adelanto</label>
                  <input
                    type="date"
                    value={plantillaData.fecha_pago_adelanto}
                    onChange={(e) => setPlantillaData({ ...plantillaData, fecha_pago_adelanto: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Monto de garantía (S/)</label>
                  <input
                    type="number"
                    step="any"
                    value={plantillaData.monto_garantia}
                    onChange={(e) => setPlantillaData({ ...plantillaData, monto_garantia: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Fecha de pago de garantía</label>
                  <input
                    type="date"
                    value={plantillaData.fecha_pago_garantia}
                    onChange={(e) => setPlantillaData({ ...plantillaData, fecha_pago_garantia: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Duración del contrato (cantidad de meses)</label>
                <input
                  type="text"
                  value={plantillaData.duracion_contrato}
                  onChange={(e) => setPlantillaData({ ...plantillaData, duracion_contrato: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ej: 12 meses"
                />
                <p className="mt-1 text-[10px] text-slate-500">Las fechas de inicio y fin se toman del contrato (pestaña principal).</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Cláusulas adicionales (opcional)</label>
                <textarea
                  rows="3"
                  value={plantillaData.clausulas_adicionales}
                  onChange={(e) => setPlantillaData({ ...plantillaData, clausulas_adicionales: e.target.value })}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Condiciones extra que quieras añadir al final del contrato..."
                />
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowPlantillaModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(59,130,246,0.35)] transition hover:brightness-110"
                >
                  💾 Guardar y Generar PDF
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
