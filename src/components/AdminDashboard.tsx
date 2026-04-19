import { useEffect, useState } from 'react';
import { getToken, isAuthed, getUser } from '@/lib/auth-client';

interface Stats {
  totals: {
    visits: number;
    uniqueIps: number;
    users: number;
    library: number;
    favorites: number;
    progress: number;
  };
  last30Days: Array<[string, number]>;
  topPaths: Array<{ path: string; count: number }>;
  recentUsers: Array<{ id: string; username: string; email: string; createdAt: string }>;
}

const ADMIN_EMAIL = 'gmateosoficial@gmail.com';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/admin';
      return;
    }
    const user = getUser();
    if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      setError('Acceso denegado: solo admin.');
      return;
    }
    const token = getToken()!;
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-6 text-center">
        <h2 className="text-lg font-bold">{error}</h2>
        <a href="/" className="btn-primary mt-4 inline-flex">Volver</a>
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  const maxDay = Math.max(1, ...stats.last30Days.map(([, v]) => v));

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Totales */}
      <section>
        <h2 className="mb-4 section-kicker">Totales</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Visitas únicas" value={stats.totals.uniqueIps} highlight />
          <StatCard label="Visitas totales" value={stats.totals.visits} />
          <StatCard label="Usuarios" value={stats.totals.users} />
          <StatCard label="En bibliotecas" value={stats.totals.library} />
          <StatCard label="Favoritos" value={stats.totals.favorites} />
          <StatCard label="Progreso" value={stats.totals.progress} />
        </div>
      </section>

      {/* Gráfico por día */}
      <section className="surface p-6">
        <div className="mb-4">
          <span className="section-kicker">Tráfico</span>
          <h3 className="mt-2 font-display text-xl font-bold">Visitas únicas por día (últimos 30)</h3>
        </div>
        {stats.last30Days.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">Sin visitas registradas aún.</p>
        ) : (
          <div className="flex h-48 items-end gap-1">
            {stats.last30Days.map(([day, count]) => {
              const h = Math.max(4, (count / maxDay) * 100);
              return (
                <div
                  key={day}
                  className="group relative flex-1 min-w-[8px]"
                  title={`${day} — ${count} visitas`}
                >
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400 transition-all hover:from-brand-500 hover:to-brand-300"
                    style={{ height: `${h}%` }}
                  />
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-bg-elevated px-2 py-0.5 text-[10px] font-semibold text-fg ring-1 ring-border opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Top paths */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-6">
          <span className="section-kicker">Rutas</span>
          <h3 className="mt-2 mb-4 font-display text-xl font-bold">Top páginas (7 días)</h3>
          {stats.topPaths.length === 0 ? (
            <p className="py-4 text-sm text-fg-muted">Sin datos.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.topPaths.map((p) => (
                <li key={p.path} className="flex items-center justify-between py-2.5 text-sm">
                  <code className="truncate font-mono text-fg-muted">{p.path}</code>
                  <span className="font-bold tabular-nums text-brand-300">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-6">
          <span className="section-kicker">Cuentas</span>
          <h3 className="mt-2 mb-4 font-display text-xl font-bold">Usuarios recientes</h3>
          {stats.recentUsers.length === 0 ? (
            <p className="py-4 text-sm text-fg-muted">Ningún usuario registrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-black text-white">
                    {u.username[0]?.toUpperCase() ?? '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{u.username}</div>
                    <div className="truncate text-xs text-fg-subtle">{u.email}</div>
                  </div>
                  <span className="text-xs text-fg-subtle tabular-nums">
                    {new Date(u.createdAt).toLocaleDateString('es-ES')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`surface p-4 ${
        highlight ? 'ring-brand-500/30 bg-gradient-to-br from-brand-500/5 to-transparent' : ''
      }`}
    >
      <div className="text-2xs font-bold uppercase tracking-[0.16em] text-fg-subtle">{label}</div>
      <div className="mt-2 font-display text-3xl font-black tabular-nums">
        {value.toLocaleString('es-ES')}
      </div>
    </div>
  );
}
