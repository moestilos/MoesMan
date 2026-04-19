import { useEffect, useRef, useState } from 'react';
import { clearAuth, getToken, getUser, updateUser, type AuthUser } from '@/lib/auth-client';
import { api } from '@/lib/api';
import NsfwToggle from './NsfwToggle';

export default function UserMenu() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecciona un archivo de imagen.');
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      const token = getToken();
      if (!token) throw new Error('No autenticado');
      await api.setAvatar(token, dataUrl);
      updateUser({ avatarUrl: dataUrl });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user?.avatarUrl) return;
    if (!confirm('¿Quitar foto de perfil?')) return;
    const token = getToken();
    if (!token) return;
    setUploading(true);
    try {
      await api.setAvatar(token, null);
      updateUser({ avatarUrl: null });
    } finally {
      setUploading(false);
    }
  }

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
        <Avatar user={user} size={28} className="text-xs" />
        <span className="hidden sm:block text-sm font-medium">{user.username}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-72 animate-fade-in rounded-2xl bg-bg-card p-2 ring-1 ring-border shadow-card"
          >
            <div className="flex items-center gap-3 border-b border-border px-3 py-3">
              <div className="relative">
                <Avatar user={user} size={48} className="text-lg" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Cambiar foto de perfil"
                  className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-bg-card transition hover:bg-brand-500 disabled:opacity-50"
                  title="Cambiar foto"
                >
                  {uploading ? (
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={pickFile}
                  className="hidden"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{user.username}</div>
                <div className="truncate text-xs text-fg-muted">{user.email}</div>
                {user.avatarUrl && (
                  <button
                    onClick={removeAvatar}
                    className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle hover:text-brand-400 transition"
                  >
                    Quitar foto
                  </button>
                )}
              </div>
            </div>

            <a href="/library" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Mi biblioteca
            </a>
            <a href="/history" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-bg-hover">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
                <path d="M3 3v5h5"/>
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
                <path d="M12 7v5l4 2"/>
              </svg>
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
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand-300 hover:bg-bg-hover"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Avatar({
  user,
  size,
  className = '',
}: {
  user: AuthUser;
  size: number;
  className?: string;
}) {
  const initial = (user.username?.[0] ?? user.email[0]).toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        width={size}
        height={size}
        className={`inline-block rounded-full object-cover ring-1 ring-border ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-white ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

async function resizeImage(file: File, maxSize: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  // Preferir JPEG para fotos (menor peso); PNG conserva transparencia
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mime, 0.85);
}
