import { useEffect, useState } from 'react';

/**
 * Botón flotante para volver atrás en PWA iOS (sin chrome del navegador)
 * y también útil en Safari móvil. Oculto en home (/) y cuando no hay historial.
 */
export default function BackButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function check() {
      const isHome = window.location.pathname === '/' || window.location.pathname === '';
      const hasHistory = window.history.length > 1;
      // En modo standalone (PWA) history casi siempre >1 si viniste navegando
      setVisible(!isHome && hasHistory);
    }
    check();
    window.addEventListener('popstate', check);
    return () => window.removeEventListener('popstate', check);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) window.history.back();
        else window.location.href = '/';
      }}
      aria-label="Volver atrás"
      className="fixed left-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg-card/90 text-fg shadow-card-lg ring-1 ring-border backdrop-blur-md transition hover:bg-bg-hover hover:ring-brand-500/40 active:scale-95 lg:hidden"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 5rem)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
    </button>
  );
}
