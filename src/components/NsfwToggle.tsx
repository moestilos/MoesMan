import { useEffect, useState } from 'react';
import {
  confirmNsfw,
  isNsfwConfirmed,
  isNsfwEnabled,
  setNsfwEnabled,
  syncNsfwCookie,
} from '@/lib/prefs';

export default function NsfwToggle() {
  const [enabled, setEnabled] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEnabled(isNsfwEnabled());
    setMounted(true);
    syncNsfwCookie();
  }, []);

  function request(next: boolean) {
    if (next && !isNsfwConfirmed()) {
      setGateOpen(true);
      return;
    }
    apply(next);
  }

  function apply(next: boolean) {
    setNsfwEnabled(next);
    syncNsfwCookie();
    setEnabled(next);
    // Recargar para que SSR aplique el cambio
    setTimeout(() => window.location.reload(), 200);
  }

  function confirmAge() {
    confirmNsfw();
    setGateOpen(false);
    apply(true);
  }

  if (!mounted) return null;

  return (
    <>
      <label className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-bg-hover cursor-pointer">
        <span className="flex items-center gap-2 text-sm">
          <span>Contenido 18+</span>
          {enabled && (
            <span className="inline-flex items-center rounded-sm bg-rose-600/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300 ring-1 ring-rose-500/40">
              ON
            </span>
          )}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => request(!enabled)}
          className={`relative inline-flex h-5 w-9 flex-none items-center rounded-full transition-colors ${enabled ? 'bg-brand-600' : 'bg-border-strong'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
          />
        </button>
      </label>

      {gateOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.target === e.currentTarget && setGateOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-bg-card p-6 ring-1 ring-border shadow-card animate-slide-up">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600/20 text-rose-300 ring-1 ring-rose-500/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
                </svg>
              </span>
              <h2 className="text-lg font-bold">Contenido para adultos</h2>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">
              Al activar este filtro se incluirá contenido explícito (18+) del catálogo de MangaDex.
              Confirmas que <strong>eres mayor de edad</strong> en tu jurisdicción y que aceptas ver este contenido
              bajo tu responsabilidad.
            </p>
            <p className="mt-3 text-xs text-fg-subtle">
              Puedes desactivarlo en cualquier momento desde tu menú.
            </p>
            <div className="mt-6 flex gap-2">
              <button onClick={() => setGateOpen(false)} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={confirmAge} className="btn-primary flex-1">
                Soy mayor de edad
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
