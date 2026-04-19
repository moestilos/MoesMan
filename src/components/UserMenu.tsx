import { useEffect, useState } from 'react';
import { clearAuth, getUser, type AuthUser } from '@/lib/auth-client';
import NsfwToggle from './NsfwToggle';

export default function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener('moesman:auth-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('moesman:auth-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Ajustes"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-card ring-1 ring-border hover:ring-brand-500/40 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-64 animate-fade-in rounded-xl bg-bg-card p-1.5 ring-1 ring-border shadow-card">
                <div className="px-3 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Preferencias
                </div>
                <NsfwToggle />
              </div>
            </>
          )}
        </div>
        <a href="/login" className="hidden sm:inline-flex btn-ghost text-sm">Entrar</a>
        <a href="/register" className="btn-primary text-sm">Crear cuenta</a>
      </div>
    );
  }

  const initial = (user.username?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-bg-card pl-1 pr-3 py-1 ring-1 ring-border hover:ring-brand-500/40 transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
          {initial}
        </span>
        <span className="hidden sm:block text-sm font-medium">{user.username}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-56 animate-fade-in rounded-xl bg-bg-card p-1.5 ring-1 ring-border shadow-card"
          >
            <div className="px-3 py-2 border-b border-border">
              <div className="text-sm font-semibold truncate">{user.username}</div>
              <div className="text-xs text-fg-muted truncate">{user.email}</div>
            </div>
            <a
              href="/library"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-bg-hover"
            >
              Mi biblioteca
            </a>
            <a
              href="/history"
              className="block rounded-lg px-3 py-2 text-sm hover:bg-bg-hover"
            >
              Historial
            </a>
            <div className="my-1 border-t border-border pt-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
                Preferencias
              </div>
              <NsfwToggle />
            </div>
            <button
              onClick={() => {
                clearAuth();
                window.location.href = '/';
              }}
              className="w-full text-left rounded-lg px-3 py-2 text-sm text-brand-300 hover:bg-bg-hover"
            >
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}
