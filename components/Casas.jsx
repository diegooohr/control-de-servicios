"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Casas({ setActiveTab, setCasaSeleccionada }) {
  const [inmuebles, setInmuebles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para la ventana emergente (Modal)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '', inquilino: '', telefono: '', direccion: '', observaciones: ''
  });

  useEffect(() => {
    fetchCasas();
  }, []);

  async function fetchCasas() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('casas').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setInmuebles(data || []);
    } catch (err) {
      console.error('Error al cargar casas:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const abrirModalNuevo = () => {
    setEditingId(null);
    setFormData({ nombre: '', inquilino: '', telefono: '', direccion: '', observaciones: '' });
    setShowModal(true);
  };

  const abrirModalEditar = (casa) => {
    setEditingId(casa.id);
    setFormData({ 
      nombre: casa.nombre, inquilino: casa.inquilino || '', 
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
          {inmuebles.map((casa) => (
            <div
              key={casa.id}
              className="group flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/90 shadow-[0_16px_35px_rgba(2,6,23,0.28)] transition duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-[0_22px_45px_rgba(37,99,235,0.12)]"
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
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="space-y-3 text-sm text-slate-300">
                  <p><span className="text-slate-500">Inquilino:</span> {casa.inquilino || 'Vacío'}</p>
                  <p><span className="text-slate-500">Teléfono:</span> {casa.telefono || 'N/A'}</p>
                  <p><span className="text-slate-500">Dirección:</span> {casa.direccion || 'N/A'}</p>

                  {casa.observaciones && (
                    <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-slate-500">Observaciones</span>
                      <p className="text-xs leading-relaxed text-slate-300">{casa.observaciones}</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setCasaSeleccionada(casa.nombre);
                  setActiveTab('registro');
                }}
                className="mt-auto flex items-center justify-center gap-2 bg-slate-700/60 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-blue-600 hover:text-white"
              >
                Registrar Lecturas <span aria-hidden="true">→</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/75 p-3 backdrop-blur-sm sm:p-5">
          <div className="mx-auto flex min-h-full items-center justify-center">
            <div className="w-[min(92vw,40rem)] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/95 shadow-[0_30px_80px_rgba(2,6,23,0.9)] ring-1 ring-white/5">
              <div className="border-b border-slate-700/80 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/90 px-4 py-3 sm:px-5">
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

              <div>
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Nombre del Inquilino</label>
                    <input
                      type="text"
                      value={formData.inquilino}
                      onChange={e => setFormData({ ...formData, inquilino: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Teléfono</label>
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Ej: 999 888 777"
                    />
                  </div>
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
          </div>
        </div>
      )}
    </div>
  );
}