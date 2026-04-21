import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { db } from '@/server/db';
import * as schema from '@/server/schema';
import { eq, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const admin = await requireUser(ctx);
  if (admin instanceof Response) return admin;
  if (!isAdmin(admin)) return jsonError(403, 'No autorizado');

  const userId = ctx.params.userId;
  if (!userId) return jsonError(400, 'Falta userId');

  const [userRows, libRows, favRows, progRows] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1),
    db
      .select()
      .from(schema.library)
      .where(eq(schema.library.userId, userId))
      .orderBy(desc(schema.library.addedAt)),
    db
      .select()
      .from(schema.favorites)
      .where(eq(schema.favorites.userId, userId)),
    db
      .select()
      .from(schema.progress)
      .where(eq(schema.progress.userId, userId))
      .orderBy(desc(schema.progress.updatedAt))
      .limit(30),
  ]);

  const user = userRows[0];
  if (!user) return jsonError(404, 'Usuario no encontrado');

  const favKey = new Set(favRows.map((f) => `${f.providerId}:${f.mangaId}`));

  return json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
    },
    library: libRows.map((l) => ({
      id: l.id,
      providerId: l.providerId,
      mangaId: l.mangaId,
      title: l.title,
      coverUrl: l.coverUrl,
      addedAt: l.addedAt instanceof Date ? l.addedAt.toISOString() : String(l.addedAt),
      favorite: favKey.has(`${l.providerId}:${l.mangaId}`),
    })),
    favoritesCount: favRows.length,
    recentProgress: progRows.slice(0, 10).map((p) => ({
      providerId: p.providerId,
      mangaId: p.mangaId,
      mangaTitle: p.mangaTitle,
      mangaCoverUrl: p.mangaCoverUrl,
      chapterNumber: p.chapterNumber,
      page: p.page,
      totalPages: p.totalPages,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
    })),
  });
};
