import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import {
  clearAuth,
  getToken,
  getUser,
  isAuthed,
  setAuth,
  type AuthUser,
} from '@/lib/auth-client';
import { showConfirm } from '@/lib/dialog';

export default function ProfileForm() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/profile';
      return;
    }
    const u = getUser();
    if (u) {
      setUser(u);
      setUsername(u.username);
      setEmail(u.email);
    }
  }, []);

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ kind: 'err', text: 'Selecciona un archivo de imagen' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      const token = getToken();
      if (!token) throw new Error('No autenticado');
      await api.setAvatar(token, dataUrl);
      const next = { ...(user as AuthUser), avatarUrl: dataUrl };
      setAuth(token, next);
      setUser(next);
      setMessage({ kind: 'ok', text: 'Foto de perfil actualizada' });
    } catch (err) {
      setMessage({ kind: 'err', text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!user?.avatarUrl) return;
    const token = getToken();
    if (!token) return;
    setUploading(true);
    try {
      await api.setAvatar(token, null);
      const next = { ...(user as AuthUser), avatarUrl: null };
      setAuth(token, next);
      setUser(next);
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!user) return;
    const payload: {
      email?: string;
      username?: string;
      newPassword?: string;
      currentPassword: string;
    } = { currentPassword };
    if (email !== user.email) payload.email = email;
    if (username !== user.username) payload.username = username;
    if (newPassword) payload.newPassword = newPassword;

    const nothingChanged = !payload.email && !payload.username && !payload.newPassword;
    if (nothingChanged) {
      setMessage({ kind: 'err', text: 'Sin cambios' });
      return;
    }
    if (!currentPassword) {
      setMessage({ kind: 'err', text: 'Introduce tu contraseña actual' });
      return;
    }

    setSaving(true);
    try {
      const token = getToken();
      if (!token) throw new Error('No autenticado');
      const res = await api.updateProfile(token, payload);
      setAuth(res.token, { ...res.user });
      setUser(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ kind: 'ok', text: 'Perfil actualizado correctamente' });
    } catch (err) {
      setMessage({
        kind: 'err',
        text: err instanceof ApiError ? err.message : (err as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  const initial = (user.username?.[0] ?? user.email[0]).toUpperCase();

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      {message && (
        <div
          className={`mb-5 rounded-xl px-4 py-2.5 text-sm ring-1 ring-inset ${
            message.kind === 'ok'
              ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
              : 'bg-brand-500/10 text-brand-200 ring-brand-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Avatar card */}
      <section className="mb-6 surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Foto de perfil</h2>
        <p className="mt-1 text-sm text-fg-muted">PNG o JPG, se redimensiona automáticamente.</p>
        <div className="mt-5 flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:text-left sm:gap-5">
          <div className="relative flex-none">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="h-24 w-24 sm:h-20 sm:w-20 rounded-2xl object-cover ring-1 ring-border-strong"
              />
            ) : (
              <span className="inline-flex h-24 w-24 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-brand text-3xl sm:text-2xl font-black text-white ring-1 ring-brand-400/30">
                {initial}
              </span>
            )}
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-secondary w-full sm:w-auto"
            >
              {uploading ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            {user.avatarUrl && (
              <button type="button" onClick={removeAvatar} disabled={uploading} className="btn-ghost w-full sm:w-auto">
                Quitar foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickAvatar} className="hidden" />
          </div>
        </div>
      </section>

      {/* Profile form */}
      <form onSubmit={onSubmit} className="surface p-4 sm:p-6">
        <h2 className="font-display text-lg font-bold">Datos personales</h2>
        <p className="mt-1 text-sm text-fg-muted">Tu nombre de usuario y email. Los cambios requieren tu contraseña actual.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Usuario</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={32}
              pattern="[a-zA-Z0-9_.\-]+"
              required
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
          </label>
        </div>

        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Contraseña</h3>
          <div className="mt-2 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">Actual <span className="text-brand-400">*</span></span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">Nueva (opcional)</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                placeholder="Mín. 8 caracteres"
                className="input"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={async () => {
              const ok = await showConfirm({
                title: 'Cerrar sesión',
                message: '¿Seguro que quieres cerrar sesión? Tendrás que volver a iniciar sesión para ver tu biblioteca e historial.',
                confirmText: 'Cerrar sesión',
                tone: 'danger',
              });
              if (ok) {
                clearAuth();
                window.location.href = '/';
              }
            }}
            className="btn-ghost text-sm w-full sm:w-auto"
          >
            Cerrar sesión
          </button>
          <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Center-crop cuadrado + resize → JPEG comprimido. Baja quality si pesa mucho.
async function resizeImage(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const srcSize = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - srcSize) / 2;
  const sy = (bitmap.height - srcSize) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, srcSize, srcSize, 0, 0, size, size);
  bitmap.close?.();
  let q = 0.82;
  let data = canvas.toDataURL('image/jpeg', q);
  while (data.length > 900 * 1024 && q > 0.4) {
    q -= 0.1;
    data = canvas.toDataURL('image/jpeg', q);
  }
  return data;
}
