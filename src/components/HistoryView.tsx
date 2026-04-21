import { useEffect, useMemo, useState } from 'react';
import { api, type ProgressRow } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';
import { showAlert, showConfirm } from '@/lib/dialog';

type ProviderFilter = 'all' | 'mangadex' | 'comick' | 'webtoons';

function bucketOf(updatedAt: string): 'today' | 'yesterday' | 'week' | 'older' {
  const now = new Date();
  const then = new Date(updatedAt);
  const msPerDay = 86400_000;
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffStart = startToday - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  if (diffStart <= 0) return 'today';
  if (diffStart <= msPerDay) return 'yesterday';
  if (diffStart <= 7 * msPerDay) return 'week';
  return 'older';
}

const BUCKET_LABELS: Record<ReturnType<typeof bucketOf>, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta semana',
  older: 'Hace tiempo',
};

const BUCKET_ORDER: Array<ReturnType<typeof bucketOf>> = ['today', 'yesterday', 'week', 'older'];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function readHref(p: ProgressRow): string {
  const params = new URLSearchParams();
  params.set('manga', p.mangaId);
  params.set('p', p.providerId ?? 'mangadex');
  return `/read/${encodeURIComponent(p.chapterId)}?${params.toString()}`;
}

function mangaHref(p: ProgressRow): string {
  const providerId = p.providerId ?? 'mangadex';
  return providerId === 'mangadex'
    ? `/manga/${p.mangaId}`
    : `/manga/${encodeURIComponent(p.mangaId)}?p=${providerId}`;
}

