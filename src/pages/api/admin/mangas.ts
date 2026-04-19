import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const url = ctx.url;
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const sort = url.searchParams.get('sort') ?? 'popular';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 300);

  const db = await getDb();

  // Index mangas por (provider, mangaId) desde library + favorites + progress
  type Acc = {
    providerId: string;
    mangaId: string;
    title: string;
    coverUrl: string | null;
    libraryCount: number;
    libraryUsers: Set<string>;
    favoriteCount: number;
    progressCount: number;
    readerIds: Set<string>;
    lastActivity: string | null;
    firstSeen: string | null;
  };
  const map = new Map<string, Acc>();
  const key = (p: string, m: string) => `${p}::${m}`;

  const touch = (
    providerId: string,
    mangaId: string,
    defaults: { title?: string; coverUrl?: string | null },
    ts?: string | null,
  ) => {
    const k = key(providerId, mangaId);
    let acc = map.get(k);
    if (!acc) {
      acc = {
        providerId,
        mangaId,
        title: defaults.title ?? `Manga ${mangaId.slice(0, 6)}`,
        coverUrl: defaults.coverUrl ?? null,
        libraryCount: 0,
        libraryUsers: new Set(),
        favoriteCount: 0,
        progressCount: 0,
        readerIds: new Set(),
        lastActivity: null,
        firstSeen: null,
      };
      map.set(k, acc);
    }
    if (defaults.title && (!acc.title || acc.title.startsWith('Manga '))) {
      acc.title = defaults.title;
    }
    if (defaults.coverUrl !== undefined && !acc.coverUrl) {
      acc.coverUrl = defaults.coverUrl;
    }
    if (ts) {
      if (!acc.lastActivity || ts > acc.lastActivity) acc.lastActivity = ts;
      if (!acc.firstSeen || ts < acc.firstSeen) acc.firstSeen = ts;
    }
    return acc;
  };

  for (const e of db.library) {
    const acc = touch(
      e.providerId,
      e.mangaId,
      { title: e.title, coverUrl: e.coverUrl },
      e.addedAt,
    );
    acc.libraryCount++;
    acc.libraryUsers.add(e.userId);
  }
  for (const f of db.favorites) {
    const acc = touch(f.providerId, f.mangaId, {}, f.addedAt);
    acc.favoriteCount++;
  }
  for (const p of db.progress) {
    const acc = touch(p.providerId, p.mangaId, {}, p.updatedAt);
    acc.progressCount++;
    acc.readerIds.add(p.userId);
  }

  let list = [...map.values()].map((a) => ({
    providerId: a.providerId,
    mangaId: a.mangaId,
    title: a.title,
    coverUrl: a.coverUrl,
    libraryCount: a.libraryUsers.size,
    favoriteCount: a.favoriteCount,
    progressCount: a.progressCount,
    readers: a.readerIds.size,
    lastActivity: a.lastActivity,
    firstSeen: a.firstSeen,
  }));

  if (q) {
    list = list.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.mangaId.toLowerCase().includes(q),
    );
  }

  switch (sort) {
    case 'recent':
      list.sort((a, b) =>
        (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''),
      );
      break;
    case 'readers':
      list.sort((a, b) => b.readers - a.readers);
      break;
    case 'favorites':
      list.sort((a, b) => b.favoriteCount - a.favoriteCount);
      break;
    case 'activity':
      list.sort((a, b) => b.progressCount - a.progressCount);
      break;
    case 'title':
      list.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'popular':
    default:
      list.sort((a, b) => b.libraryCount - a.libraryCount);
      break;
  }

  list = list.slice(0, limit);

  return json({ total: map.size, items: list });
};
