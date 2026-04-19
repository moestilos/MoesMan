import { useEffect, useRef, useState } from 'react';

export interface HeroItem {
  id: string;
  title: string;
  coverUrl: string | null;
  tags: string[];
  year: number | null;
  status?: string;
}

interface Props {
  items: HeroItem[];
  intervalMs?: number;
}

export default function HeroCarousel({ items, intervalMs = 7000 }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timer.current = window.setTimeout(() => {
      setIdx((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idx, paused, items.length, intervalMs]);

  if (items.length === 0) return null;

  const go = (n: number) => setIdx((n + items.length) % items.length);

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative mb-10 overflow-hidden rounded-2xl ring-1 ring-border bg-bg-card/40 sm:mb-12 sm:rounded-3xl"
    >
      <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:aspect-[21/9]">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={i !== idx}
          >
            {item.coverUrl && (
              <img
                src={item.coverUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-70"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/70 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent"></div>

            <div className="relative z-10 flex h-full items-end sm:items-center">
              <div className="flex max-w-xl flex-col gap-3 p-5 sm:gap-4 sm:p-8 lg:p-12">
                <span className="section-kicker">Destacado</span>
                <h1 className="font-display text-2xl font-black leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                  {item.title}
                </h1>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 4).map((t) => (
                      <span key={t} className="badge-muted">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <a href={`/manga/${item.id}`} className="btn btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Ver detalles
                  </a>
                  <a href="/search" className="btn btn-secondary">Explorar</a>
                </div>
              </div>

              {item.coverUrl && (
                <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 md:block lg:right-12">
                  <div className="relative">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="h-auto w-44 rounded-xl ring-1 ring-white/10 shadow-card-lg lg:w-56 xl:w-64"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 ring-1 ring-white/10 backdrop-blur md:bottom-5 md:left-8 md:translate-x-0">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir al slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      )}

      {/* Nav arrows (desktop) */}
      {items.length > 1 && (
        <div className="pointer-events-none absolute inset-y-0 right-3 z-20 hidden items-center md:flex lg:right-5">
          <div className="pointer-events-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="Anterior"
              className="btn-icon"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="Siguiente"
              className="btn-icon"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
