import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { commit, getDb, nowIso, uuid } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const { providerId, mangaId } = ctx.params;
  const db = await getDb();
  const idx = db.favorites.findIndex(
    (f) => f.userId === user.id && f.providerId === providerId && f.mangaId === mangaId,
  );
  if (idx >= 0) {
    db.favorites.splice(idx, 1);
    await commit();
    return json({ favorite: false });
  }
  db.favorites.push({
    id: uuid(),
    userId: user.id,
    providerId: providerId!,
    mangaId: mangaId!,
    addedAt: nowIso(),
  });
  await commit();
  return json({ favorite: true });
};
