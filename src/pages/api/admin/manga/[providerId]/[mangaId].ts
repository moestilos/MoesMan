import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { db } from '@/server/db';
import * as schema from '@/server/schema';
import { and, desc, eq } from 'drizzle-orm';

export const prerender = false;

const iso = (v: unknown): string =>
  v instanceof Date ? v.toISOString() : String(v ?? '');

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const providerId = String(ctx.params.providerId ?? '');
  const mangaId = String(ctx.params.mangaId ?? '');
  if (!providerId || !mangaId) return jsonError(400, 'params requeridos');

  const [libEntries, favEntries, progEntries, allUsers] = await Promise.all([
    db
      .select()
      .from(schema.library)
      .where(and(eq(schema.library.providerId, providerId), eq(schema.library.mangaId, mangaId)))
      .orderBy(desc(schema.library.addedAt)),
    db
      .select()
      .from(schema.favorites)
      .where(and(eq(schema.favorites.providerId, providerId), eq(schema.favorites.mangaId, mangaId)))
      .orderBy(desc(schema.favorites.addedAt)),
    db
      .select()
      .from(schema.progress)
      .where(and(eq(schema.progress.providerId, providerId), eq(schema.progress.mangaId, mangaId)))
      .orderBy(desc(schema.progress.updatedAt)),
    db.select().from(schema.users),
  ]);

  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const anyLib = libEntries[0];
  const title = anyLib?.title ?? `Manga ${mangaId.slice(0, 6)}`;
  const coverUrl = anyLib?.coverUrl ?? null;

  const librarySnapshot = libEntries.map((e) => {
    const u = userById.get(e.userId);
    return {
      userId: e.userId,
      username: u?.username ?? '??',
      email: u?.email ?? '',
      avatarUrl: u?.avatarUrl ?? null,
      addedAt: iso(e.addedAt),
    };
  });

  const favoritedBy = favEntries.map((f) => {
    const u = userById.get(f.userId);
    return {
      userId: f.userId,
      username: u?.username ?? '??',
      addedAt: iso(f.addedAt),
    };
  });

  const byUser = new Map<string, typeof progEntries[number]>();
  for (const p of progEntries) {
    const cur = byUser.get(p.userId);
    if (!cur || (p.updatedAt as Date) > (cur.updatedAt as Date)) byUser.set(p.userId, p);
  }
  const readers = [...byUser.values()]
    .map((p) => {
      const u = userById.get(p.userId);
      return {
        userId: p.userId,
        username: u?.username ?? '??',
        avatarUrl: u?.avatarUrl ?? null,
        chapterNumber: p.chapterNumber,
        page: p.page,
        totalPages: p.totalPages,
        pct:
          p.totalPages && p.totalPages > 0
            ? Math.round(((p.page + 1) / p.totalPages) * 100)
            : null,
        updatedAt: iso(p.updatedAt),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const chapterCount: Record<string, { count: number; chapterNumber: string | null }> = {};
  for (const p of progEntries) {
    const k = p.chapterId;
    if (!chapterCount[k]) chapterCount[k] = { count: 0, chapterNumber: p.chapterNumber };
    chapterCount[k].count++;
  }
  const chaptersRead = Object.entries(chapterCount)
    .map(([chapterId, v]) => ({ chapterId, chapterNumber: v.chapterNumber, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const pctValues = readers.map((r) => r.pct).filter((p): p is number => p !== null);
  const avgPct = pctValues.length > 0
    ? Math.round(pctValues.reduce((s, p) => s + p, 0) / pctValues.length)
    : null;

  return json({
    providerId,
    mangaId,
    title,
    coverUrl,
    stats: {
      libraryCount: libEntries.length,
      favoriteCount: favEntries.length,
      progressCount: progEntries.length,
      readers: readers.length,
      avgProgress: avgPct,
    },
    library: librarySnapshot,
    favoritedBy,
    readers,
    chaptersRead,
  });
};
