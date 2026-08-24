"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { descargarReciboPDF } from '../utils/pdfGenerator'; 

export default function RegistroServicios({ casaSeleccionada }) {
  const [mesAnio, setMesAnio] = useState(() => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [luzAnt, setLuzAnt] = useState(''); const [luzAct, setLuzAct] = useState(''); const [luzPrecio, setLuzPrecio] = useState('');
  const [aguaAnt, setAguaAnt] = useState(''); const [aguaAct, setAguaAct] = useState(''); const [aguaPrecio, setAguaPrecio] = useState('');
  const [gasAnt, setGasAnt] = useState(''); const [gasAct, setGasAct] = useState(''); const [gasPrecio, setGasPrecio] = useState('');

  const [cargosLuz, setCargosLuz] = useState([]);
  const [cargosAgua, setCargosAgua] = useState([]);
  const [cargosGas, setCargosGas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Cargar los cargos específicos de ESTA casa desde Supabase al iniciar
  useEffect(() => {
    async function cargarCargosDeCasa() {
      if (!casaSeleccionada) return;
      try {
        const { data, error } = await supabase
          .from('casas')
          .select('cargos_personalizados')
          .eq('nombre', casaSeleccionada)
          .single();

        if (error) throw error;
        
        if (data && data.cargos_personalizados) {
          setCargosLuz(data.cargos_personalizados.luz || []);
          setCargosAgua(data.cargos_personalizados.agua || []);
          setCargosGas(data.cargos_personalizados.gas || []);
        } else {
          // Si no tiene nada guardado, iniciamos limpio
          setCargosLuz([]);
          setCargosAgua([]);
          setCargosGas([]);
        }
      } catch (err) {
        console.error('Error cargando cargos de la casa:', err.message);
      }
    }
    cargarCargosDeCasa();
  }, [casaSeleccionada]);

  // Función para guardar los cargos de manera PERMANENTE en la tabla 'casas' de Supabase
  const guardarCargosEnBD = async () => {
    if (!casaSeleccionada) {
      alert('Por favor selecciona una casa primero desde el panel de Casas.');
      return;
    }

    const estructuraCargos = {
      luz: cargosLuz,
      agua: cargosAgua,
      gas: cargosGas
    };

    try {
      const { error } = await supabase
        .from('casas')
        .update({ cargos_personalizados: estructuraCargos })
        .eq('nombre', casaSeleccionada);

      if (error) throw error;
      alert(`¡Los cargos adicionales de "${casaSeleccionada}" se han guardado permanentemente para el próximo mes!`);
    } catch (err) {
      console.error(err);
      alert('Error al guardar los cargos de la casa.');
    }
  };

  const agregarCargo = (servicio) => {
    const nuevoCargo = { nombre: '', monto: '' };
    if (servicio === 'luz') setCargosLuz([...cargosLuz, nuevoCargo]);
    else if (servicio === 'agua') setCargosAgua([...cargosAgua, nuevoCargo]);
    else if (servicio === 'gas') setCargosGas([...cargosGas, nuevoCargo]);
  };

  const actualizarCargo = (servicio, index, campo, valor) => {
    if (servicio === 'luz') { const nuevos = [...cargosLuz]; nuevos[index][campo] = valor; setCargosLuz(nuevos); }
    else if (servicio === 'agua') { const nuevos = [...cargosAgua]; nuevos[index][campo] = valor; setCargosAgua(nuevos); }
    else if (servicio === 'gas') { const nuevos = [...cargosGas]; nuevos[index][campo] = valor; setCargosGas(nuevos); }
  };

  const eliminarCargo = (servicio, index) => {
    if (servicio === 'luz') { setCargosLuz(cargosLuz.filter((_, i) => i !== index)); }
    else if (servicio === 'agua') { setCargosAgua(cargosAgua.filter((_, i) => i !== index)); }
    else if (servicio === 'gas') { setCargosGas(cargosGas.filter((_, i) => i !== index)); }
  };

  const sumarCargos = (cargos) => cargos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

  const calcularYGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);

    const consumoLuz = Math.max(0, Number(luzAct) - Number(luzAnt));
    const subtotalLuz = (consumoLuz * Number(luzPrecio)) + sumarCargos(cargosLuz);

    const consumoAgua = Math.max(0, Number(aguaAct) - Number(aguaAnt));
    const subtotalAgua = (consumoAgua * Number(aguaPrecio)) + sumarCargos(cargosAgua);

    const consumoGas = Math.max(0, Number(gasAct) - Number(gasAnt));
    const subtotalGas = (consumoGas * Number(gasPrecio)) + sumarCargos(cargosGas);

    const totalGlobal = subtotalLuz + subtotalAgua + subtotalGas;

    const dataRegistro = {
      casa: casaSeleccionada || 'General',
      mes_anio: mesAnio,
      luz_lectura_ant: Number(luzAnt), luz_lectura_act: Number(luzAct), luz_consumo: consumoLuz, luz_total: subtotalLuz,
      agua_lectura_ant: Number(aguaAnt), agua_lectura_act: Number(aguaAct), agua_consumo: consumoAgua, agua_total: subtotalAgua,
      gas_lectura_ant: Number(gasAnt), gas_lectura_act: Number(gasAct), gas_consumo: consumoGas, gas_total: subtotalGas,
      monto_total_global: totalGlobal,
      cargos_luz: cargosLuz,
      cargos_agua: cargosAgua,
      cargos_gas: cargosGas
    };

    try {
      const { error } = await supabase.from('registros_servicios').insert([dataRegistro]);
      if (error) throw error;
      setResultado(dataRegistro);
      alert('¡Registro guardado exitosamente en Supabase!');
    } catch (err) {
      console.error(err);
      alert('Hubo un error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const enviarPorWhatsApp = (registro) => {
    const mensaje = `Hola, este es el detalle de tus servicios del mes de ${registro.mes_anio}:\n\n`
      + `💡 Luz: S/ ${registro.luz_total.toFixed(2)}\n`
      + `💧 Agua: S/ ${registro.agua_total.toFixed(2)}\n`
      + `🔥 Gas: S/ ${registro.gas_total.toFixed(2)}\n\n`
      + `💰 *Total a pagar: S/ ${registro.monto_total_global.toFixed(2)}*\n\n`
      + `Por favor, envíame el voucher de pago. ¡Gracias!`;

    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  const renderCargos = (servicio, cargos) => (
    <div className="mt-4 border-t border-slate-700 pt-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-medium text-slate-300">Cargos Adicionales</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => agregarCargo(servicio)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1.5 rounded text-white transition-colors">+ Añadir</button>
          <button type="button" onClick={guardarCargosEnBD} className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded text-white flex items-center gap-1 shadow-md">💾 Guardar Config</button>
        </div>
      </div>
      {cargos.map((cargo, index) => (
        <div key={index} className="flex gap-2 mb-2 items-center">
          <input type="text" value={cargo.nombre} onChange={(e) => actualizarCargo(servicio, index, 'nombre', e.target.value)} className="w-1/2 bg-slate-900 border border-slate-700 rounded p-2 text-white text-sm" placeholder="Ej: Mantenimiento" />
          <div className="relative w-1/2 flex items-center gap-2">
            <span className="absolute left-3 text-slate-400 text-sm">S/</span>
            <input type="number" step="any" value={cargo.monto} onChange={(e) => actualizarCargo(servicio, index, 'monto', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 pl-8 text-white text-sm" placeholder="0.00" />
            <button type="button" onClick={() => eliminarCargo(servicio, index)} className="text-red-400 hover:text-red-300 p-1 text-lg" >🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <div className="rounded-[26px] border border-slate-700/80 bg-slate-800/90 p-4 shadow-[0_24px_70px_rgba(2,6,23,0.55)] sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-blue-400">Operación</p>
            <h2 className="text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
              Ingresar lecturas
              {casaSeleccionada && <span className="ml-2 text-blue-400 normal-case">- {casaSeleccionada}</span>}
            </h2>
          </div>
        </div>

        <form onSubmit={calcularYGuardar} className="space-y-6">
          <div className="max-w-xs">
            <label className="mb-1 block text-sm text-slate-300">Mes de Facturación</label>
            <input
              type="month"
              required
              value={mesAnio}
              onChange={e => setMesAnio(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/35"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch">
            <div className="group rounded-[22px] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:-translate-y-1 hover:border-amber-400/50 hover:shadow-[0_18px_30px_rgba(245,158,11,0.08)]">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-amber-400">⚡ Luz (kWh)</h3>
              <div className="space-y-3">
                <input type="number" step="any" placeholder="Lectura Anterior" required value={luzAnt} onChange={e => setLuzAnt(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25" />
                <input type="number" step="any" placeholder="Lectura Actual" required value={luzAct} onChange={e => setLuzAct(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25" />
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">S/</span>
                  <input type="number" step="any" placeholder="Precio x kWh" required value={luzPrecio} onChange={e => setLuzPrecio(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 pl-8 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25" />
                </div>
              </div>
              {renderCargos('luz', cargosLuz)}
            </div>

            <div className="group rounded-[22px] border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:-translate-y-1 hover:border-blue-400/50 hover:shadow-[0_18px_30px_rgba(59,130,246,0.08)]">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-blue-400">💧 Agua (m³)</h3>
              <div className="space-y-3">
                <input type="number" step="any" placeholder="Lectura Anterior" required value={aguaAnt} onChange={e => setAguaAnt(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25" />
                <input type="number" step="any" placeholder="Lectura Actual" required value={aguaAct} onChange={e => setAguaAct(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25" />
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">S/</span>
                  <input type="number" step="any" placeholder="Precio x m³" required value={aguaPrecio} onChange={e => setAguaPrecio(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 pl-8 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/25" />
                </div>
              </div>
              {renderCargos('agua', cargosAgua)}
            </div>

            <div className="group rounded-[22px] border border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-900/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:-translate-y-1 hover:border-orange-400/50 hover:shadow-[0_18px_30px_rgba(249,115,22,0.08)]">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-orange-400">🔥 Gas (m³)</h3>
              <div className="space-y-3">
                <input type="number" step="any" placeholder="Lectura Anterior" required value={gasAnt} onChange={e => setGasAnt(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25" />
                <input type="number" step="any" placeholder="Lectura Actual" required value={gasAct} onChange={e => setGasAct(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25" />
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-slate-400">S/</span>
                  <input type="number" step="any" placeholder="Precio x m³" required value={gasPrecio} onChange={e => setGasPrecio(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 pl-8 text-sm text-white outline-none transition duration-200 hover:border-slate-600 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/25" />
                </div>
              </div>
              {renderCargos('gas', cargosGas)}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-sky-500 px-6 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(37,99,235,0.35)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_20px_35px_rgba(59,130,246,0.4)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto">
            {loading ? 'Calculando...' : 'Calcular y Guardar'}
          </button>
        </form>

        {resultado && (
          <div className="mt-8 rounded-[24px] border border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900/80 to-emerald-900/20 p-5 shadow-[0_16px_30px_rgba(16,185,129,0.08)] sm:p-6">
            <h3 className="mb-2 text-center text-lg font-black text-emerald-400 sm:text-xl">Total a Pagar: S/ {resultado.monto_total_global.toFixed(2)}</h3>
            <div className="mb-5 flex flex-col items-center justify-center gap-2 text-center text-sm text-slate-300 sm:flex-row sm:gap-4">
              <span>Luz: S/ {resultado.luz_total.toFixed(2)}</span>
              <span className="hidden sm:inline">|</span>
              <span>Agua: S/ {resultado.agua_total.toFixed(2)}</span>
              <span className="hidden sm:inline">|</span>
              <span>Gas: S/ {resultado.gas_total.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => descargarReciboPDF(resultado)}
                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(239,68,68,0.25)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_35px_rgba(239,68,68,0.35)]"
              >
                📄 Descargar PDF
              </button>

              <button
                onClick={() => enviarPorWhatsApp(resultado)}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_16px_30px_rgba(34,197,94,0.25)] transition duration-200 hover:translate-y-[-1px] hover:shadow-[0_18px_35px_rgba(34,197,94,0.35)]"
              >
                💬 Enviar WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}