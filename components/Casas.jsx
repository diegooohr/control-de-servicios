"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';

const hoy = () => new Date().toISOString().slice(0, 10);

function diasHasta(fecha) {
  if (!fecha) return null;
  const diff = new Date(fecha) - new Date(hoy());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Casas({ setActiveTab, setCasaSeleccionada }) {
  const [inmuebles, setInmuebles] = useState([]);
  const [contratosPorCasa, setContratosPorCasa] = useState({});
  const [ultimoRegistroPorCasa, setUltimoRegistroPorCasa] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Estados para la ventana emergente (Modal)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', telefono: '', direccion: '', observaciones: ''
  });

  useEffect(() => {
    fetchCasas();
  }, []);

  async function fetchCasas() {
    setLoading(true);
    try {
      const [{ data: casasData, error: errCasas }, { data: contratosData, error: errContratos }, { data: registrosData, error: errRegistros }] = await Promise.all([
        supabase.from('casas').select('*').order('created_at', { ascending: true }),
        supabase.from('contratos').select('*').order('fecha_inicio', { ascending: false }),
        supabase.from('registros_servicios').select('*').order('created_at', { ascending: false }),
      ]);
      if (errCasas) throw errCasas;
      if (errContratos) throw errContratos;
      if (errRegistros) throw errRegistros;

      setInmuebles(casasData || []);

      // Para cada casa, guarda el contrato activo más reciente (o el más reciente en general si no hay activo)
      const mapaContratos = {};
      (contratosData || []).forEach((c) => {
        const actual = mapaContratos[c.casa_id];
        if (!actual) {
          mapaContratos[c.casa_id] = c;
        } else if (c.estado === 'activo' && actual.estado !== 'activo') {
          mapaContratos[c.casa_id] = c;
        }
      });
      setContratosPorCasa(mapaContratos);

      // Para cada casa, guarda el último registro de servicios (ya vienen ordenados por más reciente)
      const mapaRegistros = {};
      (registrosData || []).forEach((r) => {
        if (!mapaRegistros[r.casa]) mapaRegistros[r.casa] = r;
      });
      setUltimoRegistroPorCasa(mapaRegistros);
    } catch (err) {
      console.error('Error al cargar casas:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const abrirModalNuevo = () => {
    setEditingId(null);
    setFormData({ nombre: '', telefono: '', direccion: '', observaciones: '' });
    setShowModal(true);
  };

  const abrirModalEditar = (casa) => {
    setEditingId(casa.id);
    setFormData({
      nombre: casa.nombre,
      telefono: casa.telefono || '', direccion: casa.direccion || '', observaciones: casa.observaciones || ''
    });
    setShowModal(true);
  };

  const guardarCasa = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Actualizar
        const { error } = await supabase.from('casas').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase.from('casas').insert([formData]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchCasas();
    } catch (err) {
      console.error('Error al guardar:', err.message);
      alert('Error al guardar la propiedad.');
    }
  };

  const eliminarCasa = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${nombre}"?`)) {
      try {
        const { error } = await supabase.from('casas').delete().eq('id', id);
        if (error) throw error;
        fetchCasas();
      } catch (err) {
        console.error('Error al eliminar:', err.message);
      }
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Panel</p>
          <h2 className="text-2xl font-bold text-white">Directorio de Inmuebles</h2>
        </div>

        <button
          onClick={abrirModalNuevo}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500"
        >
          + Agregar Inmueble
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-10 text-center text-slate-400">
          Cargando propiedades...
        </div>
      ) : inmuebles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/80 p-8 text-center shadow-lg shadow-slate-950/20">
          <p className="mb-4 text-slate-300">No tienes ningún inmueble registrado aún.</p>
          <button onClick={abrirModalNuevo} className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500">Crear el primero</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {inmuebles.map((casa) => {
            const contrato = contratosPorCasa[casa.id];
            const ocupada = contrato && contrato.estado === 'activo';
            const ultimoRegistro = ultimoRegistroPorCasa[casa.nombre];
            const expandido = expandedId === casa.id;
            const diasRestantes = contrato?.fecha_fin ? diasHasta(contrato.fecha_fin) : null;

            return (
              <div
                key={casa.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/90 shadow-[0_16px_35px_rgba(2,6,23,0.28)] transition duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_22px_45px_rgba(37,99,235,0.12)]"
              >
                <div className="border-b border-slate-700 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-blue-400">
                      <span className="text-xl">🏠</span>
                      {casa.nombre}
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => abrirModalEditar(casa)} className="rounded-md bg-slate-700/70 p-1.5 text-xs text-slate-300 transition hover:bg-amber-500/20 hover:text-amber-300" title="Editar">✏️</button>
                      <button onClick={() => eliminarCasa(casa.id, casa.nombre)} className="rounded-md bg-slate-700/70 p-1.5 text-xs text-slate-300 transition hover:bg-red-500/20 hover:text-red-300" title="Eliminar">🗑️</button>
                    </div>
                  </div>
                  <span className={`mt-2 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${ocupada ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-600/40 bg-slate-700/20 text-slate-400'}`}>
                    {ocupada ? '● Ocupada' : '○ Vacía'}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  {/* Inquilino / Contrato vigente */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-slate-500">Inquilino Actual</span>
                    {contrato ? (
                      <>
                        <p className="text-sm font-semibold text-white">{contrato.inquilino}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                          <span>📅 {contrato.fecha_inicio} → {contrato.fecha_fin || 'Indefinido'}</span>
                          {contrato.telefono && <span>📞 {contrato.telefono}</span>}
                        </div>
                        {diasRestantes !== null && diasRestantes <= 30 && (
                          <span className={`mt-1.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${diasRestantes < 0 ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                            {diasRestantes < 0 ? `⚠️ Vencido hace ${Math.abs(diasRestantes)}d` : `⚠️ Vence en ${diasRestantes}d`}
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Sin contrato registrado</p>
                    )}
                  </div>

                  {/* Último control de servicios */}
                  <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-slate-500">Último Control de Servicios</span>
                    {ultimoRegistro ? (
                      <>
                        <p className="text-sm font-semibold text-white">{ultimoRegistro.mes_anio}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Total: <span className="font-semibold text-emerald-400">S/ {ultimoRegistro.monto_total_global?.toFixed(2)}</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">Sin registros aún</p>
                    )}
                  </div>

                  {/* Detalle expandible: dirección + observaciones */}
                  {expandido && (
                    <div className="space-y-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
                      <p><span className="text-slate-500">Dirección:</span> {casa.direccion || 'N/A'}</p>
                      {casa.observaciones && (
                        <div>
                          <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-slate-500">Observaciones</span>
                          <p className="leading-relaxed">{casa.observaciones}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setExpandedId(expandido ? null : casa.id)}
                    className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition hover:text-slate-300"
                  >
                    {expandido ? '▲ Ver menos' : '▼ Ver dirección y observaciones'}
                  </button>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-px bg-slate-700">
                  <button
                    onClick={() => {
                      setCasaSeleccionada(casa.nombre);
                      setActiveTab('contratos');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:bg-indigo-600 hover:text-white"
                  >
                    📄 Contrato
                  </button>
                  <button
                    onClick={() => {
                      setCasaSeleccionada(casa.nombre);
                      setActiveTab('registro');
                    }}
                    className="flex items-center justify-center gap-1.5 bg-slate-800 px-3 py-3 text-xs font-semibold text-slate-200 transition hover:bg-blue-600 hover:text-white"
                  >
                    Registrar <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="my-auto w-[min(92vw,40rem)] max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/95 shadow-[0_30px_80px_rgba(2,6,23,0.9)] ring-1 ring-white/5 flex flex-col">
            <div className="shrink-0 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/90 px-4 py-3 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-blue-300/80">Inmueble</p>
                  <h3 className="text-lg font-bold text-white sm:text-xl">{editingId ? 'Editar Inmueble' : 'Nuevo Inmueble'}</h3>
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

            <div className="overflow-y-auto">
              <form onSubmit={guardarCasa} className="space-y-4 p-4 sm:p-6">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Nombre del Inmueble *</label>
                  <input
                    required
                    type="text"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: Casa 1, Departamento A..."
                  />
                </div>

                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-relaxed text-blue-200">
                  ℹ️ El inquilino, teléfono y fechas de contrato ahora se gestionan desde la sección <strong>Contratos</strong>.
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Dirección exacta</label>
                  <input
                    type="text"
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: Av. Principal 123..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Observaciones</label>
                  <textarea
                    rows="3"
                    value={formData.observaciones}
                    onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="El medidor tiene la tapa suelta..."
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
                    {editingId ? 'Actualizar Datos' : 'Guardar Inmueble'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}