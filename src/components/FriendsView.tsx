import { useEffect, useMemo, useState } from 'react';
import { api, type FriendshipRow, type FriendFeedItem } from '@/lib/api';
import { getToken, isAuthed } from '@/lib/auth-client';
import { showAlert, showConfirm } from '@/lib/dialog';

type Tab = 'feed' | 'friends' | 'requests' | 'find';

function mangaHref(providerId: string, mangaId: string): string {
  return providerId === 'mangadex'
    ? `/manga/${mangaId}`
    : `/manga/${encodeURIComponent(mangaId)}?p=${providerId}`;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function FriendsView() {
  const [tab, setTab] = useState<Tab>('feed');
  const [friendships, setFriendships] = useState<FriendshipRow[] | null>(null);
  const [feed, setFeed] = useState<FriendFeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthed()) {
      window.location.href = '/login?next=/friends';
      return;
    }
    reloadAll();
  }, []);

  async function reloadAll() {
    const token = getToken();
    if (!token) return;
    try {
      const [fr, fd] = await Promise.all([api.friends.list(token), api.friends.feed(token)]);
      setFriendships(fr.friendships);
      setFeed(fd.feed);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const accepted = useMemo(
    () => (friendships ?? []).filter((f) => f.status === 'accepted'),
    [friendships],
  );
  const incoming = useMemo(
    () => (friendships ?? []).filter((f) => f.status === 'pending' && f.direction === 'incoming'),
    [friendships],
  );
  const outgoing = useMemo(
    () => (friendships ?? []).filter((f) => f.status === 'pending' && f.direction === 'outgoing'),
    [friendships],
  );

  async function respond(id: string, accept: boolean) {
    const token = getToken();
    if (!token) return;
    try {
      await api.friends.respond(token, id, accept);
      await reloadAll();
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    }
  }

  async function removeFriend(username: string, userId: string) {
    const ok = await showConfirm({
      title: `Quitar a @${username}`,
      message: '¿Quitar a esta persona de tus amigos? Ya no verás su actividad.',
      confirmText: 'Quitar',
      tone: 'danger',
    });
    if (!ok) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.friends.remove(token, userId);
      await reloadAll();
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    }
  }

  if (error) return <p className="rounded-xl bg-brand-500/10 p-4 text-sm text-brand-200 ring-1 ring-brand-500/30">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="-mx-3 sm:mx-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
        <div className="flex gap-1 px-3 sm:px-0 min-w-min">
          <TabBtn active={tab === 'feed'} onClick={() => setTab('feed')} label="Actividad" />
          <TabBtn
            active={tab === 'friends'}
            onClick={() => setTab('friends')}
            label="Amigos"
            badge={accepted.length || undefined}
          />
          <TabBtn
            active={tab === 'requests'}
            onClick={() => setTab('requests')}
            label="Solicitudes"
            badge={incoming.length || undefined}
            emphasize={incoming.length > 0}
          />
          <TabBtn active={tab === 'find'} onClick={() => setTab('find')} label="Buscar" />
        </div>
      </div>

      {tab === 'feed' && <FeedTab feed={feed} />}
      {tab === 'friends' && (
        <FriendsTab
          friends={accepted}
          onRemove={(row) => removeFriend(row.friendUsername, row.friendId)}
          loading={friendships === null}
        />
      )}
      {tab === 'requests' && (
        <RequestsTab
          incoming={incoming}
          outgoing={outgoing}
          onRespond={respond}
          onCancel={(row) => removeFriend(row.friendUsername, row.friendId)}
        />
      )}
      {tab === 'find' && <FindTab onAfterRequest={reloadAll} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  badge,
  emphasize,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
  emphasize?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? 'bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/40'
          : 'text-fg-muted hover:text-fg hover:bg-bg-hover/60'
      }`}
    >
      {label}
      {badge !== undefined && (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
            emphasize ? 'bg-brand-500 text-white' : 'bg-bg-hover text-fg-muted'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function Avatar({
  username,
  avatarUrl,
  size = 40,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="flex-none rounded-full object-cover ring-1 ring-border"
        style={{ width: size, height: size }}
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
      />
    );
  }
  return (
    <span
      className="inline-flex flex-none items-center justify-center rounded-full bg-gradient-brand font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {username[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

function FeedTab({ feed }: { feed: FriendFeedItem[] | null }) {
  if (feed === null) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (feed.length === 0) {
    return (
      <EmptyState
        title="Sin actividad reciente"
        message="Cuando tus amigos lean algo, aparecerá aquí. Añade amigos desde la pestaña Buscar."
      />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {feed.map((f, i) => {
        const pct =
          f.totalPages && f.totalPages > 0
            ? Math.min(100, Math.round(((f.page + 1) / f.totalPages) * 100))
            : null;
        return (
          <a
            key={`${f.userId}:${f.chapterId}:${i}`}
            href={mangaHref(f.providerId, f.mangaId)}
            className="group relative overflow-hidden rounded-2xl bg-bg-card/60 ring-1 ring-border transition hover:ring-brand-500/40 hover:shadow-card"
          >
            {f.mangaCoverUrl && (
              <div className="pointer-events-none absolute inset-0 -z-0">
                <img
                  src={f.mangaCoverUrl}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full scale-110 object-cover blur-2xl opacity-30"
                />
                <div className="absolute inset-0 bg-bg-card/60" />
              </div>
            )}
            <div className="relative z-10 flex gap-3 p-3">
              <div className="relative flex-none h-24 w-16 overflow-hidden rounded-lg bg-bg-hover ring-1 ring-border">
                {f.mangaCoverUrl && (
                  <img
                    src={f.mangaCoverUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Avatar username={f.username} avatarUrl={f.avatarUrl} size={22} />
                  <span className="truncate text-[12px] font-semibold">@{f.username}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-fg-subtle">
                    {timeAgo(f.updatedAt)}
                  </span>
                </div>
                <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                  {f.mangaTitle ?? 'Manga'}
                </h3>
                <div className="mt-1 text-[11px] text-fg-subtle">
                  Cap. {f.chapterNumber ?? '?'} · Pág {f.page + 1}
                  {f.totalPages ? `/${f.totalPages}` : ''}
                </div>
                {pct !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-fg-muted">{pct}%</span>
                  </div>
                )}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

function FriendsTab({
  friends,
  onRemove,
  loading,
}: {
  friends: FriendshipRow[];
  onRemove: (row: FriendshipRow) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (friends.length === 0) {
    return <EmptyState title="Sin amigos todavía" message="Ve a la pestaña Buscar y envía tu primera solicitud." />;
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded-2xl bg-bg-card/60 px-3 py-2.5 ring-1 ring-border"
        >
          <Avatar username={f.friendUsername} avatarUrl={f.friendAvatar} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">@{f.friendUsername}</div>
            <div className="truncate text-[11px] text-fg-subtle">Amigos desde {new Date(f.updatedAt).toLocaleDateString('es-ES')}</div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(f)}
            className="btn-ghost h-8 px-2 text-[11px] hover:text-brand-400"
            title="Quitar amigo"
          >
            Quitar
          </button>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({
  incoming,
  outgoing,
  onRespond,
  onCancel,
}: {
  incoming: FriendshipRow[];
  outgoing: FriendshipRow[];
  onRespond: (id: string, accept: boolean) => void;
  onCancel: (row: FriendshipRow) => void;
}) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return <EmptyState title="Sin solicitudes" message="Cuando alguien te envíe una solicitud o tú envíes una, aparecerán aquí." />;
  }
  return (
    <div className="space-y-6">
      {incoming.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-fg-subtle">
            Recibidas · {incoming.length}
          </h3>
          <div className="space-y-2">
            {incoming.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-bg-card/60 px-3 py-2.5 ring-1 ring-border"
              >
                <Avatar username={f.friendUsername} avatarUrl={f.friendAvatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">@{f.friendUsername}</div>
                  <div className="text-[11px] text-fg-subtle">Quiere ser tu amigo</div>
                </div>
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => onRespond(f.id, false)}
                    className="btn-ghost h-9 px-3 text-xs"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespond(f.id, true)}
                    className="btn-primary h-9 px-3 text-xs"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {outgoing.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-fg-subtle">
            Enviadas · {outgoing.length}
          </h3>
          <div className="space-y-2">
            {outgoing.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-2xl bg-bg-card/40 px-3 py-2.5 ring-1 ring-border/60"
              >
                <Avatar username={f.friendUsername} avatarUrl={f.friendAvatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">@{f.friendUsername}</div>
                  <div className="text-[11px] text-fg-subtle">Esperando respuesta…</div>
                </div>
                <button
                  type="button"
                  onClick={() => onCancel(f)}
                  className="btn-ghost h-8 px-2 text-[11px]"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FindTab({ onAfterRequest }: { onAfterRequest: () => void }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Array<{ id: string; username: string; avatarUrl: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token || q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const r = await api.friends.search(token, q.trim());
        setResults(r.users);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  async function sendRequest(userId: string, username: string) {
    const token = getToken();
    if (!token) return;
    setBusyId(userId);
    try {
      const r = await api.friends.request(token, { userId });
      const s = r.result.status;
      const messages: Record<string, string> = {
        sent: `Solicitud enviada a @${username}.`,
        already_pending: `Ya tienes una solicitud pendiente con @${username}.`,
        already_friends: `Ya sois amigos.`,
        auto_accepted: `@${username} ya te había enviado una solicitud — ahora sois amigos.`,
      };
      showAlert({ title: 'Solicitud', message: messages[s] ?? 'Listo' });
      onAfterRequest();
    } catch (e) {
      showAlert({ title: 'Error', message: (e as Error).message, tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre de usuario…"
          className="input w-full pl-9"
          autoFocus
        />
      </div>

      {q.trim().length < 2 && (
        <p className="py-6 text-center text-sm text-fg-muted">Escribe al menos 2 letras.</p>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      )}

      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <p className="py-6 text-center text-sm text-fg-muted">Ningún usuario coincide.</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-2xl bg-bg-card/60 px-3 py-2.5 ring-1 ring-border"
            >
              <Avatar username={u.username} avatarUrl={u.avatarUrl} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">@{u.username}</div>
              </div>
              <button
                type="button"
                onClick={() => sendRequest(u.id, u.username)}
                disabled={busyId === u.id}
                className="btn-primary h-8 px-3 text-xs"
              >
                {busyId === u.id ? '…' : 'Añadir'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-card ring-1 ring-border text-fg-subtle">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </span>
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">{message}</p>
      </div>
    </div>
  );
}
