"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Estadisticas() {
  const [registrosGlobales, setRegistrosGlobales] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [casaFiltro, setCasaFiltro] = useState('Todas');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('registros_servicios').select('*');
        if (error) throw error;
        setRegistrosGlobales(data || []);
      } catch (err) {
        console.error('Error cargando estadísticas:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const casasUnicas = Array.from(new Set(['Todas', ...registrosGlobales.map(r => r.casa || 'General')]));

  useEffect(() => {
    const dataFiltrada = casaFiltro === 'Todas' 
      ? registrosGlobales 
      : registrosGlobales.filter(r => (r.casa || 'General') === casaFiltro);

    if (dataFiltrada.length === 0) {
      setStats(null);
      return;
    }

    let maxTotal = dataFiltrada[0];
    let sumTotal = 0;

    dataFiltrada.forEach(item => {
      if ((item.monto_total_global || 0) > (maxTotal.monto_total_global || 0)) maxTotal = item;
      sumTotal += item.monto_total_global || 0;
    });

    setStats({
      maxTotal,
      promedioTotal: (sumTotal / dataFiltrada.length).toFixed(2),
      cantidadRegistros: dataFiltrada.length
    });
  }, [casaFiltro, registrosGlobales]);

  if (loading) return <div className="text-center py-12 text-slate-400">Calculando estadísticas...</div>;

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">Reporte</p>
            <h2 className="text-2xl font-bold text-white">Análisis de Consumo</h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Inmueble:</label>
            <select
              value={casaFiltro}
              onChange={(e) => setCasaFiltro(e.target.value)}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25"
            >
              {casasUnicas.map(casa => (
                <option key={casa} value={casa}>{casa}</option>
              ))}
            </select>
          </div>
        </div>

        {!stats ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center text-slate-400">
            Faltan datos para generar estadísticas de este inmueble.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-6 shadow-lg shadow-emerald-900/10">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-emerald-400">🏆 Mes más Costoso</h3>
              <p className="text-xl font-bold text-white">{stats.maxTotal.mes_anio}</p>
              <p className="mt-3 text-3xl font-black text-emerald-400">S/ {stats.maxTotal.monto_total_global?.toFixed(2)}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">Inmueble: {stats.maxTotal.casa || 'General'}</p>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 to-slate-900 p-6 shadow-lg shadow-blue-900/10">
              <h3 className="mb-3 text-base font-semibold text-blue-400">📊 Resumen Histórico</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-sm text-slate-300">Gasto Promedio Mensual</span>
                  <span className="text-base font-bold text-white">S/ {stats.promedioTotal}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-slate-300">Meses Registrados</span>
                  <span className="text-base font-bold text-white">{stats.cantidadRegistros}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}