import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

type Mode = 'vertical' | 'paged';

interface ChapterLite {
  id: string;
  number: string | null;
  title: string | null;
  language: string;
}

interface Props {
  mangaId: string;
  mangaTitle?: string | null;
  mangaCoverUrl?: string | null;
  chapterId: string;
  pages: string[];
  chapters: ChapterLite[];
}

const LS_MODE = 'moesman:readerMode';
const progressKey = (mangaId: string, chapterId: string) =>
  `moesman:progress:${mangaId}:${chapterId}`;
const lastReadKey = (mangaId: string) => `moesman:lastRead:${mangaId}`;

export default function Reader({ mangaId, mangaTitle, mangaCoverUrl, chapterId, pages, chapters }: Props) {
  const [mode, setMode] = useState<Mode>('vertical');
  const [pageIndex, setPageIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);

  const currentIdx = useMemo(
    () => chapters.findIndex((c) => c.id === chapterId),
    [chapters, chapterId],
  );
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  useEffect(() => {
    const saved = (localStorage.getItem(LS_MODE) as Mode | null) ?? 'vertical';
    setMode(saved);
    const savedIdx = Number(localStorage.getItem(progressKey(mangaId, chapterId)) ?? '0');
    if (!Number.isNaN(savedIdx) && savedIdx < pages.length) setPageIndex(savedIdx);
    localStorage.setItem(lastReadKey(mangaId), chapterId);
  }, [mangaId, chapterId, pages.length]);

  useEffect(() => {
    localStorage.setItem(LS_MODE, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(progressKey(mangaId, chapterId), String(pageIndex));
  }, [mangaId, chapterId, pageIndex]);

  // Sync server-side (debounced) si hay sesión
  useEffect(() => {
    if (!isAuthed() || !mangaId) return;
    const token = getToken();
    if (!token) return;
    const chapterNumber = chapters.find((c) => c.id === chapterId)?.number ?? null;
    const t = setTimeout(() => {
      api.progress
        .upsert(token, {
          providerId: 'mangadex',
          mangaId,
          mangaTitle,
          mangaCoverUrl,
          chapterId,
          chapterNumber,
          page: pageIndex,
          totalPages: pages.length,
        })
        .catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [mangaId, chapterId, pageIndex, chapters, pages.length]);

  // Al montar, si hay progreso servidor más reciente, usarlo
  useEffect(() => {
    if (!isAuthed() || !mangaId) return;
    const token = getToken();
    if (!token) return;
    api.progress
      .forManga(token, 'mangadex', mangaId)
      .then((rows) => {
        const row = rows.find((r) => r.chapterId === chapterId);
        if (row && row.page >= 0 && row.page < pages.length) {
          const localRaw = localStorage.getItem(progressKey(mangaId, chapterId));
          const local = localRaw ? Number(localRaw) : 0;
          if (row.page > local) setPageIndex(row.page);
        }
      })
      .catch(() => {});
  }, [mangaId, chapterId, pages.length]);

  useEffect(() => {
    if (mode !== 'vertical') return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            setPageIndex(idx);
          }
        });
      },
      { threshold: [0.5] },
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [mode, pages.length]);

  const markLoaded = useCallback((i: number) => {
    setLoaded((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, []);

  const goPrev = useCallback(() => {
    if (pageIndex > 0) setPageIndex((i) => i - 1);
    else if (prevChapter) window.location.href = `/read/${prevChapter.id}?manga=${mangaId}`;
  }, [pageIndex, prevChapter, mangaId]);

  const goNext = useCallback(() => {
    if (pageIndex < pages.length - 1) setPageIndex((i) => i + 1);
    else if (nextChapter) window.location.href = `/read/${nextChapter.id}?manga=${mangaId}`;
  }, [pageIndex, pages.length, nextChapter, mangaId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') goPrev();
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'v') setMode((m) => (m === 'vertical' ? 'paged' : 'vertical'));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  return (
    <div className="relative min-h-screen bg-black">
      <ReaderChrome
        current={currentIdx}
        total={pages.length}
        pageIndex={pageIndex}
        mode={mode}
        setMode={setMode}
        chapters={chapters}
        chapterId={chapterId}
        mangaId={mangaId}
        prev={prevChapter}
        next={nextChapter}
      />

      {mode === 'vertical' ? (
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-0 py-4 sm:gap-1 sm:py-8 lg:py-16">
          {pages.map((src, i) => (
            <div
              key={src}
              data-idx={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              className={`relative w-full ${loaded.has(i) ? '' : 'aspect-[2/3] min-h-[420px]'}`}
            >
              {!loaded.has(i) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-[#17171a]">
                  <div className="skeleton absolute inset-0" />
                  <div className="relative z-10 flex flex-col items-center gap-2 text-white/40">
                    <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
                    </svg>
                    <span className="text-xs font-medium">Página {i + 1}</span>
                  </div>
                </div>
              )}
              <img
                src={src}
                alt={`Página ${i + 1}`}
                loading={i < 5 ? 'eager' : 'lazy'}
                fetchPriority={i < 3 ? 'high' : i < 8 ? 'auto' : 'low'}
                decoding={i < 5 ? 'sync' : 'async'}
                onLoad={() => markLoaded(i)}
                onError={() => markLoaded(i)}
                className="mx-auto block h-auto w-full max-w-full"
              />
            </div>
          ))}
          <ChapterEnd prev={prevChapter} next={nextChapter} mangaId={mangaId} />
        </div>
      ) : (
        <div
          className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl select-none items-center justify-center"
          onClick={(e) => {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const w = e.currentTarget.clientWidth;
            if (x < w * 0.35) goPrev();
            else if (x > w * 0.65) goNext();
          }}
        >
          {!loaded.has(pageIndex) && <div className="skeleton absolute inset-10 rounded" />}
          <img
            key={pages[pageIndex]}
            src={pages[pageIndex]}
            alt={`Página ${pageIndex + 1}`}
            onLoad={() => markLoaded(pageIndex)}
            className="max-h-[calc(100vh-80px)] w-auto max-w-full animate-fade-in object-contain"
          />
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/10">
            {pageIndex + 1} / {pages.length}
          </div>
        </div>
      )}
    </div>
  );
}

function ReaderChrome({
  current,
  total,
  pageIndex,
  mode,
  setMode,
  chapters,
  chapterId,
  mangaId,
  prev,
  next,
}: {
  current: number;
  total: number;
  pageIndex: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  chapters: ChapterLite[];
  chapterId: string;
  mangaId: string;
  prev: ChapterLite | null;
  next: ChapterLite | null;
}) {
  const pct = total > 0 ? Math.round(((pageIndex + 1) / total) * 100) : 0;
  const currentChap = current >= 0 ? chapters[current] : null;
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-6">
        <a
          href={`/manga/${mangaId}`}
          className="btn-ghost text-white ring-white/10 hover:ring-white/20"
          aria-label="Volver al manga"
        >
          ←
        </a>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {currentChap ? `Cap. ${currentChap.number ?? '?'}` : 'Lector'}
            {currentChap?.title ? <span className="text-white/60"> · {currentChap.title}</span> : null}
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <select
          value={chapterId}
          onChange={(e) => {
            window.location.href = `/read/${e.target.value}?manga=${mangaId}`;
          }}
          className="hidden sm:block rounded-lg bg-white/10 px-2 py-1.5 text-sm text-white ring-1 ring-white/10 focus:outline-none"
        >
          {chapters.map((c) => (
            <option key={c.id} value={c.id} className="bg-bg-card">
              Cap. {c.number ?? '?'}
              {c.title ? ` — ${c.title}` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => setMode(mode === 'vertical' ? 'paged' : 'vertical')}
          className="btn-ghost text-white ring-white/10 hover:ring-white/20 px-2 sm:px-3"
          title="Cambiar modo (v)"
          aria-label={mode === 'vertical' ? 'Modo vertical' : 'Modo paginado'}
        >
          <span className="sm:hidden" aria-hidden="true">
            {mode === 'vertical' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="1"/></svg>
            )}
          </span>
          <span className="hidden sm:inline">{mode === 'vertical' ? 'Vertical' : 'Paginado'}</span>
        </button>
        <div className="hidden md:flex gap-1">
          <a
            href={prev ? `/read/${prev.id}?manga=${mangaId}` : '#'}
            aria-disabled={!prev}
            className={`btn-ghost text-white ring-white/10 ${!prev ? 'pointer-events-none opacity-40' : ''}`}
          >
            ‹ Prev
          </a>
          <a
            href={next ? `/read/${next.id}?manga=${mangaId}` : '#'}
            aria-disabled={!next}
            className={`btn-ghost text-white ring-white/10 ${!next ? 'pointer-events-none opacity-40' : ''}`}
          >
            Next ›
          </a>
        </div>
      </div>
    </div>
  );
}

function ChapterEnd({
  prev,
  next,
  mangaId,
}: {
  prev: ChapterLite | null;
  next: ChapterLite | null;
  mangaId: string;
}) {
  return (
    <div className="mt-8 grid w-full grid-cols-2 gap-3 px-2">
      <a
        href={prev ? `/read/${prev.id}?manga=${mangaId}` : `/manga/${mangaId}`}
        className="btn-ghost ring-white/10 text-white/90 hover:text-white justify-start"
      >
        ← {prev ? `Cap. ${prev.number ?? '?'}` : 'Volver'}
      </a>
      <a
        href={next ? `/read/${next.id}?manga=${mangaId}` : `/manga/${mangaId}`}
        className="btn-primary justify-end"
      >
        {next ? `Cap. ${next.number ?? '?'} →` : 'Fin'}
      </a>
    </div>
  );
}
