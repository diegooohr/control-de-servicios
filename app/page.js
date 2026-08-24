"use client";
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Casas from '../components/Casas';
import RegistroServicios from '../components/RegistroServicios';
import HistorialServicios from '../components/HistorialServicios';
import Estadisticas from '../components/Estadisticas';

export default function Home() {
  const [activeTab, setActiveTab] = useState('casas');
  const [casaSeleccionada, setCasaSeleccionada] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        casaSeleccionada={casaSeleccionada}
        setCasaSeleccionada={setCasaSeleccionada}
      />

      <main className="flex-1 w-full px-3 py-5 sm:px-5 lg:px-6 xl:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-[30px] border border-slate-800/80 bg-slate-900/45 p-2 shadow-[0_26px_80px_rgba(15,23,42,0.52)] backdrop-blur-sm sm:p-3">
            {activeTab === 'casas' && <Casas setActiveTab={setActiveTab} setCasaSeleccionada={setCasaSeleccionada} />}
            {activeTab === 'registro' && <RegistroServicios casaSeleccionada={casaSeleccionada} />}
            {activeTab === 'historial' && <HistorialServicios />}
            {activeTab === 'estadisticas' && <Estadisticas />}
          </div>
        </div>
      </main>
    </div>
  );
}