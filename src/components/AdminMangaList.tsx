import { useEffect, useMemo, useState } from 'react';
import { getToken, isAuthed, getUser } from '@/lib/auth-client';
import AdminMangaDetail from './AdminMangaDetail';

export interface AdminMangaItem {
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  libraryCount: number;
  favoriteCount: number;
  progressCount: number;
  readers: number;
  lastActivity: string | null;
  firstSeen: string | null;
}

type SortKey = 'popular' | 'recent' | 'readers' | 'favorites' | 'activity' | 'title';

const SORT_LABELS: Record<SortKey, string> = {
  popular: 'Más populares',
  recent: 'Más recientes',
  readers: 'Más leídos',
  favorites: 'Más favoritos',
  activity: 'Más activos',
  title: 'A-Z',
};

export default function AdminMangaList() {
  const [items, setItems] = useState<AdminMangaItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('popular');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) return;
    const user = getUser();
    if (user?.email?.toLowerCase() !== 'gmateosoficial@gmail.com') {
      setError('Acceso denegado');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  async function load() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mangas?sort=${sort}&limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setItems(body.items);
      setTotal(body.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!items) return null;
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.mangaId.toLowerCase().includes(term),
    );
  }, [items, q]);

  if (error) {
    return (
      <section className="surface p-6 text-sm text-brand-300">{error}</section>
    );
  }

  const detailItem = detailKey
    ? items?.find((m) => `${m.providerId}:${m.mangaId}` === detailKey)
    : null;

  return (
    <section className="surface p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="section-kicker">Catálogo</span>
          <h3 className="mt-2 font-display text-xl font-bold">
            Mangas en la app
            <span className="ml-2 text-sm font-normal text-fg-muted tabular-nums">· {total}</span>
          </h3>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título o ID…"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => {
            const active = sort === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={`flex-none rounded-full px-3.5 py-2 text-xs font-semibold transition ring-1 ring-inset ${
                  active
                    ? 'bg-white/10 text-white ring-white/20'
                    : 'bg-bg-card text-fg-muted ring-border hover:text-fg hover:ring-border-strong'
                }`}
              >
                {SORT_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading || items === null ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="-mx-2 grid gap-1.5 sm:mx-0">
          {filtered.map((m) => (
            <button
              key={`${m.providerId}:${m.mangaId}`}
              type="button"
              onClick={() => setDetailKey(`${m.providerId}:${m.mangaId}`)}
              className="group flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-bg-hover/50 sm:gap-4 sm:px-3 sm:py-2.5"
            >
              <div className="relative h-14 w-10 flex-none overflow-hidden rounded-md bg-bg-elevated ring-1 ring-border sm:h-16 sm:w-12">
                <img
                  src={m.coverUrl ?? '/placeholder-cover.svg'}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/placeholder-cover.svg')}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold sm:text-[15px]">{m.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-fg-subtle">
                  <StatChip label="bib" value={m.libraryCount} tone="brand" />
                  <StatChip label="fav" value={m.favoriteCount} tone="amber" />
                  <StatChip label="lectores" value={m.readers} tone="emerald" />
                  <StatChip label="eventos" value={m.progressCount} tone="neutral" />
                  {m.lastActivity && (
                    <span className="hidden sm:inline text-fg-subtle">
                      · {new Date(m.lastActivity).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>
              <span className="hidden flex-none text-fg-subtle transition-transform group-hover:translate-x-0.5 sm:inline">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-fg-muted">
          {q ? 'Sin resultados para tu búsqueda.' : 'Aún no hay mangas registrados por usuarios.'}
        </p>
      )}

      {detailItem && (
        <AdminMangaDetail
          providerId={detailItem.providerId}
          mangaId={detailItem.mangaId}
          onClose={() => setDetailKey(null)}
        />
      )}
    </section>
  );
}

function StatChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'brand' | 'amber' | 'emerald' | 'neutral';
}) {
  const toneMap: Record<string, string> = {
    brand: 'text-brand-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    neutral: 'text-fg-muted',
  };
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={`font-bold tabular-nums ${toneMap[tone]}`}>{value}</span>
      <span className="text-fg-subtle">{label}</span>
    </span>
  );
}
