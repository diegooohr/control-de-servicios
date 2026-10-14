"use client";
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Dashboard from '../components/Dashboard';
import Casas from '../components/Casas';
import Contratos from '../components/Contratos';
import RegistroServicios from '../components/RegistroServicios';
import HistorialServicios from '../components/HistorialServicios';
import Estadisticas from '../components/Estadisticas';

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [casaSeleccionada, setCasaSeleccionada] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-slate-950 text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        casaSeleccionada={casaSeleccionada}
        setCasaSeleccionada={setCasaSeleccionada}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main
        className={`min-h-screen w-full max-w-full px-2.5 py-4 pt-16 transition-all duration-300 ease-in-out sm:px-5 lg:px-6 lg:pt-6 xl:px-8 ${collapsed ? 'lg:pl-[92px]' : 'lg:pl-[280px]'}`}
      >
        <div className="mx-auto w-full max-w-7xl max-w-full">
          <div className="overflow-hidden rounded-[26px] border border-slate-800/80 bg-slate-900/45 p-1.5 shadow-[0_26px_80px_rgba(15,23,42,0.52)] backdrop-blur-sm sm:rounded-[30px] sm:p-3">
            {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} setCasaSeleccionada={setCasaSeleccionada} />}
            {activeTab === 'casas' && <Casas setActiveTab={setActiveTab} setCasaSeleccionada={setCasaSeleccionada} />}
            {activeTab === 'contratos' && <Contratos casaSeleccionada={casaSeleccionada} />}
            {activeTab === 'registro' && <RegistroServicios casaSeleccionada={casaSeleccionada} setCasaSeleccionada={setCasaSeleccionada} />}
            {activeTab === 'historial' && <HistorialServicios />}
            {activeTab === 'estadisticas' && <Estadisticas />}
          </div>
        </div>
      </main>
    </div>
  );
}