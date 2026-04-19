import { useEffect, useRef, useState } from 'react';

interface Summary {
  id: string;
  title: string;
  coverUrl: string | null;
  year: number | null;
  status?: string;
}

const PAGE_SIZE = 24;

export default function SearchResults({ query }: { query: string }) {
  const [items, setItems] = useState<Summary[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  async function fetchPage(reset = false) {
    if (loading || (done && !reset)) return;
    setLoading(true);
    setError(null);
    try {
      const nextOffset = reset ? 0 : offset;
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(query)}&limit=${PAGE_SIZE}&offset=${nextOffset}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const data: Summary[] = body.data ?? [];
      setItems((prev) => (reset ? data : [...prev, ...data]));
      setOffset(nextOffset + data.length);
      if (data.length < PAGE_SIZE) setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setDone(false);
    if (query) fetchPage(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!sentinel.current || done) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchPage();
      },
      { rootMargin: '400px' },
    );
    io.observe(sentinel.current);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, done, loading]);

  return (
    <>
      {error && (
        <div className="mb-6 rounded-xl border border-brand-500/40 bg-brand-500/10 p-4 text-sm text-brand-200">
          {error}
        </div>
      )}

      {items.length === 0 && !loading && !error && (
        <p className="py-16 text-center text-fg-muted">Sin resultados. Prueba otros términos.</p>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 animate-fade-in">
          {items.map((m, i) => (
            <a
              key={m.id}
              href={`/manga/${m.id}`}
              className="group relative block overflow-hidden rounded-xl bg-bg-card ring-1 ring-border transition-all duration-300 hover:-translate-y-1 hover:ring-brand-500/50 hover:shadow-card"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-hover">
                <img
                  src={m.coverUrl ?? '/placeholder-cover.svg'}
                  alt={m.title}
                  loading={i < 6 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).src = '/placeholder-cover.svg')}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <h3 className="line-clamp-2 text-sm font-semibold text-white drop-shadow">{m.title}</h3>
                  {m.year && <p className="mt-0.5 text-[11px] text-white/70">{m.year}</p>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
          ))}
        </div>
      )}

      {!done && <div ref={sentinel} className="h-10" />}

      {done && items.length > 0 && (
        <p className="mt-10 text-center text-xs text-fg-subtle">Fin de resultados.</p>
      )}
    </>
  );
}
