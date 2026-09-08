"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal renderizado con un portal directo a document.body.
 * Esto evita que quede atrapado (y recortado) dentro de contenedores padres
 * que usan overflow-hidden + backdrop-filter, ya que backdrop-filter crea un
 * "containing block" para los descendientes position:fixed.
 */
export default function Modal({ onClose, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:items-center sm:p-5">
      {children}
    </div>,
    document.body
  );
}
