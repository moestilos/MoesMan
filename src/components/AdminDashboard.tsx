import { useEffect, useState } from 'react';
import { getToken, isAuthed, getUser } from '@/lib/auth-client';
import DonutChart, { type DonutSegment } from './DonutChart';
import BarChart3D from './BarChart3D';
import AdminMangaList from './AdminMangaList';
import AdminUserDetail from './AdminUserDetail';

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
  recentUsers: Array<{ id: string; username: string; email: string; avatarUrl: string | null; createdAt: string }>;
  byDevice?: Array<{ key: string; label: string; count: number }>;
  byBrowser?: Array<{ label: string; count: number }>;
}

const ADMIN_EMAIL = 'gmateosoficial@gmail.com';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

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
          <StatCard label="Visitas únicas" value={stats.totals.uniqueIps} tone="brand" icon="users" highlight />
          <StatCard label="Visitas totales" value={stats.totals.visits} tone="violet" icon="eye" />
          <StatCard label="Usuarios" value={stats.totals.users} tone="sky" icon="user" />
          <StatCard label="En bibliotecas" value={stats.totals.library} tone="emerald" icon="bookmark" />
          <StatCard label="Favoritos" value={stats.totals.favorites} tone="amber" icon="heart" />
          <StatCard label="Progreso" value={stats.totals.progress} tone="rose" icon="chart" />
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
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setOpenUserId(u.id)}
                    className="w-full flex items-center gap-3 py-2.5 text-sm text-left rounded-lg px-2 -mx-2 transition hover:bg-bg-hover/60"
                  >
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt={u.username}
                        className="h-9 w-9 flex-none rounded-full object-cover ring-1 ring-border"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                      />
                    ) : (
                      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-brand text-xs font-black text-white">
                        {u.username[0]?.toUpperCase() ?? '?'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{u.username}</div>
                      <div className="truncate text-xs text-fg-subtle">{u.email}</div>
                    </div>
                    <span className="text-xs text-fg-subtle tabular-nums">
                      {new Date(u.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {openUserId && (
        <AdminUserDetail userId={openUserId} onClose={() => setOpenUserId(null)} />
      )}
    </div>
  );
}

type Tone = 'brand' | 'violet' | 'sky' | 'emerald' | 'amber' | 'rose';
type IconName = 'users' | 'eye' | 'user' | 'bookmark' | 'heart' | 'chart';

const TONE_MAP: Record<Tone, { bg: string; ring: string; text: string; glow: string }> = {
  brand: {
    bg: 'bg-brand-500/10',
    ring: 'ring-brand-500/30',
    text: 'text-brand-300',
    glow: 'from-brand-500/10',
  },
  violet: {
    bg: 'bg-violet-500/10',
    ring: 'ring-violet-500/30',
    text: 'text-violet-300',
    glow: 'from-violet-500/10',
  },
  sky: {
    bg: 'bg-sky-500/10',
    ring: 'ring-sky-500/30',
    text: 'text-sky-300',
    glow: 'from-sky-500/10',
  },
  emerald: {
    bg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-300',
    glow: 'from-emerald-500/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    text: 'text-amber-300',
    glow: 'from-amber-500/10',
  },
  rose: {
    bg: 'bg-rose-500/10',
    ring: 'ring-rose-500/30',
    text: 'text-rose-300',
    glow: 'from-rose-500/10',
  },
};

function StatIcon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    width: '16',
    height: '16',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
  };
  switch (name) {
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'bookmark':
      return (
        <svg {...common}>
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
      );
  }
}

function StatCard({
  label,
  value,
  tone = 'brand',
  icon,
  highlight,
}: {
  label: string;
  value: number;
  tone?: Tone;
  icon: IconName;
  highlight?: boolean;
}) {
  const t = TONE_MAP[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-bg-card/80 backdrop-blur p-3 sm:p-4 ring-1 ring-border transition hover:ring-border-strong hover:-translate-y-0.5 ${
        highlight ? `${t.ring}` : ''
      }`}
    >
      {/* Decorative glow */}
      <div
        className={`pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-xl opacity-70`}
      />
      <div className="relative flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg ${t.bg} ${t.text} ring-1 ring-inset ${t.ring}`}
        >
          <StatIcon name={icon} />
        </span>
        <span className="min-w-0 flex-1 text-[9px] xs:text-2xs font-bold uppercase tracking-[0.12em] text-fg-subtle truncate">
          {label}
        </span>
      </div>
      <div className="relative mt-2 font-display text-2xl xs:text-3xl font-black tabular-nums">
        {value.toLocaleString('es-ES')}
      </div>
    </div>
  );
}
