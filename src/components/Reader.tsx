import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';

type Mode = 'vertical' | 'paged';

interface ChapterLite {
  id: string;
  number: string | null;
  title: string | null;
  language: string;
  providerId: string;
}

interface Props {
  mangaId: string;
  mangaTitle?: string | null;
  mangaCoverUrl?: string | null;
  chapterId: string;
  pages: string[];
  chapters: ChapterLite[];
  ckHid?: string | null;
}

function buildReadHref(c: ChapterLite, mangaId: string, ckHid?: string | null): string {
  const qp = new URLSearchParams();
  qp.set('manga', mangaId);
  qp.set('p', c.providerId);
  if (ckHid) qp.set('ck', ckHid);
  return `/read/${c.id}?${qp.toString()}`;
}

const LS_MODE = 'moesman:readerMode';
const progressKey = (mangaId: string, chapterId: string) =>
  `moesman:progress:${mangaId}:${chapterId}`;
const lastReadKey = (mangaId: string) => `moesman:lastRead:${mangaId}`;

export default function Reader({ mangaId, mangaTitle, mangaCoverUrl, chapterId, pages: initialPages, chapters, ckHid }: Props) {
  const [mode, setMode] = useState<Mode>('vertical');
  const [pageIndex, setPageIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const [pages, setPages] = useState<string[]>(initialPages);
  const [reloadingPages, setReloadingPages] = useState(false);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const currentChap = chapters.find((c) => c.id === chapterId);
  const currentProvider = currentChap?.providerId ?? 'mangadex';

  async function reloadPagesFromServer() {
    if (reloadingPages) return;
    setReloadingPages(true);
    try {
      const res = await fetch(`/api/chapter-pages/${encodeURIComponent(chapterId)}?p=${currentProvider}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (Array.isArray(body.pages) && body.pages.length > 0) {
        setPages(body.pages);
        setLoaded(new Set());
      }
    } catch {
      // silencioso
    } finally {
      setReloadingPages(false);
    }
  }

  const currentIdx = useMemo(
    () => chapters.findIndex((c) => c.id === chapterId),
    [chapters, chapterId],
  );
  const prevChapter = currentIdx > 0 ? chapters[currentIdx - 1] : null;
  const nextChapter = currentIdx >= 0 && currentIdx < chapters.length - 1 ? chapters[currentIdx + 1] : null;

  // Auto-recargar desde servidor si primera página no carga en 15s (token at-home muerto)
  useEffect(() => {
    if (currentProvider !== 'mangadex') return;
    const t = setTimeout(() => {
      if (loaded.size === 0) reloadPagesFromServer();
    }, 15_000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

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
    const current = chapters.find((c) => c.id === chapterId);
    const chapterNumber = current?.number ?? null;
    const chapterProviderId = current?.providerId ?? 'mangadex';
    const t = setTimeout(() => {
      api.progress
        .upsert(token, {
          providerId: chapterProviderId,
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
    else if (prevChapter) window.location.href = buildReadHref(prevChapter, mangaId, ckHid);
  }, [pageIndex, prevChapter, mangaId]);

  const goNext = useCallback(() => {
    if (pageIndex < pages.length - 1) setPageIndex((i) => i + 1);
    else if (nextChapter) window.location.href = buildReadHref(nextChapter, mangaId, ckHid);
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
        ckHid={ckHid}
        prev={prevChapter}
        next={nextChapter}
        onReloadPages={currentProvider === 'mangadex' ? reloadPagesFromServer : undefined}
        reloading={reloadingPages}
      />

      {mode === 'vertical' ? (
        <div className="mx-auto flex max-w-3xl lg:max-w-4xl flex-col items-center gap-0 py-4 sm:gap-1 sm:py-8 lg:py-12">
          {pages.map((src, i) => (
            <PageImg
              key={src}
              src={src}
              index={i}
              loaded={loaded.has(i)}
              onLoaded={() => markLoaded(i)}
              pageRef={(el) => (pageRefs.current[i] = el)}
              priority={i < 5}
            />
          ))}
          <ChapterEnd prev={prevChapter} next={nextChapter} mangaId={mangaId} ckHid={ckHid} />
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
          <PagedImg
            src={pages[pageIndex]}
            index={pageIndex}
            onLoaded={() => markLoaded(pageIndex)}
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
  ckHid,
  prev,
  next,
  onReloadPages,
  reloading,
}: {
  current: number;
  total: number;
  pageIndex: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  chapters: ChapterLite[];
  chapterId: string;
  mangaId: string;
  ckHid?: string | null;
  prev: ChapterLite | null;
  next: ChapterLite | null;
  onReloadPages?: () => void;
  reloading?: boolean;
}) {
  const pct = total > 0 ? Math.round(((pageIndex + 1) / total) * 100) : 0;
  const currentChap = current >= 0 ? chapters[current] : null;
  return (
    <div
      className="sticky top-0 z-30 border-b border-white/10 bg-black/60 backdrop-blur-xl"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex h-14 items-center gap-2 px-3 sm:px-6"
        style={{ paddingLeft: 'max(0.75rem, var(--safe-left))', paddingRight: 'max(0.75rem, var(--safe-right))' }}
      >
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
            const target = chapters.find((c) => c.id === e.target.value);
            if (target) window.location.href = buildReadHref(target, mangaId, ckHid);
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
        {onReloadPages && (
          <button
            onClick={onReloadPages}
            disabled={reloading}
            className="btn-ghost text-white ring-white/10 hover:ring-white/20 px-2 sm:px-3 disabled:opacity-50"
            title="Recargar páginas (nuevo servidor)"
            aria-label="Recargar páginas"
          >
            {reloading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            )}
          </button>
        )}
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
            href={prev ? buildReadHref(prev, mangaId, ckHid) : '#'}
            aria-disabled={!prev}
            className={`btn-ghost text-white ring-white/10 ${!prev ? 'pointer-events-none opacity-40' : ''}`}
          >
            ‹ Prev
          </a>
          <a
            href={next ? buildReadHref(next, mangaId, ckHid) : '#'}
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

function PageImg({
  src,
  index,
  loaded,
  onLoaded,
  pageRef,
  priority,
}: {
  src: string;
  index: number;
  loaded: boolean;
  onLoaded: () => void;
  pageRef: (el: HTMLDivElement | null) => void;
  priority: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loaded) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    // Watchdog: si no carga en 30s, marcar fallo para poder reintentar
    timerRef.current = setTimeout(() => {
      setFailed(true);
    }, 30_000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [loaded, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((a) => a + 1);
  }

  const finalSrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${attempt}`;

  return (
    <div
      data-idx={index}
      ref={pageRef}
      className={`relative w-full ${loaded ? '' : 'aspect-[2/3] min-h-[420px]'}`}
    >
      {!loaded && !failed && (
        <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-[#17171a]">
          <div className="skeleton absolute inset-0" />
          <div className="relative z-10 flex flex-col items-center gap-2 text-white/40">
            <svg className="h-8 w-8 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M21 12a9 9 0 1 1-6.22-8.56" />
            </svg>
            <span className="text-xs font-medium">Página {index + 1}</span>
          </div>
        </div>
      )}
      {failed && !loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-sm bg-[#17171a] ring-1 ring-white/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white/40">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/>
          </svg>
          <p className="text-xs text-white/60">No se pudo cargar la página {index + 1}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 ring-1 ring-white/15"
          >
            Reintentar
          </button>
        </div>
      )}
      <img
        key={finalSrc}
        src={finalSrc}
        alt={`Página ${index + 1}`}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={index < 3 ? 'high' : index < 8 ? 'auto' : 'low'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => {
          setFailed(false);
          onLoaded();
        }}
        onError={() => {
          if (attempt < 2) {
            // Reintentar automático con cache-bust
            setAttempt((a) => a + 1);
          } else {
            setFailed(true);
          }
        }}
        className="mx-auto block h-auto w-full max-w-full"
      />
    </div>
  );
}

function PagedImg({ src, index, onLoaded }: { src: string; index: number; onLoaded: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setAttempt(0);
    setFailed(false);
  }, [src]);

  const finalSrc = attempt === 0 ? src : `${src}${src.includes('?') ? '&' : '?'}r=${attempt}`;

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 text-white/70">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v5"/><path d="M12 16h.01"/>
        </svg>
        <p className="text-sm">No se pudo cargar la página {index + 1}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
          className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/20"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <img
      key={finalSrc}
      src={finalSrc}
      alt={`Página ${index + 1}`}
      onLoad={onLoaded}
      onError={() => {
        if (attempt < 2) setAttempt((a) => a + 1);
        else setFailed(true);
      }}
      className="max-h-[calc(100vh-80px)] w-auto max-w-full animate-fade-in object-contain"
    />
  );
}

function ChapterEnd({
  prev,
  next,
  mangaId,
  ckHid,
}: {
  prev: ChapterLite | null;
  next: ChapterLite | null;
  mangaId: string;
  ckHid?: string | null;
}) {
  return (
    <div className="mt-8 grid w-full grid-cols-2 gap-3 px-2">
      <a
        href={prev ? buildReadHref(prev, mangaId, ckHid) : `/manga/${mangaId}`}
        className="btn-ghost ring-white/10 text-white/90 hover:text-white justify-start"
      >
        ← {prev ? `Cap. ${prev.number ?? '?'}` : 'Volver'}
      </a>
      <a
        href={next ? buildReadHref(next, mangaId, ckHid) : `/manga/${mangaId}`}
        className="btn-primary justify-end"
      >
        {next ? `Cap. ${next.number ?? '?'} →` : 'Fin'}
      </a>
    </div>
  );
}
