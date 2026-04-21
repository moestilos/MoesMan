import { useEffect, useState } from 'react';

interface Item {
  id: string;
  providerId: string;
  title: string;
  coverUrl: string | null;
  tags: string[];
  originalLanguage?: string;
  status?: string;
}

export default function WebtoonsRail() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    fetch('/api/browse?provider=webtoons&type=popular&limit=12')
      .then((r) => r.json())
      .then((b) => setItems(b.data ?? []))
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <div className="rail">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-[42vw] max-w-[200px] xs:w-[30vw] sm:w-[180px] lg:w-[160px]">
            <div className="skeleton aspect-[2/3] rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="rail">
      {items.map((m, i) => (
        <a
          key={m.id}
          href={`/manga/${encodeURIComponent(m.id)}?p=${m.providerId}`}
          className="group relative block w-[42vw] max-w-[200px] xs:w-[30vw] sm:w-[180px] lg:w-[160px] overflow-hidden rounded-xl bg-bg-card ring-1 ring-border transition hover:-translate-y-1 hover:ring-brand-500/50 hover:shadow-card"
        >
          <div className="relative aspect-[2/3] w-full overflow-hidden bg-bg-hover">
            {m.coverUrl && (
              <img
                src={m.coverUrl}
                alt={m.title}
                loading={i < 3 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-violet-500/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white ring-1 ring-violet-400/30 backdrop-blur-sm">
              Manhwa
            </span>
            <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
              <h3 className="line-clamp-2 text-[12px] sm:text-[13px] font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {m.title}
              </h3>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
