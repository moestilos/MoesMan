import { useEffect, useState } from 'react';
import { api, type LibraryEntry } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

export default function LibraryView() {
  const [items, setItems] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/library';
      return;
    }
    const token = getToken()!;
    api.library
      .list(token)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function remove(entry: LibraryEntry) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Quitar "${entry.title}" de tu biblioteca?`)) return;
    try {
      await api.library.remove(token, entry.providerId, entry.mangaId);
      setItems((prev) => prev?.filter((i) => i.id !== entry.id) ?? null);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-4 text-sm text-brand-200">
        {error}
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Tu biblioteca está vacía.</p>
        <a href="/search" className="btn-primary mt-4 inline-flex">Explorar manga</a>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
      {items.map((entry) => (
        <div
          key={entry.id}
          className="group relative block overflow-hidden rounded-xl bg-bg-card ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:ring-brand-500/50 hover:shadow-card"
        >
          <a href={`/manga/${entry.mangaId}`} className="block">
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-hover">
              <img
                src={entry.coverUrl ?? '/placeholder-cover.svg'}
                alt={entry.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/placeholder-cover.svg')}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-white drop-shadow">
                  {entry.title}
                </h3>
              </div>
            </div>
          </a>
          <button
            onClick={() => remove(entry)}
            aria-label="Quitar de la biblioteca"
            className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white/80 opacity-0 ring-1 ring-white/10 backdrop-blur transition group-hover:opacity-100 hover:bg-brand-600 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
