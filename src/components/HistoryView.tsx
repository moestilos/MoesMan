import { useEffect, useMemo, useState } from 'react';
import { api, type ProgressRow } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';
import { showAlert, showConfirm } from '@/lib/dialog';

type ProviderFilter = 'all' | 'mangadex' | 'comick' | 'webtoons';
type ViewMode = 'manga' | 'chrono';
type ChartRange = '7' | '30' | '90';

function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

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
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 60) return `hace ${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d}d`;
  return fmtDate(iso);
}

function readHref(p: ProgressRow): string {
  const params = new URLSearchParams();
  params.set('manga', p.mangaId);
  params.set('p', p.providerId ?? 'mangadex');
  return `/read/${encodeURIComponent(p.chapterId)}?${params.toString()}`;
}
function mangaHref(p: { providerId?: string | null; mangaId: string }): string {
  const providerId = p.providerId ?? 'mangadex';
  return providerId === 'mangadex'
    ? `/manga/${p.mangaId}`
    : `/manga/${encodeURIComponent(p.mangaId)}?p=${providerId}`;
}

interface MangaGroup {
  key: string;
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  entries: ProgressRow[];
  latestUpdatedAt: string;
  completedCount: number;
}

function groupByManga(items: ProgressRow[]): MangaGroup[] {
  const map = new Map<string, MangaGroup>();
  for (const p of items) {
    const pid = p.providerId ?? 'mangadex';
    const key = `${pid}:${p.mangaId}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        providerId: pid,
        mangaId: p.mangaId,
        title: p.mangaTitle ?? `Manga ${p.mangaId.slice(0, 6)}`,
        coverUrl: p.mangaCoverUrl ?? null,
        entries: [],
        latestUpdatedAt: p.updatedAt,
        completedCount: 0,
      };
      map.set(key, g);
    }
    g.entries.push(p);
    if (p.totalPages && p.totalPages > 0 && p.page + 1 >= p.totalPages * 0.98) {
      g.completedCount += 1;
    }
    if (new Date(p.updatedAt) > new Date(g.latestUpdatedAt)) {
      g.latestUpdatedAt = p.updatedAt;
    }
  }
  // ordenar capítulos dentro de cada manga por número ascendente
  for (const g of map.values()) {
    g.entries.sort((a, b) => {
      const na = parseFloat(a.chapterNumber ?? 'Infinity');
      const nb = parseFloat(b.chapterNumber ?? 'Infinity');
      if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
      if (Number.isNaN(na)) return 1;
      if (Number.isNaN(nb)) return -1;
      return na - nb;
    });
  }
  return [...map.values()].sort(
    (a, b) => new Date(b.latestUpdatedAt).getTime() - new Date(a.latestUpdatedAt).getTime(),
  );
}

export default function HistoryView() {
  const [items, setItems] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProviderFilter>('all');
  const [view, setView] = useState<ViewMode>('manga');
  const [chartRange, setChartRange] = useState<ChartRange>('30');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/history';
      return;
    }
    api.progress.history(getToken()!, 500).then(setItems).catch((e: Error) => setError(e.message));
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

  async function removeManga(group: MangaGroup) {
    const ok = await showConfirm({
      title: `Quitar "${group.title}"`,
      message: `¿Borrar ${group.entries.length} ${group.entries.length === 1 ? 'capítulo' : 'capítulos'} del historial?`,
      confirmText: 'Borrar',
      tone: 'danger',
    });
    if (!ok) return;
    const token = getToken();
    if (!token) return;
    setBusyId(group.key);
    try {
      await Promise.all(
        group.entries.map((p) => api.progress.remove(token, p.providerId, p.chapterId)),
      );
      setItems((prev) =>
        prev?.filter((r) => !group.entries.some((e) => e.id === r.id)) ?? null,
      );
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
      message: '¿Seguro que quieres borrar TODO tu historial? Esta acción no se puede deshacer.',
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

  const chartData = useMemo(() => {
    if (!filtered) return null;
    const days = Number(chartRange);
    const now = new Date();
    const buckets: Array<{ day: string; label: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = dayKey(d.toISOString());
      const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      buckets.push({ day: key, label, count: 0 });
    }
    const byDay: Record<string, number> = {};
    for (const p of filtered) byDay[dayKey(p.updatedAt)] = (byDay[dayKey(p.updatedAt)] ?? 0) + 1;
    for (const b of buckets) b.count = byDay[b.day] ?? 0;
    return buckets;
  }, [filtered, chartRange]);

  const groups = useMemo(() => (filtered ? groupByManga(filtered) : null), [filtered]);

  const chronoBuckets = useMemo(() => {
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
      (i) => i.totalPages && i.totalPages > 0 && i.page + 1 >= i.totalPages * 0.98,
    ).length;
    return { today, week, uniqueMangas, completedChapters };
  }, [items]);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (error) return <p className="text-brand-300">{error}</p>;
  if (items === null) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
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
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Hoy" value={stats.today} />
          <StatCard label="Esta semana" value={stats.week} />
          <StatCard label="Series" value={stats.uniqueMangas} />
          <StatCard label="Caps. completos" value={stats.completedChapters} />
        </div>
      )}

      {/* Gráfica */}
      {chartData && <ActivityChart data={chartData} range={chartRange} onRangeChange={setChartRange} />}

      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-bg-card ring-1 ring-border p-1">
          <button
            type="button"
            onClick={() => setView('manga')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              view === 'manga' ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Por manga
          </button>
          <button
            type="button"
            onClick={() => setView('chrono')}
            className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              view === 'chrono' ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' : 'text-fg-muted hover:text-fg'
            }`}
          >
            Cronológico
          </button>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-bg-card ring-1 ring-border p-1">
          {(['all', 'mangadex', 'webtoons'] as ProviderFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                filter === f ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/30' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'mangadex' ? 'MangaDex' : 'Webtoons'}
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
      ) : view === 'manga' && groups ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <MangaSection
              key={g.key}
              group={g}
              expanded={expanded.has(g.key)}
              onToggle={() => toggleExpand(g.key)}
              onRemoveManga={() => removeManga(g)}
              onRemoveOne={removeOne}
              busyKey={busyId}
            />
          ))}
        </div>
      ) : (
        chronoBuckets && (
          <div className="space-y-10">
            {BUCKET_ORDER.map((b) => {
              const list = chronoBuckets[b];
              if (!list || list.length === 0) return null;
              return (
                <section key={b}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="section-title">{BUCKET_LABELS[b]}</h2>
                    <span className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                      {list.length} {list.length === 1 ? 'capítulo' : 'capítulos'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((p) => (
                      <HistoryCard key={p.id} p={p} busy={busyId === p.id} onRemove={() => removeOne(p)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )
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

function ActivityChart({
  data,
  range,
  onRangeChange,
}: {
  data: Array<{ day: string; label: string; count: number }>;
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);
  const avg = (total / data.length).toFixed(1);
  // Ancho dinámico por barra - mínimo 6, máximo 20
  const barWidth = range === '7' ? 36 : range === '30' ? 14 : 6;
  const gap = range === '7' ? 10 : range === '30' ? 4 : 2;
  return (
    <section className="rounded-2xl bg-bg-card/60 ring-1 ring-border p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-fg-subtle">Actividad</div>
          <h3 className="mt-0.5 font-display text-lg font-bold sm:text-xl">
            {total} {total === 1 ? 'capítulo' : 'capítulos'} <span className="text-fg-subtle font-medium">· media {avg}/día</span>
          </h3>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-bg-hover/60 ring-1 ring-border p-1">
          {(['7', '30', '90'] as ChartRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                range === r ? 'bg-brand-500/25 text-brand-200 ring-1 ring-brand-500/40' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>
      {/* Chart: scroll horizontal si no cabe. Barras SVG con altura relativa. */}
      <div className="relative overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] pb-1">
        <style>{`.chart-scroll::-webkit-scrollbar{display:none}`}</style>
        <div className="chart-scroll flex items-end gap-[var(--gap)] min-w-full"
             style={{ ['--gap' as string]: `${gap}px`, height: '120px' }}>
          {data.map((d) => {
            const h = Math.max(2, (d.count / max) * 108);
            return (
              <div
                key={d.day}
                className="relative group flex-none flex flex-col-reverse items-center"
                style={{ width: barWidth }}
                title={`${d.label}: ${d.count}`}
              >
                <div
                  className={`w-full rounded-t ${d.count > 0 ? 'bg-gradient-to-t from-brand-600 to-brand-400' : 'bg-border'}`}
                  style={{ height: `${h}px` }}
                />
                {d.count > 0 && (
                  <span className="pointer-events-none absolute -top-5 hidden group-hover:block text-[10px] font-bold tabular-nums text-brand-200">
                    {d.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Etiquetas extremos */}
      <div className="mt-1 flex justify-between text-[10px] text-fg-subtle">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </section>
  );
}

function MangaSection({
  group,
  expanded,
  onToggle,
  onRemoveManga,
  onRemoveOne,
  busyKey,
}: {
  group: MangaGroup;
  expanded: boolean;
  onToggle: () => void;
  onRemoveManga: () => void;
  onRemoveOne: (p: ProgressRow) => void;
  busyKey: string | null;
}) {
  const count = group.entries.length;
  const latest = group.entries[group.entries.length - 1];
  return (
    <div className="overflow-hidden rounded-2xl bg-bg-card/60 ring-1 ring-border">
      <div className="flex items-center gap-3 p-3">
        <a
          href={mangaHref({ providerId: group.providerId, mangaId: group.mangaId })}
          className="flex-none h-16 w-12 overflow-hidden rounded-lg bg-bg-hover ring-1 ring-border"
        >
          {group.coverUrl ? (
            <img
              src={group.coverUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
            />
          ) : null}
        </a>
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
        >
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold sm:text-[15px]">{group.title}</h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-fg-subtle">
              <span className="font-semibold text-fg-muted">
                {count} {count === 1 ? 'capítulo' : 'capítulos'}
              </span>
              {group.completedCount > 0 && (
                <>
                  <span className="opacity-40">·</span>
                  <span className="text-emerald-300">{group.completedCount} completos</span>
                </>
              )}
              <span className="opacity-40">·</span>
              <span>{timeAgo(group.latestUpdatedAt)}</span>
            </div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-none text-fg-subtle transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {/* Barra resumen: última lectura */}
      {!expanded && latest && (
        <a
          href={readHref(latest)}
          className="flex items-center justify-between border-t border-border/60 bg-bg-card/40 px-3 py-2 text-[11px] text-fg-subtle hover:bg-bg-hover/40"
        >
          <span>
            Última: <strong className="text-fg-muted">Cap. {latest.chapterNumber ?? '?'}</strong>
            {latest.totalPages && ` · Pág ${latest.page + 1}/${latest.totalPages}`}
          </span>
          <span className="font-semibold text-brand-300">Continuar →</span>
        </a>
      )}
      {expanded && (
        <div className="border-t border-border/60">
          <ul className="divide-y divide-border/40">
            {group.entries.map((p) => {
              const pct =
                p.totalPages && p.totalPages > 0
                  ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
                  : null;
              const done = pct !== null && pct >= 98;
              return (
                <li key={p.id} className="group flex items-center gap-3 px-3 py-2.5 hover:bg-bg-hover/30">
                  <a href={readHref(p)} className="flex min-w-0 flex-1 items-center gap-3 outline-none">
                    <span className="flex-none flex items-baseline gap-1 w-12">
                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-fg-subtle">Cap</span>
                      <span className="font-display text-sm font-bold tabular-nums">{p.chapterNumber ?? '?'}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-fg-subtle">
                        <span>Pág {p.page + 1}{p.totalPages ? `/${p.totalPages}` : ''}</span>
                        <span className="opacity-40">·</span>
                        <span>{fmtDate(p.updatedAt)} · {fmtTime(p.updatedAt)}</span>
                        {done && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">
                            ✓ Completo
                          </span>
                        )}
                      </div>
                      {pct !== null && !done && (
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-0.5 flex-1 max-w-[200px] overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full bg-gradient-to-r from-brand-400 to-brand-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums text-fg-muted">{pct}%</span>
                        </div>
                      )}
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveOne(p)}
                    disabled={busyKey === p.id}
                    title="Quitar capítulo"
                    className="btn-ghost h-7 px-2 text-[11px] hover:text-brand-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    {busyKey === p.id ? '…' : '×'}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end border-t border-border/60 bg-bg-card/30 px-3 py-1.5">
            <button
              type="button"
              onClick={onRemoveManga}
              disabled={busyKey === group.key}
              className="btn-ghost h-7 px-2 text-[11px] hover:text-brand-400"
            >
              {busyKey === group.key ? 'Borrando…' : 'Borrar todo este manga'}
            </button>
          </div>
        </div>
      )}
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
          ) : null}
          {done && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-emerald-500/90 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              ✓ Completo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-[15px]">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-fg-subtle">
            <span className="font-semibold text-fg-muted">Cap. {p.chapterNumber ?? '?'}</span>
            <span className="opacity-40">·</span>
            <span>Pág. {p.page + 1}{p.totalPages ? ` / ${p.totalPages}` : ''}</span>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-fg-subtle">
            {fmtDate(p.updatedAt)} · {fmtTime(p.updatedAt)}
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
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          className="btn-ghost h-7 px-2 text-[11px] hover:text-brand-400"
        >
          {busy ? '…' : 'Quitar'}
        </button>
      </div>
    </div>
  );
}
