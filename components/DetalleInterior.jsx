"use client";

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import Modal from './Modal';
import { useConfirm } from './ConfirmProvider';
import { alertasContrato, alertaClases } from '../lib/alertas';
import { getPrivateImageUrl, getPropertyImageUrl, uploadImages, validateImages } from '../lib/propertyStorage';

const hoy = () => new Date().toISOString().slice(0, 10);
const inputClass = 'w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

const formularioInicial = () => ({
  nombres: '',
  apellidos: '',
  dni: '',
  direccion: '',
  telefono: '',
  tienePareja: '',
  parejaNombres: '',
  parejaApellidos: '',
  parejaDni: '',
  fechaInicio: hoy(),
  fechaFin: '',
  montoAlquiler: '',
  diaPago: '',
  titularDniFrontal: null,
  titularDniPosterior: null,
  dniFrontal: null,
  dniPosterior: null,
});

export default function DetalleInterior({ inmueble, casa, setActiveTab, setCasaSeleccionada, onBack }) {
  const [contratos, setContratos] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const confirm = useConfirm();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(formularioInicial);
  const [documentUrls, setDocumentUrls] = useState({});

  useEffect(() => {
    async function cargarDetalle() {
      setLoading(true);
      try {
        const [{ data: contratosData, error: contratosError }, { data: registrosData, error: registrosError }] = await Promise.all([
          supabase.from('contratos').select('*').eq('casa_id', inmueble.id).order('fecha_inicio', { ascending: false }),
          supabase.from('registros_servicios').select('*').eq('casa', inmueble.nombre).order('mes_anio', { ascending: false }),
        ]);
        if (contratosError) throw contratosError;
        if (registrosError) throw registrosError;
        setContratos(contratosData || []);
        setRegistros(registrosData || []);
      } catch (error) {
        console.error('Error cargando el detalle del interior:', error.message);
        toast.error('No se pudo cargar la información del departamento.');
      } finally {
        setLoading(false);
      }
    }

    cargarDetalle();
  }, [inmueble.id, inmueble.nombre]);

  const alquilerMensual = useMemo(
    () => contratos.filter((contrato) => contrato.estado === 'activo').reduce((total, contrato) => total + Number(contrato.monto_alquiler || 0), 0),
    [contratos]
  );
  const consumoTotal = useMemo(
    () => registros.reduce((total, registro) => total + Number(registro.monto_total_global || 0), 0),
    [registros]
  );

  useEffect(() => {
    let activo = true;
    const paths = contratos.flatMap((contrato) => [
      contrato.conyuge_dni_frontal_path,
      contrato.conyuge_dni_trasero_path,
      contrato.arrendatario_dni_frontal_path,
      contrato.arrendatario_dni_trasero_path,
    ]).filter(Boolean);

    async function cargarDocumentos() {
      const urls = await Promise.all(paths.map(async (path) => [path, await getPrivateImageUrl(path)]));
      if (activo) setDocumentUrls(Object.fromEntries(urls));
    }

    cargarDocumentos().catch((error) => {
      console.error('Error cargando documentos del inquilino:', error.message);
      toast.error('No se pudieron cargar las fotos del DNI.');
    });

    return () => { activo = false; };
  }, [contratos]);

  const actualizarCampo = (campo, valor) => setFormData((actual) => ({ ...actual, [campo]: valor }));

  const guardarInquilino = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const tienePareja = formData.tienePareja === 'si';
      const nombreCompleto = `${formData.nombres.trim()} ${formData.apellidos.trim()}`.trim();
      const editando = contratos.find((contrato) => contrato.id === editingId);
      const subir = async (archivo) => {
        if (!archivo) return null;
        validateImages([archivo]);
        const [path] = await uploadImages('tenant-documents', inmueble.id, [archivo]);
        return path;
      };
      const titularFrontal = await subir(formData.titularDniFrontal);
      const titularTrasero = await subir(formData.titularDniPosterior);
      const parejaFrontal = tienePareja ? await subir(formData.dniFrontal) : null;
      const parejaTrasero = tienePareja ? await subir(formData.dniPosterior) : null;
      const frontalPath = tienePareja ? parejaFrontal || editando?.conyuge_dni_frontal_path || null : null;
      const traseroPath = tienePareja ? parejaTrasero || editando?.conyuge_dni_trasero_path || null : null;
      if (tienePareja && (!frontalPath || !traseroPath)) {
        throw new Error('Adjunta las dos caras del DNI de la pareja.');
      }

      const payload = {
        casa_id: inmueble.id,
        inquilino: nombreCompleto,
        nombres_completos: formData.nombres.trim(),
        apellidos_completos: formData.apellidos.trim(),
        arrendatario_dni: formData.dni.trim(),
        arrendatario_domicilio: formData.direccion.trim(),
        telefono: formData.telefono.trim() || null,
        fecha_inicio: formData.fechaInicio,
        fecha_fin: formData.fechaFin || null,
        monto_alquiler: formData.montoAlquiler === '' ? null : Number(formData.montoAlquiler),
        dia_pago_mensual: formData.diaPago === '' ? null : String(formData.diaPago),
        tiene_pareja: tienePareja,
        conyuge_nombres: tienePareja ? formData.parejaNombres.trim() : null,
        conyuge_apellidos: tienePareja ? formData.parejaApellidos.trim() : null,
        conyuge_dni: tienePareja ? formData.parejaDni.trim() : null,
        conyuge_dni_frontal_path: frontalPath,
        conyuge_dni_trasero_path: traseroPath,
        arrendatario_dni_frontal_path: titularFrontal || editando?.arrendatario_dni_frontal_path || null,
        arrendatario_dni_trasero_path: titularTrasero || editando?.arrendatario_dni_trasero_path || null,
      };

      const consulta = editingId
        ? supabase.from('contratos').update(payload).eq('id', editingId)
        : supabase.from('contratos').insert([{ ...payload, estado: 'activo' }]);
      const { data: contratoGuardado, error } = await consulta.select().single();
      if (error) throw error;

      setContratos((actuales) => (editingId
        ? actuales.map((contrato) => (contrato.id === editingId ? contratoGuardado : contrato))
        : [contratoGuardado, ...actuales]));
      setEditingId(null);
      setFormData(formularioInicial());
      setShowForm(false);
      toast.success(editingId ? 'Inquilino actualizado.' : 'Inquilino y contrato registrados.');
    } catch (error) {
      console.error('Error guardando inquilino:', error.message);
      toast.error(`No se pudo guardar el inquilino: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const abrirEdicion = (contrato) => {
    setEditingId(contrato.id);
    setFormData({
      ...formularioInicial(),
      nombres: contrato.nombres_completos || contrato.inquilino || '',
      apellidos: contrato.apellidos_completos || '',
      dni: contrato.arrendatario_dni || '',
      direccion: contrato.arrendatario_domicilio || '',
      telefono: contrato.telefono || '',
      tienePareja: contrato.tiene_pareja ? 'si' : 'no',
      parejaNombres: contrato.conyuge_nombres || '',
      parejaApellidos: contrato.conyuge_apellidos || '',
      parejaDni: contrato.conyuge_dni || '',
      fechaInicio: contrato.fecha_inicio || hoy(),
      fechaFin: contrato.fecha_fin || '',
      montoAlquiler: contrato.monto_alquiler ?? '',
      diaPago: contrato.dia_pago_mensual || '',
    });
    setShowForm(true);
  };

  const eliminarInquilino = async (contrato) => {
    const ok = await confirm({ title: 'Eliminar inquilino', message: `?Eliminar a ${contrato.inquilino} y su contrato? Esta acci?n no se puede deshacer.`, confirmLabel: 'Eliminar' });
    if (!ok) return;
    const { error } = await supabase.from('contratos').delete().eq('id', contrato.id);
    if (error) {
      toast.error(`No se pudo eliminar: ${error.message}`);
      return;
    }
    setContratos((actuales) => actuales.filter((item) => item.id !== contrato.id));
    toast.success('Inquilino eliminado.');
  };

  const irASeccion = (tab) => {
    setCasaSeleccionada(inmueble.nombre);
    setActiveTab(tab);
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className="mb-2 text-sm font-semibold text-blue-300 hover:text-blue-200">← Volver a departamentos</button>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">Expediente del departamento</p>
          <h2 className="text-2xl font-bold text-white">{inmueble.nombre}</h2>
          <p className="mt-1 text-sm text-slate-400">{casa.nombre} · {inmueble.direccion || 'Ubicación no especificada'}</p>
        </div>
        <button type="button" onClick={() => { setEditingId(null); setFormData(formularioInicial()); setShowForm(true); }} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500">
          + Agregar inquilino
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-500/25 bg-blue-500/10 p-4"><p className="text-xs uppercase tracking-widest text-blue-300">Contratos</p><p className="mt-2 text-2xl font-black text-white">{contratos.length}</p></div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4"><p className="text-xs uppercase tracking-widest text-emerald-300">Alquiler activo</p><p className="mt-2 text-2xl font-black text-white">S/ {alquilerMensual.toFixed(2)}</p></div>
        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-4"><p className="text-xs uppercase tracking-widest text-cyan-300">Registros de servicios</p><p className="mt-2 text-2xl font-black text-white">{registros.length}</p></div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4"><p className="text-xs uppercase tracking-widest text-amber-300">Consumo acumulado</p><p className="mt-2 text-2xl font-black text-white">S/ {consumoTotal.toFixed(2)}</p></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
        <article className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-lg font-bold text-white">Contratos e inquilinos</h3>
          {loading ? <p className="text-sm text-slate-400">Cargando contratos...</p> : contratos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">Aún no hay inquilinos ni contratos registrados.</p>
          ) : (
            <div className="space-y-3">
              {contratos.map((contrato) => (
                <div key={contrato.id} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold text-white">{contrato.inquilino}</p><p className="mt-1 text-xs text-slate-400">DNI: {contrato.arrendatario_dni || 'No registrado'} · {contrato.arrendatario_domicilio || 'Sin dirección'}</p></div>
                    <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs ${contrato.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>{contrato.estado}</span><button type="button" onClick={() => abrirEdicion(contrato)} className="rounded-md bg-slate-700/70 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/20">?? Editar</button><button type="button" onClick={() => eliminarInquilino(contrato)} className="rounded-md bg-slate-700/70 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20">??? Eliminar</button></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">{alertasContrato(contrato, registros[0]).map((alerta) => <span key={alerta.texto} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${alertaClases[alerta.tone]}`}>?? {alerta.texto}</span>)}</div>
                  {(contrato.arrendatario_dni_frontal_path || contrato.arrendatario_dni_trasero_path) && <div className="mt-2 flex gap-3">{[contrato.arrendatario_dni_frontal_path, contrato.arrendatario_dni_trasero_path].map((path, index) => path && <a key={path} href={documentUrls[path]} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline">{index === 0 ? 'Ver DNI titular (delantero)' : 'Ver DNI titular (trasero)'}</a>)}</div>}
                  <p className="mt-3 text-xs text-slate-400">Vigencia: {contrato.fecha_inicio} — {contrato.fecha_fin || 'Sin fecha de término'} · Alquiler: S/ {Number(contrato.monto_alquiler || 0).toFixed(2)}</p>
                  {contrato.tiene_pareja && <div className="mt-3 border-t border-slate-700 pt-3"><p className="text-sm font-medium text-slate-200">Cónyuge: {contrato.conyuge_nombres} {contrato.conyuge_apellidos}</p><p className="mt-1 text-xs text-slate-400">DNI: {contrato.conyuge_dni}</p><div className="mt-3 grid grid-cols-2 gap-3">{[contrato.conyuge_dni_frontal_path, contrato.conyuge_dni_trasero_path].map((path, index) => path && <a key={path} href={documentUrls[path]} target="_blank" rel="noreferrer" className="text-xs text-blue-300 underline">{index === 0 ? 'Ver DNI delantero' : 'Ver DNI trasero'}</a>)}</div></div>}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
          <h3 className="mb-4 text-lg font-bold text-white">Consumos e historial</h3>
          {loading ? <p className="text-sm text-slate-400">Cargando consumos...</p> : registros.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">No hay consumos registrados para este departamento.</p>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                <p className="rounded-lg bg-slate-900 p-2 text-amber-300">Luz<br /><strong>{registros.reduce((total, registro) => total + Number(registro.luz_consumo || 0), 0).toFixed(1)} kWh</strong></p>
                <p className="rounded-lg bg-slate-900 p-2 text-blue-300">Agua<br /><strong>{registros.reduce((total, registro) => total + Number(registro.agua_consumo || 0), 0).toFixed(1)} m³</strong></p>
                <p className="rounded-lg bg-slate-900 p-2 text-emerald-300">Promedio<br /><strong>S/ {(consumoTotal / registros.length).toFixed(2)}</strong></p>
              </div>
              <div className="space-y-2">
                {registros.slice(0, 8).map((registro) => <div key={registro.id} className="flex items-center justify-between gap-2 border-b border-slate-700 py-2 text-sm"><span className="text-slate-300">{registro.mes_anio}</span><span className="text-slate-400">Luz {registro.luz_consumo || 0} · Agua {registro.agua_consumo || 0}</span><strong className="text-emerald-300">S/ {Number(registro.monto_total_global || 0).toFixed(2)}</strong></div>)}
              </div>
            </>
          )}
        </article>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Características</h3>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(inmueble.caracteristicas || {}).filter(([, value]) => value).map(([key, value]) => <div key={key}><dt className="text-xs capitalize text-slate-500">{key}</dt><dd className="mt-1 text-slate-200">{value === true ? 'S?' : value}</dd></div>)}
          </dl>
          {inmueble.observaciones && <p className="mt-4 text-sm text-slate-400">{inmueble.observaciones}</p>}
        </article>
        <article className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Fotos del departamento</h3>
          {inmueble.fotos?.length ? <div className="grid grid-cols-2 gap-3">{inmueble.fotos.map((path) => <img key={path} src={getPropertyImageUrl(path)} alt={`Foto de ${inmueble.nombre}`} className="h-32 w-full rounded-xl object-cover" />)}</div> : <p className="text-sm text-slate-400">No hay fotos adjuntas.</p>}
        </article>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => irASeccion('registro')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Registrar consumo</button>
        <button type="button" onClick={() => irASeccion('historial')} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Historial completo</button>
        <button type="button" onClick={() => irASeccion('estadisticas')} className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">Estadísticas generales</button>
      </div>

      {showForm && (
        <Modal onClose={() => { setShowForm(false); setEditingId(null); }}>
        <form onSubmit={guardarInquilino} className="my-auto max-h-[90vh] w-[min(94vw,44rem)] space-y-5 overflow-y-auto rounded-2xl border border-emerald-500/30 bg-slate-800 p-5">
          <div><h3 className="text-lg font-bold text-white">{editingId ? 'Editar inquilino' : 'Registrar inquilino'}</h3><p className="text-sm text-slate-400">Los datos crearán el contrato de alquiler para {inmueble.nombre}.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-400">Nombres completos *<input required value={formData.nombres} onChange={(event) => actualizarCampo('nombres', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Apellidos completos *<input required value={formData.apellidos} onChange={(event) => actualizarCampo('apellidos', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">DNI *<input required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={formData.dni} onChange={(event) => actualizarCampo('dni', event.target.value.replace(/\D/g, ''))} className={`${inputClass} mt-1`} placeholder="8 dígitos" /></label>
            <label className="text-xs text-slate-400">Teléfono<input value={formData.telefono} onChange={(event) => actualizarCampo('telefono', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400 sm:col-span-2">Dirección del inquilino *<input required value={formData.direccion} onChange={(event) => actualizarCampo('direccion', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Inicio del contrato *<input required type="date" value={formData.fechaInicio} onChange={(event) => actualizarCampo('fechaInicio', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Fin del contrato<input type="date" value={formData.fechaFin} onChange={(event) => actualizarCampo('fechaFin', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Alquiler mensual (S/)<input min="0" step="0.01" type="number" value={formData.montoAlquiler} onChange={(event) => actualizarCampo('montoAlquiler', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">¿Tiene pareja o está casado/a? *<select required value={formData.tienePareja} onChange={(event) => actualizarCampo('tienePareja', event.target.value)} className={`${inputClass} mt-1`}><option value="">Selecciona...</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label className="text-xs text-slate-400">D?a de pago mensual de servicios<input min="1" max="31" type="number" value={formData.diaPago} onChange={(event) => actualizarCampo('diaPago', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Foto DNI del inquilino - cara delantera<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => actualizarCampo('titularDniFrontal', event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs`} /></label>
            <label className="text-xs text-slate-400">Foto DNI del inquilino - cara trasera<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => actualizarCampo('titularDniPosterior', event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs`} /></label>
          </div>
          {formData.tienePareja === 'si' && <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4"><h4 className="font-semibold text-white">Datos del cónyuge o pareja</h4><div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-slate-400">Nombres completos *<input required value={formData.parejaNombres} onChange={(event) => actualizarCampo('parejaNombres', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">Apellidos completos *<input required value={formData.parejaApellidos} onChange={(event) => actualizarCampo('parejaApellidos', event.target.value)} className={`${inputClass} mt-1`} /></label>
            <label className="text-xs text-slate-400">DNI *<input required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={formData.parejaDni} onChange={(event) => actualizarCampo('parejaDni', event.target.value.replace(/\D/g, ''))} className={`${inputClass} mt-1`} placeholder="8 dígitos" /></label>
            <label className="text-xs text-slate-400">Foto DNI - cara delantera {editingId ? '' : '*'}<input required={!editingId} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => actualizarCampo('dniFrontal', event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs`} /></label>
            <label className="text-xs text-slate-400">Foto DNI - cara trasera {editingId ? '' : '*'}<input required={!editingId} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => actualizarCampo('dniPosterior', event.target.files?.[0] || null)} className={`${inputClass} mt-1 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs`} /></label>
          </div><p className="text-xs text-amber-300">Las imágenes deben ser JPG, PNG o WebP y pesar hasta 8 MB.</p></div>}
          {formData.tienePareja === 'si' && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">La aplicación no tiene inicio de sesión. Aunque el bucket no es público, el acceso anónimo actual permite solicitar enlaces temporales a los documentos.</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300">Cancelar</button><button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar inquilino y contrato'}</button></div>
        </form>
        </Modal>
      )}
    </section>
  );
}
