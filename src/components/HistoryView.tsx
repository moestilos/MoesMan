import { useEffect, useState } from 'react';
import { api, type ProgressRow } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

export default function HistoryView() {
  const [items, setItems] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/history';
      return;
    }
    api.progress.history(getToken()!, 50).then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  async function removeOne(p: ProgressRow) {
    const token = getToken();
    if (!token) return;
    setBusyId(p.id);
    try {
      await api.progress.remove(token, p.providerId, p.chapterId);
      setItems((prev) => prev?.filter((r) => r.id !== p.id) ?? null);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function clearAll() {
    const token = getToken();
    if (!token) return;
    if (!confirm('¿Borrar TODO tu historial de lectura? Esta acción no se puede deshacer.')) return;
    setBusyId('all');
    try {
      await api.progress.clearAll(token);
      setItems([]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-brand-300">{error}</p>;
  if (items === null) {
    return (
      <ul className="divide-y divide-border rounded-2xl bg-bg-card ring-1 ring-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="skeleton h-16" />
        ))}
      </ul>
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
    <>
      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={clearAll}
          disabled={busyId === 'all'}
          className="btn-ghost text-sm"
          aria-label="Borrar todo el historial"
        >
          {busyId === 'all' ? 'Borrando…' : 'Borrar todo'}
        </button>
      </div>

      <ul className="divide-y divide-border/60 rounded-2xl bg-bg-card/60 ring-1 ring-border overflow-hidden">
        {items.map((p) => {
          const pct =
            p.totalPages && p.totalPages > 0
              ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
              : null;
          const isBusy = busyId === p.id;
          const title = p.mangaTitle ?? `Manga ${p.mangaId.slice(0, 6)}`;
          return (
            <li
              key={p.id}
              className="group flex items-stretch transition hover:bg-bg-hover/60"
            >
              <a
                href={`/read/${p.chapterId}?manga=${p.mangaId}&p=${p.providerId ?? 'mangadex'}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 sm:gap-4 sm:px-4 outline-none focus-visible:bg-bg-hover/60"
              >
                <div className="relative flex-none h-14 w-10 sm:h-16 sm:w-12 overflow-hidden rounded-md bg-bg-hover ring-1 ring-border">
                  {p.mangaCoverUrl ? (
                    <img
                      src={p.mangaCoverUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-fg-faint">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-fg">
                    {title}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-subtle">
                    <span className="font-semibold text-fg-muted">Cap. {p.chapterNumber ?? '?'}</span>
                    <span className="opacity-40">·</span>
                    <span>Pág. {p.page + 1}{p.totalPages ? ` / ${p.totalPages}` : ''}</span>
                    <span className="opacity-40 hidden sm:inline">·</span>
                    <span className="hidden sm:inline tabular-nums">{new Date(p.updatedAt).toLocaleDateString('es-ES')}</span>
                  </div>
                  {pct !== null && (
                    <div className="mt-2 h-1 w-full max-w-sm overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="hidden sm:inline text-fg-subtle transition-transform group-hover:translate-x-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </span>
              </a>
              <button
                type="button"
                onClick={() => removeOne(p)}
                disabled={isBusy}
                aria-label={`Quitar capítulo ${p.chapterNumber ?? ''} del historial`}
                title="Quitar del historial"
                className="flex-none flex items-center justify-center px-3 text-fg-subtle transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 hover:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                {isBusy ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
