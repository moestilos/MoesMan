import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const { providerId, mangaId } = ctx.params;
  const db = await getDb();
  const rows = db.progress
    .filter(
      (p) =>
        p.userId === user.id && p.providerId === providerId && p.mangaId === mangaId,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return json(rows);
};