export default function HistoryView() {
  const [items, setItems] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProviderFilter>('all');

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/history';
      return;
    }
    api.progress.history(getToken()!, 100).then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  async function removeOne(p: ProgressRow) {
    const token = getToken();
    if (!token) return;
    setBusyId(p.id);
    try {
      await api.progress.remove(token, p.providerId, p.chapterId);
      setItems((prev) => prev?.filter((r) => r.id !== p.id) ?? null);
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    const token = getToken();
    if (!token) return;
    const ok = await showConfirm({
      title: 'Borrar historial',
      message: '¿Seguro que quieres borrar TODO tu historial de lectura? Esta acción no se puede deshacer.',
      confirmText: 'Borrar todo',
      tone: 'danger',
    });
    if (!ok) return;
    setBusyId('all');
    try {
      await api.progress.clearAll(token);
      setItems([]);
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!items) return null;
    if (filter === 'all') return items;
    return items.filter((i) => (i.providerId ?? 'mangadex') === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    if (!filtered) return null;
    const by: Record<string, ProgressRow[]> = { today: [], yesterday: [], week: [], older: [] };
    for (const p of filtered) by[bucketOf(p.updatedAt)].push(p);
    return by;
  }, [filtered]);

  const stats = useMemo(() => {
    if (!items) return null;
    const today = items.filter((i) => bucketOf(i.updatedAt) === 'today').length;
    const week = items.filter((i) => {
      const b = bucketOf(i.updatedAt);
      return b === 'today' || b === 'yesterday' || b === 'week';
    }).length;
    const uniqueMangas = new Set(items.map((i) => `${i.providerId}:${i.mangaId}`)).size;
    const completedChapters = items.filter(
      (i) => i.totalPages && i.totalPages > 0 && i.page + 1 >= i.totalPages,
    ).length;
    return { today, week, uniqueMangas, completedChapters };
  }, [items]);

  if (error) return <p className="text-brand-300">{error}</p>;
  if (items === null) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card ring-1 ring-border text-fg-subtle">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v5h5"/>
            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/>
            <path d="M12 7v5l4 2"/>
          </svg>
        </span>
        <div>
          <p className="font-semibold text-fg">Sin historial aún</p>
          <p className="mt-1 text-sm text-fg-muted">Empieza a leer y verás tu progreso aquí.</p>
        </div>
        <a href="/search" className="btn-primary">Buscar manga</a>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Leídos hoy" value={stats.today} />
          <StatCard label="Esta semana" value={stats.week} />
          <StatCard label="Series" value={stats.uniqueMangas} />
          <StatCard label="Caps. completos" value={stats.completedChapters} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-bg-card ring-1 ring-border p-1">
          {(['all', 'mangadex', 'webtoons', 'comick'] as ProviderFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'mangadex' ? 'MangaDex' : f === 'webtoons' ? 'Webtoons' : 'ComicK'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={clearAll}
          disabled={busyId === 'all'}
          className="btn-ghost text-sm"
        >
          {busyId === 'all' ? 'Borrando…' : 'Borrar todo'}
        </button>
      </div>

      {filtered && filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-fg-muted">Nada en este filtro.</p>
      ) : (
        <div className="space-y-10">
          {grouped && BUCKET_ORDER.map((bucket) => {
            const list = grouped[bucket];
            if (!list || list.length === 0) return null;
            return (
              <section key={bucket}>
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="section-title">{BUCKET_LABELS[bucket]}</h2>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                    {list.length} {list.length === 1 ? 'capítulo' : 'capítulos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <HistoryCard
                      key={p.id}
                      p={p}
                      busy={busyId === p.id}
                      onRemove={() => removeOne(p)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-bg-card/60 ring-1 ring-border px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-fg-subtle">{label}</div>
      <div className="mt-1 font-display text-2xl sm:text-3xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function HistoryCard({
  p,
  busy,
  onRemove,
}: {
  p: ProgressRow;
  busy: boolean;
  onRemove: () => void;
}) {
  const pct =
    p.totalPages && p.totalPages > 0
      ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
      : null;
  const title = p.mangaTitle ?? `Manga ${p.mangaId.slice(0, 6)}`;
  const done = pct !== null && pct >= 98;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-bg-card/60 ring-1 ring-border transition hover:ring-brand-500/40 hover:shadow-card">
      {p.mangaCoverUrl && (
        <div className="pointer-events-none absolute inset-0 -z-0">
          <img
            src={p.mangaCoverUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-110 object-cover blur-2xl opacity-30"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
          <div className="absolute inset-0 bg-bg-card/60" />
        </div>
      )}
      <a href={readHref(p)} className="relative z-10 flex gap-3 p-3 outline-none">
        <div className="relative flex-none h-28 w-20 overflow-hidden rounded-lg bg-bg-hover ring-1 ring-border sm:h-32 sm:w-24">
          {p.mangaCoverUrl ? (
            <img
              src={p.mangaCoverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-fg-faint">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
          )}
          {done && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-emerald-500/90 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="m9 16.17-4.17-4.17L3.41 13.41 9 19l12-12-1.41-1.41z"/></svg>
              Completo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-[15px]">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-fg-subtle">
            <span className="font-semibold text-fg-muted">Cap. {p.chapterNumber ?? '?'}</span>
            <span className="opacity-40">·</span>
            <span>Pág. {p.page + 1}{p.totalPages ? ` / ${p.totalPages}` : ''}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
            {fmtDate(p.updatedAt)} · {fmtTime(p.updatedAt)} · {p.providerId ?? 'mangadex'}
          </div>
          {pct !== null && (
            <div className="mt-auto pt-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      done
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                        : 'bg-gradient-to-r from-brand-400 to-brand-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-fg-muted">{pct}%</span>
              </div>
            </div>
          )}
        </div>
      </a>
      <div className="relative z-20 flex justify-end gap-1 border-t border-border/60 bg-bg-card/40 px-2 py-1.5">
        <a
          href={mangaHref(p)}
          className="btn-ghost h-7 px-2 text-[11px]"
          title="Ver detalle"
        >
          Detalle
        </a>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          title="Quitar del historial"
          className="btn-ghost h-7 px-2 text-[11px] hover:text-brand-400"
        >
          {busy ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
            </svg>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
              </svg>
              Quitar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
