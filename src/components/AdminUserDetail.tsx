import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth-client';

interface LibItem {
  id: string;
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  addedAt: string;
  favorite: boolean;
}

interface ProgressItem {
  providerId: string;
  mangaId: string;
  mangaTitle: string | null;
  mangaCoverUrl: string | null;
  chapterNumber: string | null;
  page: number;
  totalPages: number | null;
  updatedAt: string;
}

interface UserDetail {
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    createdAt: string;
  };
  library: LibItem[];
  favoritesCount: number;
  recentProgress: ProgressItem[];
}

function mangaHref(providerId: string, mangaId: string): string {
  return providerId === 'mangadex'
    ? `/manga/${mangaId}`
    : `/manga/${encodeURIComponent(mangaId)}?p=${providerId}`;
}

export default function AdminUserDetail({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`/api/admin/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [userId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)',
        paddingLeft: 'max(env(safe-area-inset-left), 0.5rem)',
        paddingRight: 'max(env(safe-area-inset-right), 0.5rem)',
      }}
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl bg-bg-card ring-1 ring-border shadow-card-lg animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
          {data?.user?.avatarUrl ? (
            <img
              src={data.user.avatarUrl}
              alt={data.user.username}
              className="h-12 w-12 rounded-2xl object-cover ring-1 ring-border"
            />
          ) : data ? (
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-lg font-black text-white">
              {data.user.username[0]?.toUpperCase() ?? '?'}
            </span>
          ) : (
            <div className="h-12 w-12 rounded-2xl skeleton" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-display text-lg font-bold sm:text-xl">
              {data ? data.user.username : 'Cargando…'}
            </h2>
            {data && <p className="truncate text-xs text-fg-muted">{data.user.email}</p>}
            {data && (
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-fg-subtle">
                Registrado {new Date(data.user.createdAt).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="btn-ghost h-9 w-9 p-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {error && (
            <div className="rounded-xl border border-brand-500/40 bg-brand-500/10 p-4 text-sm text-brand-200">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Stats compactas */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                <StatPill label="Biblioteca" value={data.library.length} />
                <StatPill label="Favoritos" value={data.favoritesCount} />
                <StatPill label="Prog. recientes" value={data.recentProgress.length} />
              </div>

              {/* Library */}
              <section className="mb-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-fg-subtle">
                  Biblioteca · {data.library.length}
                </h3>
                {data.library.length === 0 ? (
                  <p className="py-6 text-center text-sm text-fg-muted">Biblioteca vacía.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3 xs:grid-cols-4 sm:grid-cols-5 lg:grid-cols-6">
                    {data.library.map((m) => (
                      <a
                        key={m.id}
                        href={mangaHref(m.providerId, m.mangaId)}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-lg bg-bg-hover ring-1 ring-border transition hover:ring-brand-500/50"
                      >
                        <div className="relative aspect-[2/3] w-full">
                          {m.coverUrl ? (
                            <img
                              src={m.coverUrl}
                              alt={m.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
                            />
                          ) : null}
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          {m.favorite && (
                            <span className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/90 text-white ring-1 ring-rose-300/30" title="Favorito">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21s-7-4.5-9.5-9a5.5 5.5 0 0 1 9.5-5 5.5 5.5 0 0 1 9.5 5C19 16.5 12 21 12 21z"/>
                              </svg>
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-1.5">
                            <h4 className="line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow">
                              {m.title}
                            </h4>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent progress */}
              {data.recentProgress.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-fg-subtle">
                    Lectura reciente
                  </h3>
                  <ul className="divide-y divide-border/40 rounded-xl bg-bg-hover/40 ring-1 ring-border">
                    {data.recentProgress.map((p, i) => {
                      const pct =
                        p.totalPages && p.totalPages > 0
                          ? Math.min(100, Math.round(((p.page + 1) / p.totalPages) * 100))
                          : null;
                      return (
                        <li key={i} className="flex items-center gap-3 px-3 py-2">
                          {p.mangaCoverUrl && (
                            <img
                              src={p.mangaCoverUrl}
                              alt=""
                              className="h-10 w-7 flex-none rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.mangaTitle ?? 'Manga'}</div>
                            <div className="mt-0.5 text-[11px] text-fg-subtle">
                              Cap. {p.chapterNumber ?? '?'} · Pág {p.page + 1}
                              {p.totalPages ? `/${p.totalPages}` : ''}
                              {pct !== null && ` · ${pct}%`}
                            </div>
                          </div>
                          <span className="text-[10px] text-fg-subtle tabular-nums">
                            {new Date(p.updatedAt).toLocaleDateString('es-ES')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          )}

          {!data && !error && (
            <div className="grid grid-cols-3 gap-3 xs:grid-cols-4 sm:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="skeleton aspect-[2/3] rounded-lg" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-bg-hover/40 ring-1 ring-border px-3 py-2 text-center">
      <div className="font-display text-xl font-black tabular-nums">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-fg-subtle">{label}</div>
    </div>
  );
}
