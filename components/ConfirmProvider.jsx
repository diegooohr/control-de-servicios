"use client";
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';

const ConfirmContext = createContext(null);

/**
 * Provider que expone una función confirm(opts) => Promise<boolean>,
 * mostrando una ventana emergente bonita en vez del confirm() nativo del navegador.
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((opts) => {
    const options = typeof opts === 'string' ? { message: opts } : opts;
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        title: options.title || 'Confirmar acción',
        message: options.message || '¿Estás seguro?',
        confirmLabel: options.confirmLabel || 'Confirmar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        tone: options.tone || 'danger',
      });
    });
  }, []);

  const close = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  };

  const toneClasses = {
    danger: 'bg-red-600 hover:bg-red-500 shadow-red-900/30',
    default: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30',
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal onClose={() => close(false)}>
          <div className="w-[min(92vw,26rem)] rounded-2xl border border-slate-700/80 bg-slate-800/95 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.9)] ring-1 ring-white/5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xl">⚠️</span>
              <h3 className="text-lg font-bold text-white">{state.title}</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-300">{state.message}</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                {state.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition ${toneClasses[state.tone] || toneClasses.default}`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx;
}
