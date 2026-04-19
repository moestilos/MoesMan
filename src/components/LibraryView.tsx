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
      <div className="grid gap-3 sm:gap-4 lg:gap-5 grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card ring-1 ring-border text-fg-subtle">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </span>
        <div>
          <p className="font-semibold text-fg">Tu biblioteca está vacía</p>
          <p className="mt-1 text-sm text-fg-muted">Guarda mangas para verlos aquí.</p>
        </div>
        <a href="/search" className="btn-primary">Explorar manga</a>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:gap-5 grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 animate-fade-in">
      {items.map((entry) => (
        <div
          key={entry.id}
          className="group relative block overflow-hidden rounded-xl bg-bg-card ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:ring-brand-500/50 hover:shadow-card focus-within:ring-brand-500/60"
        >
          <a
            href={`/manga/${entry.mangaId}`}
            className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 rounded-xl"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-hover">
              <img
                src={entry.coverUrl ?? '/placeholder-cover.svg'}
                alt={entry.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/placeholder-cover.svg')}
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
              <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                <h3 className="line-clamp-2 text-[13px] sm:text-sm font-semibold text-white drop-shadow">
                  {entry.title}
                </h3>
              </div>
            </div>
          </a>
          <button
            onClick={() => remove(entry)}
            aria-label="Quitar de la biblioteca"
            className="absolute top-2 right-2 rounded-full bg-black/75 p-1.5 text-white/90 ring-1 ring-white/10 backdrop-blur transition md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-500/60 hover:bg-brand-600 hover:text-white"
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
