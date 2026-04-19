import { useEffect, useState } from 'react';
import { getToken, isAuthed, getUser } from '@/lib/auth-client';
import DonutChart, { type DonutSegment } from './DonutChart';
import BarChart3D from './BarChart3D';
import AdminMangaList from './AdminMangaList';

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
  byDevice?: Array<{ key: string; label: string; count: number }>;
  byBrowser?: Array<{ label: string; count: number }>;
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

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Totales */}
      <section>
        <h2 className="mb-4 section-kicker">Totales</h2>
        <div className="grid gap-2 xs:gap-3 grid-cols-2 xs:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Visitas únicas" value={stats.totals.uniqueIps} highlight />
          <StatCard label="Visitas totales" value={stats.totals.visits} />
          <StatCard label="Usuarios" value={stats.totals.users} />
          <StatCard label="En bibliotecas" value={stats.totals.library} />
          <StatCard label="Favoritos" value={stats.totals.favorites} />
          <StatCard label="Progreso" value={stats.totals.progress} />
        </div>
      </section>

      {/* Gráfico por día 3D */}
      <BarChart3D
        subtitle="Tráfico"
        title="Visitas únicas por día (últimos 30)"
        data={stats.last30Days}
      />

      {/* Donut charts: Device + Browser */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DonutChart
          subtitle="Audiencia"
          title="Dispositivos"
          centerLabel="Total visitas"
          segments={(stats.byDevice ?? []).map(
            (d): DonutSegment => ({ key: d.key, label: d.label, value: d.count }),
          )}
        />
        <DonutChart
          subtitle="Tecnología"
          title="Navegadores"
          centerLabel="Total"
          segments={(stats.byBrowser ?? []).slice(0, 6).map(
            (b, i): DonutSegment => ({
              key: b.label.toLowerCase(),
              label: b.label,
              value: b.count,
            }),
          )}
        />
      </div>

      {/* Catálogo de mangas */}
      <AdminMangaList />

      {/* Top paths */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-4 sm:p-6">
          <span className="section-kicker">Rutas</span>
          <h3 className="mt-2 mb-4 font-display text-lg sm:text-xl font-bold">Top páginas (7 días)</h3>
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

        <section className="surface p-4 sm:p-6">
          <span className="section-kicker">Cuentas</span>
          <h3 className="mt-2 mb-4 font-display text-lg sm:text-xl font-bold">Usuarios recientes</h3>
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
      className={`surface p-3 sm:p-4 ${
        highlight ? 'ring-brand-500/30 bg-gradient-to-br from-brand-500/5 to-transparent' : ''
      }`}
    >
      <div className="text-[9px] xs:text-2xs font-bold uppercase tracking-[0.14em] text-fg-subtle truncate">{label}</div>
      <div className="mt-1.5 sm:mt-2 font-display text-2xl xs:text-3xl font-black tabular-nums">
        {value.toLocaleString('es-ES')}
      </div>
    </div>
  );
}
