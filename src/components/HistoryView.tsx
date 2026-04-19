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
    return <p className="py-12 text-center text-fg-muted">Aún no has leído nada.</p>;
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

      <ul className="divide-y divide-border rounded-2xl bg-bg-card ring-1 ring-border overflow-hidden">
        {items.map((p) => {
          const pct =
            p.totalPages && p.totalPages > 0
              ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
              : null;
          const isBusy = busyId === p.id;
          return (
            <li
              key={p.id}
              className="group flex items-stretch transition hover:bg-bg-hover"
            >
              <a
                href={`/read/${p.chapterId}?manga=${p.mangaId}`}
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    Capítulo {p.chapterNumber ?? '?'}
                  </div>
                  <div className="mt-0.5 text-xs text-fg-subtle">
                    Pág. {p.page + 1}{p.totalPages ? ` / ${p.totalPages}` : ''} ·{' '}
                    {new Date(p.updatedAt).toLocaleString('es-ES')}
                  </div>
                  {pct !== null && (
                    <div className="mt-1.5 h-1 w-full max-w-xs overflow-hidden rounded bg-border">
                      <div
                        className="h-full bg-brand-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-fg-subtle">›</span>
              </a>
              <button
                type="button"
                onClick={() => removeOne(p)}
                disabled={isBusy}
                aria-label={`Quitar capítulo ${p.chapterNumber ?? ''} del historial`}
                title="Quitar del historial"
                className="flex-none flex items-center justify-center px-3 text-fg-subtle opacity-0 transition group-hover:opacity-100 hover:text-brand-400 focus:opacity-100"
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
