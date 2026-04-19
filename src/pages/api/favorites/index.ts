import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const db = await getDb();
  const rows = db.favorites
    .filter((f) => f.userId === user.id)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  return json(rows);
};
