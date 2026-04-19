import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const { providerId, mangaId } = ctx.params;
  if (!providerId || !mangaId) return jsonError(400, 'params requeridos');

  const db = await getDb();

  const libEntries = db.library.filter(
    (e) => e.providerId === providerId && e.mangaId === mangaId,
  );
  const favEntries = db.favorites.filter(
    (f) => f.providerId === providerId && f.mangaId === mangaId,
  );
  const progEntries = db.progress.filter(
    (p) => p.providerId === providerId && p.mangaId === mangaId,
  );

  const anyLib = libEntries[0];
  const title = anyLib?.title ?? `Manga ${mangaId.slice(0, 6)}`;
  const coverUrl = anyLib?.coverUrl ?? null;

  const userById = new Map(db.users.map((u) => [u.id, u]));

  const librarySnapshot = libEntries
    .map((e) => {
      const u = userById.get(e.userId);
      return {
        userId: e.userId,
        username: u?.username ?? '??',
        email: u?.email ?? '',
        avatarUrl: u?.avatarUrl ?? null,
        addedAt: e.addedAt,
      };
    })
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  const favoritedBy = favEntries
    .map((f) => {
      const u = userById.get(f.userId);
      return {
        userId: f.userId,
        username: u?.username ?? '??',
        addedAt: f.addedAt,
      };
    })
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  // Progreso por usuario: último capítulo
  const byUser = new Map<string, typeof progEntries[0]>();
  for (const p of progEntries) {
    const cur = byUser.get(p.userId);
    if (!cur || p.updatedAt > cur.updatedAt) byUser.set(p.userId, p);
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
        updatedAt: p.updatedAt,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Chapter stats
  const chapterCount: Record<string, { count: number; chapterNumber: string | null }> = {};
  for (const p of progEntries) {
    const k = p.chapterId;
    if (!chapterCount[k]) {
      chapterCount[k] = { count: 0, chapterNumber: p.chapterNumber };
    }
    chapterCount[k].count++;
  }
  const chaptersRead = Object.entries(chapterCount)
    .map(([chapterId, v]) => ({ chapterId, chapterNumber: v.chapterNumber, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const avgPct =
    readers.length > 0 && readers.some((r) => r.pct !== null)
      ? Math.round(
          readers.filter((r) => r.pct !== null).reduce((s, r) => s + (r.pct ?? 0), 0) /
            readers.filter((r) => r.pct !== null).length,
        )
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
