import { useEffect, useState } from 'react';
import type { DialogEventDetail, DialogOptions } from '@/lib/dialog';

interface ActiveDialog extends DialogOptions {
  kind: 'confirm' | 'alert';
  resolve: (v: boolean) => void;
}

export default function DialogRoot() {
  const [active, setActive] = useState<ActiveDialog | null>(null);

  useEffect(() => {
    function onEvent(e: Event) {
      const detail = (e as CustomEvent<DialogEventDetail>).detail;
      if (!detail) return;
      setActive(detail);
    }
    window.addEventListener('ako:dialog', onEvent);
    return () => window.removeEventListener('ako:dialog', onEvent);
  }, []);

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  function close(result: boolean) {
    if (!active) return;
    active.resolve(result);
    setActive(null);
  }

  if (!active) return null;

  const tone = active.tone ?? 'default';
  const iconTone =
    tone === 'danger'
      ? 'bg-rose-500/15 text-rose-300 ring-rose-500/30'
      : tone === 'brand'
        ? 'bg-brand-500/15 text-brand-300 ring-brand-500/30'
        : 'bg-bg-hover text-fg-muted ring-border';
  const confirmBtnClass =
    tone === 'danger'
      ? 'inline-flex h-11 sm:h-10 items-center justify-center rounded-xl px-4 font-semibold bg-rose-600 text-white ring-1 ring-rose-500/60 hover:bg-rose-500 transition flex-1'
      : 'btn-primary flex-1 h-11 sm:h-10';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 1rem)',
        paddingRight: 'max(env(safe-area-inset-right), 1rem)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ako-dialog-title"
        className="w-full max-w-md rounded-3xl bg-bg-card ring-1 ring-border shadow-card-lg animate-slide-up overflow-hidden"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl ring-1 ${iconTone}`}>
              {tone === 'danger' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id="ako-dialog-title" className="font-display text-lg font-bold leading-tight">
                {active.title ?? (active.kind === 'alert' ? 'Aviso' : 'Confirmar')}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted whitespace-pre-wrap break-words">
                {active.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 border-t border-border/60 bg-bg-card/40 px-5 py-4 sm:px-6">
          {active.kind === 'confirm' && (
            <button
              type="button"
              onClick={() => close(false)}
              className="btn-ghost flex-1 h-11 sm:h-10"
            >
              {active.cancelText ?? 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            onClick={() => close(true)}
            className={confirmBtnClass}
            autoFocus
          >
            {active.confirmText ?? (active.kind === 'alert' ? 'Entendido' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  );
}
