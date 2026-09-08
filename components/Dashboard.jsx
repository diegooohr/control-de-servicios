"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const hoy = () => new Date().toISOString().slice(0, 10);
const mesActual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

function diasHasta(fecha) {
  if (!fecha) return null;
  const diff = new Date(fecha) - new Date(hoy());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function Dashboard({ setActiveTab, setCasaSeleccionada }) {
  const [loading, setLoading] = useState(true);
  const [casas, setCasas] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [registrosMes, setRegistrosMes] = useState([]);

  useEffect(() => {
    async function fetchTodo() {
      try {
        const [{ data: casasData, error: e1 }, { data: contratosData, error: e2 }, { data: registrosData, error: e3 }] = await Promise.all([
          supabase.from('casas').select('*'),
          supabase.from('contratos').select('*'),
          supabase.from('registros_servicios').select('*').eq('mes_anio', mesActual()),
        ]);
        if (e1) throw e1;
        if (e2) throw e2;
        if (e3) throw e3;
        setCasas(casasData || []);
        setContratos(contratosData || []);
        setRegistrosMes(registrosData || []);
      } catch (err) {
        console.error('Error cargando dashboard:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTodo();
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando dashboard...</div>;

  const contratosActivos = contratos.filter((c) => c.estado === 'activo');
  const casasIdsOcupadas = new Set(contratosActivos.map((c) => c.casa_id));
  const totalCasas = casas.length;
  const casasOcupadas = casas.filter((c) => casasIdsOcupadas.has(c.id)).length;
  const casasVacias = totalCasas - casasOcupadas;

  const contratosPorVencer = contratosActivos
    .filter((c) => c.fecha_fin)
    .map((c) => ({ ...c, diasRestantes: diasHasta(c.fecha_fin) }))
    .filter((c) => c.diasRestantes !== null && c.diasRestantes <= 30)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const casaNombrePorId = {};
  casas.forEach((c) => { casaNombrePorId[c.id] = c.nombre; });

  const gastoMesTotal = registrosMes.reduce((acc, r) => acc + (r.monto_total_global || 0), 0);

  const irACasas = () => setActiveTab('casas');
  const irAContratos = () => setActiveTab('contratos');

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Resumen</p>
        <h2 className="text-2xl font-bold text-white">Dashboard General</h2>
      </div>

      {/* Tarjetas de métricas */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button onClick={irACasas} className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900 p-5 text-left shadow-lg shadow-blue-900/10 transition hover:-translate-y-1 hover:border-blue-400/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">Total Inmuebles</p>
          <p className="text-3xl font-black text-white">{totalCasas}</p>
        </button>

        <button onClick={irACasas} className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-5 text-left shadow-lg shadow-emerald-900/10 transition hover:-translate-y-1 hover:border-emerald-400/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Ocupadas</p>
          <p className="text-3xl font-black text-white">{casasOcupadas}</p>
        </button>

        <button onClick={irACasas} className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-slate-900 p-5 text-left shadow-lg shadow-amber-900/10 transition hover:-translate-y-1 hover:border-amber-400/50">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Vacías</p>
          <p className="text-3xl font-black text-white">{casasVacias}</p>
        </button>

        <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-slate-900 p-5 shadow-lg shadow-cyan-900/10">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Gasto del Mes</p>
          <p className="text-3xl font-black text-white">S/ {gastoMesTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Alertas de contratos por vencer */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/90 p-5 shadow-xl shadow-slate-950/20 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            ⚠️ Contratos por Vencer <span className="text-sm font-normal text-slate-400">(próximos 30 días)</span>
          </h3>
          <button onClick={irAContratos} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white">
            Ver todos →
          </button>
        </div>

        {contratosPorVencer.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            No hay contratos próximos a vencer. 🎉
          </div>
        ) : (
          <div className="space-y-3">
            {contratosPorVencer.map((c) => {
              const vencido = c.diasRestantes < 0;
              return (
                <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{c.inquilino}</p>
                    <p className="truncate text-xs text-slate-400">📍 {casaNombrePorId[c.casa_id] || 'Desconocida'} · Vence: {c.fecha_fin}</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${vencido ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                    {vencido ? `Vencido hace ${Math.abs(c.diasRestantes)} días` : `Vence en ${c.diasRestantes} días`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
