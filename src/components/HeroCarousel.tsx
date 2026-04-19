import { useEffect, useRef, useState } from 'react';

export interface HeroItem {
  id: string;
  title: string;
  coverUrl: string | null;
  tags: string[];
  year: number | null;
  status?: string;
  description?: string;
  originalLanguage?: string;
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
      className="hero-island relative mb-10 overflow-hidden rounded-2xl sm:mb-12 sm:rounded-3xl"
    >
      <div className="relative aspect-[5/4] xs:aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/8]">
        {items.map((item, i) => {
          const typeLabel =
            item.originalLanguage === 'ko'
              ? 'Manhwa'
              : item.originalLanguage === 'zh' || item.originalLanguage === 'zh-hk'
                ? 'Manhua'
                : 'Manga';
          const typeTone =
            typeLabel === 'Manhwa'
              ? 'bg-violet-500/80 ring-violet-400/30'
              : typeLabel === 'Manhua'
                ? 'bg-amber-500/80 ring-amber-400/30'
                : 'bg-sky-500/80 ring-sky-400/30';
          return (
          <div
            key={item.id}
            className={`absolute inset-0 transition-opacity duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={i !== idx}
          >
            {/* Blurred cover bg */}
            {item.coverUrl && (
              <img
                src={item.coverUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl opacity-60"
              />
            )}
            {/* Dark gradients para legibilidad */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080b] via-[#08080b]/75 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080b] via-[#08080b]/40 to-transparent"></div>

            <div className="relative z-10 flex h-full items-end sm:items-center">
              <div className="flex max-w-xl flex-col gap-2.5 p-4 xs:p-5 xs:gap-3 sm:gap-4 sm:p-8 lg:p-12">
                {/* Kicker tipo + categoria */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ring-1 backdrop-blur-sm ${typeTone}`}
                  >
                    {typeLabel}
                  </span>
                  {item.status === 'ongoing' && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"></span>
                      En curso
                    </span>
                  )}
                  {item.status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-500/30">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                      Completo
                    </span>
                  )}
                  {item.year && (
                    <span className="text-[11px] font-semibold text-fg-muted tabular-nums">{item.year}</span>
                  )}
                </div>

                {/* Title */}
                <h1 className="font-display text-xl xs:text-2xl font-black leading-[1.08] tracking-tight line-clamp-2 sm:text-3xl md:text-4xl lg:text-[2.75rem] break-words">
                  {item.title}
                </h1>

                {/* Genres pills */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-semibold text-fg-muted ring-1 ring-inset ring-white/[0.08]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description (solo desktop para no saturar mobile) */}
                {item.description && (
                  <p className="hidden text-[13.5px] leading-relaxed text-fg-muted/90 line-clamp-3 sm:block lg:text-[14px] lg:line-clamp-4">
                    {item.description}
                  </p>
                )}

                {/* CTAs */}
                <div className="mt-1 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <a href={`/manga/${item.id}`} className="btn btn-primary justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Ver
                    <span className="hidden xs:inline">&nbsp;detalles</span>
                  </a>
                  <a href="/search" className="btn btn-secondary justify-center">Explorar</a>
                </div>
              </div>

              {/* Cover derecha desktop */}
              {item.coverUrl && (
                <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 md:block lg:right-12">
                  <div className="relative">
                    <div
                      className="absolute -inset-6 -z-10 rounded-[28px] blur-2xl opacity-60"
                      style={{ background: 'radial-gradient(ellipse at center, rgb(var(--brand-500) / 0.4), transparent 70%)' }}
                    ></div>
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="h-auto w-40 rounded-xl ring-1 ring-white/10 shadow-card-lg lg:w-52 xl:w-60"
                    />
                    <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}
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
