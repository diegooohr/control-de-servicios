"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { descargarReciboPDF } from '../utils/pdfGenerator'; 

export default function HistorialServicios() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [casaFiltro, setCasaFiltro] = useState('Todas');

  useEffect(() => {
    async function fetchHistorial() {
      try {
        const { data, error } = await supabase
          .from('registros_servicios')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRegistros(data || []);
      } catch (err) {
        console.error('Error cargando historial:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchHistorial();
  }, []);

  const casasUnicas = Array.from(new Set(['Todas', ...registros.map(r => r.casa || 'General')]));

  const eliminarRegistro = async (id, mes, casa) => {
    const confirmado = window.confirm(`¿Deseas eliminar el registro de ${casa || 'General'} para ${mes}?`);
    if (!confirmado) return;

    try {
      const { error } = await supabase.from('registros_servicios').delete().eq('id', id);
      if (error) throw error;

      setRegistros((prev) => prev.filter((registro) => registro.id !== id));
    } catch (err) {
      console.error('Error al eliminar registro:', err.message);
      alert('No se pudo eliminar el registro.');
    }
  };

  const registrosFiltrados = casaFiltro === 'Todas' 
    ? registros 
    : registros.filter(r => (r.casa || 'General') === casaFiltro);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando historial...</div>;

  return (
    <div className="mx-auto w-full max-w-5xl overflow-hidden pb-12">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-4 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Registros</p>
            <h2 className="text-xl font-bold text-white sm:text-2xl">Historial de Consumos</h2>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <label className="text-sm whitespace-nowrap text-slate-400">Inmueble:</label>
            <select
              value={casaFiltro}
              onChange={(e) => setCasaFiltro(e.target.value)}
              className="w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 sm:w-auto"
            >
              {casasUnicas.map(casa => (
                <option key={casa} value={casa}>{casa}</option>
              ))}
            </select>
          </div>
        </div>

        {registrosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400 sm:p-10">
            No hay registros para mostrar en esta categoría.
          </div>
        ) : (
          <div className="space-y-4">
            {registrosFiltrados.map((reg) => (
              <div key={reg.id} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-500 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-blue-400">{reg.mes_anio}</span>
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                      📍 {reg.casa || 'General'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400 sm:gap-3">
                    <span className="break-words">⚡ Luz: S/ {reg.luz_total?.toFixed(2)}</span>
                    <span className="break-words">💧 Agua: S/ {reg.agua_total?.toFixed(2)}</span>
                    <span className="break-words">🔥 Gas: S/ {reg.gas_total?.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex w-full min-w-0 flex-col gap-3 md:w-auto md:flex-row md:items-center">
                  <div className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-left md:w-auto md:text-right">
                    <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">Total Global</span>
                    <span className="block text-lg font-black text-emerald-400 sm:text-xl">S/ {reg.monto_total_global?.toFixed(2)}</span>
                  </div>
                  <div className="flex w-full flex-wrap gap-2 md:w-auto">
                    <button
                      onClick={() => descargarReciboPDF(reg)}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-500 sm:flex-none"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => eliminarRegistro(reg.id, reg.mes_anio, reg.casa)}
                      className="flex-1 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500 hover:text-white sm:flex-none"
                    >
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}