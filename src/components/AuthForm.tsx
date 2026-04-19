import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { setAuth } from '@/lib/auth-client';

type Mode = 'login' | 'register';

export default function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = isRegister
        ? await api.register(email, username, password)
        : await api.login(email, password);
      setAuth(res.token, res.user);
      const next = new URLSearchParams(window.location.search).get('next') || '/library';
      window.location.href = next;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-200">
          {error}
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </label>

      {isRegister && (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Usuario</span>
          <input
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_.\-]+"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input"
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Contraseña</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>

      <button type="submit" disabled={loading} className="btn-primary mt-1">
        {loading ? '…' : isRegister ? 'Crear cuenta' : 'Entrar'}
      </button>

      <p className="text-center text-xs text-fg-muted">
        {isRegister ? (
          <>
            ¿Ya tienes cuenta?{' '}
            <a href="/login" className="text-brand-400 hover:underline">
              Entrar
            </a>
          </>
        ) : (
          <>
            ¿Sin cuenta?{' '}
            <a href="/register" className="text-brand-400 hover:underline">
              Regístrate
            </a>
          </>
        )}
      </p>
    </form>
  );
}
