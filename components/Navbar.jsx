"use client";

import { useState } from 'react';

export default function Navbar({ activeTab, setActiveTab, casaSeleccionada, setCasaSeleccionada }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleTabChange = (tab) => {
    if (tab === 'casas') {
      setCasaSeleccionada('');
    }
    setActiveTab(tab);
    setMenuOpen(false);
  };

  const itemsMenu = [
    { key: 'registro', label: 'Nuevo Registro' },
    { key: 'historial', label: 'Historial' },
    { key: 'estadisticas', label: 'Estadísticas' }
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate bg-gradient-to-r from-blue-400 via-cyan-300 to-amber-300 bg-clip-text text-base font-black text-transparent sm:text-xl">
                Control de Servicios
              </h1>
              {casaSeleccionada && (
                <span className="mt-1 inline-flex max-w-full items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 sm:text-xs">
                  📍 {casaSeleccionada}
                </span>
              )}
            </div>
          </div>

          <nav className="flex items-center justify-end gap-2.5 sm:gap-3">
            <button
              onClick={() => handleTabChange('casas')}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(59,130,246,0.12)] sm:px-4 sm:text-sm ${activeTab === 'casas' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              🏠 Casas
            </button>

            <div className="relative flex items-center">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Abrir menú de reportes"
                aria-expanded={menuOpen}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 hover:-translate-y-0.5 ${itemsMenu.some((item) => item.key === activeTab) ? 'border-blue-500/40 bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.35)]' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className={`h-5 w-5 transition-transform duration-200 ${menuOpen ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 min-w-52 origin-top-right overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 shadow-[0_20px_45px_rgba(2,6,23,0.55)] backdrop-blur-xl transition-all duration-200">
                  {itemsMenu.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleTabChange(item.key)}
                      className={`block w-full border-b border-slate-800 px-4 py-2.5 text-left text-sm font-medium transition hover:bg-slate-800 ${activeTab === item.key ? 'bg-blue-600/15 text-blue-300' : 'text-slate-300 hover:text-white'} ${item.key === 'estadisticas' ? 'border-b-0' : ''}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}