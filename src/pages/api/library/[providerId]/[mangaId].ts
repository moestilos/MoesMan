import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { commit, getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const { providerId, mangaId } = ctx.params;
  const db = await getDb();
  const has = db.library.some(
    (e) => e.userId === user.id && e.providerId === providerId && e.mangaId === mangaId,
  );
  return json({ has });
};

export const DELETE: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const { providerId, mangaId } = ctx.params;
  const db = await getDb();
  const before = db.library.length;
  db.library = db.library.filter(
    (e) => !(e.userId === user.id && e.providerId === providerId && e.mangaId === mangaId),
  );
  const removed = before - db.library.length;
  if (removed > 0) await commit();
  return json({ removed });
};
