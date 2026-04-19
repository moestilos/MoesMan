import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? 30), 100);
  const db = await getDb();
  const rows = db.progress
    .filter((p) => p.userId === user.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
  return json(rows);
};
