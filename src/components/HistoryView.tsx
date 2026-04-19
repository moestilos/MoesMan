import { useEffect, useState } from 'react';
import { api, type ProgressRow } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

export default function HistoryView() {
  const [items, setItems] = useState<ProgressRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/history';
      return;
    }
    api.progress.history(getToken()!, 50).then(setItems).catch((e: Error) => setError(e.message));
  }, []);

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
    <ul className="divide-y divide-border rounded-2xl bg-bg-card ring-1 ring-border overflow-hidden">
      {items.map((p) => {
        const pct =
          p.totalPages && p.totalPages > 0
            ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
            : null;
        return (
          <li key={p.id}>
            <a
              href={`/read/${p.chapterId}?manga=${p.mangaId}`}
              className="flex items-center gap-3 px-4 py-3 transition hover:bg-bg-hover"
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
          </li>
        );
      })}
    </ul>
  );
}
