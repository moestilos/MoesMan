import { useEffect, useState } from 'react';
import { api, type ProgressRow } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

interface Entry {
  progress: ProgressRow;
  title: string;
  coverUrl: string | null;
}

export default function ContinueReading() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAuthed()) return;
    setVisible(true);
    const token = getToken()!;
    (async () => {
      try {
        const [history, library] = await Promise.all([
          api.progress.history(token, 12),
          api.library.list(token),
        ]);
        const byManga = new Map<string, ProgressRow>();
        for (const p of history) {
          const key = `${p.providerId}:${p.mangaId}`;
          if (!byManga.has(key)) byManga.set(key, p);
        }
        const libIndex = new Map(
          library.map((l) => [`${l.providerId}:${l.mangaId}`, l]),
        );
        const items: Entry[] = [...byManga.values()].map((p) => {
          const lib = libIndex.get(`${p.providerId}:${p.mangaId}`);
          return {
            progress: p,
            title: lib?.title ?? p.mangaTitle ?? `Manga ${p.mangaId.slice(0, 6)}`,
            coverUrl: lib?.coverUrl ?? p.mangaCoverUrl ?? null,
          };
        });
        setEntries(items);
      } catch {
        setEntries([]);
      }
    })();
  }, []);

  if (!visible || !entries || entries.length === 0) return null;

  return (
    <section className="mb-12 animate-fade-in">
      <header className="mb-4 flex items-end justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Continuar leyendo</h2>
        <a href="/history" className="text-sm link-hover text-fg-muted">Historial →</a>
      </header>

      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((e) => {
          const pct =
            e.progress.totalPages && e.progress.totalPages > 0
              ? Math.min(100, Math.round(((e.progress.page + 1) / e.progress.totalPages) * 100))
              : 0;
          return (
            <a
              key={e.progress.id}
              href={`/read/${e.progress.chapterId}?manga=${e.progress.mangaId}`}
              className="group relative flex-none w-[72vw] max-w-[260px] sm:w-[240px] snap-start overflow-hidden rounded-xl bg-bg-card ring-1 ring-border transition hover:-translate-y-1 hover:ring-brand-500/50 hover:shadow-card"
            >
              <div className="relative aspect-video w-full bg-bg-hover overflow-hidden">
                {e.coverUrl && (
                  <img
                    src={e.coverUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full scale-110 object-cover blur-sm opacity-70 transition-all duration-500 group-hover:scale-105 group-hover:blur-0 group-hover:opacity-100"
                    onError={(ev) => ((ev.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="text-xs font-semibold text-white/90">
                    Cap. {e.progress.chapterNumber ?? '?'}
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white/10">
                    <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600/90 text-white shadow-glow backdrop-blur transition group-hover:scale-110">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </span>
              </div>
              <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-semibold">{e.title}</h3>
                <p className="mt-0.5 text-xs text-fg-subtle">
                  Pág. {e.progress.page + 1}{e.progress.totalPages ? ` / ${e.progress.totalPages}` : ''}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
