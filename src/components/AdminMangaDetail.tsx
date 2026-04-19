import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth-client';

interface UserLite {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string | null;
  addedAt?: string;
}

interface Reader {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  chapterNumber: string | null;
  page: number;
  totalPages: number | null;
  pct: number | null;
  updatedAt: string;
}

interface Detail {
  providerId: string;
  mangaId: string;
  title: string;
  coverUrl: string | null;
  stats: {
    libraryCount: number;
    favoriteCount: number;
    progressCount: number;
    readers: number;
    avgProgress: number | null;
  };
  library: UserLite[];
  favoritedBy: Array<{ userId: string; username: string; addedAt: string }>;
  readers: Reader[];
  chaptersRead: Array<{ chapterId: string; chapterNumber: string | null; count: number }>;
}

interface Props {
  providerId: string;
  mangaId: string;
  onClose: () => void;
}

type Tab = 'users' | 'readers' | 'chapters';

export default function AdminMangaDetail({ providerId, mangaId, onClose }: Props) {
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('users');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch(`/api/admin/manga/${providerId}/${mangaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [providerId, mangaId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/75 p-3 backdrop-blur-sm animate-fade-in sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-bg-card ring-1 ring-border shadow-card-lg animate-slide-up">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="btn-icon absolute right-3 top-3 z-10"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>

        {error && (
          <div className="p-6 text-sm text-brand-300">{error}</div>
        )}
        {!data && !error && (
          <div className="space-y-3 p-6">
            <div className="skeleton h-32 rounded-xl" />
            <div className="skeleton h-10 rounded-lg" />
            <div className="skeleton h-40 rounded-xl" />
          </div>
        )}

        {data && (
          <>
            {/* Header */}
            <header className="relative p-5 sm:p-6">
              {data.coverUrl && (
                <div className="absolute inset-0 -z-10 overflow-hidden">
                  <img
                    src={data.coverUrl}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full scale-110 object-cover opacity-30 blur-2xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/80 to-bg-card/50" />
                </div>
              )}
              <div className="flex items-start gap-4">
                <img
                  src={data.coverUrl ?? '/placeholder-cover.svg'}
                  alt={data.title}
                  className="h-24 w-16 flex-none rounded-lg object-cover ring-1 ring-border sm:h-32 sm:w-20"
                />
                <div className="min-w-0 flex-1">
                  <span className="section-kicker">Detalle</span>
                  <h2 className="mt-2 line-clamp-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
                    {data.title}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-fg-subtle break-all">
                    {data.providerId} · {data.mangaId}
                  </p>
                  <a
                    href={`/manga/${data.mangaId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
                  >
                    Abrir en la app
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 17L17 7M17 7H9M17 7V15"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <StatBox label="En biblioteca" value={data.stats.libraryCount} tone="brand" />
                <StatBox label="Favoritos" value={data.stats.favoriteCount} tone="amber" />
                <StatBox label="Lectores" value={data.stats.readers} tone="emerald" />
                <StatBox label="Eventos" value={data.stats.progressCount} tone="neutral" />
                <StatBox
                  label="Progreso medio"
                  value={data.stats.avgProgress !== null ? `${data.stats.avgProgress}%` : '—'}
                  tone="brand"
                />
              </div>
            </header>

            {/* Tabs */}
            <nav className="flex gap-1 border-b border-border px-3 sm:px-5">
              {([
                { key: 'users', label: `Biblioteca (${data.library.length})` },
                { key: 'readers', label: `Lectores (${data.readers.length})` },
                { key: 'chapters', label: `Capítulos (${data.chaptersRead.length})` },
              ] as const).map((t) => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`relative px-3 py-3 text-sm font-semibold transition-colors ${
                      active ? 'text-fg' : 'text-fg-muted hover:text-fg'
                    }`}
                  >
                    {t.label}
                    {active && (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-brand-500" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
              {tab === 'users' && (
                data.library.length === 0 ? (
                  <p className="py-8 text-center text-sm text-fg-muted">Nadie lo tiene en su biblioteca.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.library.map((u) => (
                      <li key={u.userId} className="flex items-center gap-3 py-2.5">
                        <Avatar user={u} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{u.username}</div>
                          <div className="truncate text-xs text-fg-subtle">{u.email}</div>
                        </div>
                        {u.addedAt && (
                          <span className="text-xs text-fg-subtle tabular-nums">
                            {new Date(u.addedAt).toLocaleDateString('es-ES')}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'readers' && (
                data.readers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-fg-muted">Sin actividad de lectura.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.readers.map((r) => (
                      <li key={r.userId} className="flex items-center gap-3 py-3">
                        <Avatar user={r} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 text-sm">
                            <span className="truncate font-semibold">{r.username}</span>
                            <span className="text-xs text-fg-subtle">
                              Cap. {r.chapterNumber ?? '?'}
                              {r.totalPages ? ` · pág ${r.page + 1}/${r.totalPages}` : ''}
                            </span>
                          </div>
                          {r.pct !== null && (
                            <div className="mt-1.5 h-1 w-full max-w-sm overflow-hidden rounded-full bg-white/[0.05]">
                              <div
                                className="h-full bg-gradient-to-r from-brand-500 to-brand-300"
                                style={{ width: `${r.pct}%` }}
                              />
                            </div>
                          )}
                          <div className="mt-1 text-[11px] text-fg-subtle">
                            {new Date(r.updatedAt).toLocaleString('es-ES')}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === 'chapters' && (
                data.chaptersRead.length === 0 ? (
                  <p className="py-8 text-center text-sm text-fg-muted">Sin capítulos con actividad.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {data.chaptersRead.map((c) => {
                      const max = Math.max(...data.chaptersRead.map((x) => x.count));
                      const w = (c.count / max) * 100;
                      return (
                        <li key={c.chapterId} className="rounded-lg bg-bg-hover/40 px-3 py-2.5 ring-1 ring-border">
                          <div className="flex items-baseline justify-between text-sm">
                            <span className="font-semibold">Cap. {c.chapterNumber ?? '?'}</span>
                            <span className="tabular-nums text-fg-muted">{c.count} lect.</span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              className="h-full bg-gradient-to-r from-brand-500 to-brand-300"
                              style={{ width: `${w}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: 'brand' | 'amber' | 'emerald' | 'neutral';
}) {
  const map: Record<string, string> = {
    brand: 'text-brand-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    neutral: 'text-fg',
  };
  return (
    <div className="rounded-xl bg-bg-elevated/60 p-3 ring-1 ring-border">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle">{label}</div>
      <div className={`mt-1 font-display text-xl font-black tabular-nums ${map[tone]}`}>
        {typeof value === 'number' ? value.toLocaleString('es-ES') : value}
      </div>
    </div>
  );
}

function Avatar({ user }: { user: { username: string; avatarUrl?: string | null } }) {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.username}
        className="h-9 w-9 flex-none rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  const initial = user.username?.[0]?.toUpperCase() ?? '?';
  return (
    <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-gradient-brand text-xs font-black text-white">
      {initial}
    </span>
  );
}
