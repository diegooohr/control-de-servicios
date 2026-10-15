"use client";

import { useEffect, useState } from 'react';

const ICONS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  casas: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  contratos: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h6l5 5v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4" />
    </svg>
  ),
  registro: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  historial: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
    </svg>
  ),
  estadisticas: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10M11 20V4M18 20v-7" />
    </svg>
  ),
};

const ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'casas', label: 'Casas', icon: 'casas' },
  { key: 'contratos', label: 'Contratos', icon: 'contratos' },
  { key: 'historial', label: 'Historial', icon: 'historial' },
  { key: 'estadisticas', label: 'Estadísticas', icon: 'estadisticas' },
];

export default function Sidebar({ activeTab, setActiveTab, casaSeleccionada, setCasaSeleccionada, collapsed, setCollapsed }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cierra el menú móvil al cambiar de pestaña
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const handleTabChange = (tab) => {
    if (tab === 'casas' || tab === 'dashboard' || tab === 'contratos') {
      setCasaSeleccionada('');
    }
    setActiveTab(tab);
  };

  return (
    <>
      {/* Botón hamburguesa (solo mobile) */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg backdrop-blur-xl lg:hidden"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-slate-800/80 bg-slate-900/95 pt-[env(safe-area-inset-top)] shadow-[0_0_60px_rgba(2,6,23,0.6)] backdrop-blur-xl transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} w-64`}
      >
        {/* Header con logo */}
        <div className={`flex items-center gap-3 border-b border-slate-800/80 px-4 py-4 ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}>
          <img
            src="/logo-navbar.png"
            alt="Logo Control de Servicios"
            className="h-9 w-9 shrink-0 object-contain drop-shadow-md"
          />
          <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="truncate bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-sm font-black tracking-tight text-transparent">
              Control de Servicios
            </h1>
            {casaSeleccionada && (
              <span className="mt-1 inline-flex max-w-full items-center truncate rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                📍 {casaSeleccionada}
              </span>
            )}
          </div>

          {/* Botón cerrar (solo mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 lg:hidden"
          >
            &times;
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
          {ITEMS.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(item.key)}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200
                  ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                  ${active
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span className="shrink-0">{ICONS[item.icon]}</span>
                <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Botón colapsar (solo desktop) */}
        <div className="hidden border-t border-slate-800/80 p-2.5 lg:block">
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-5 w-5 shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5 8 12l7 7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 4 12l7 7" opacity="0" />
            </svg>
            <span className={collapsed ? 'lg:hidden' : ''}>Colapsar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
