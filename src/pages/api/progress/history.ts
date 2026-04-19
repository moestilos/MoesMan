import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { listProgressHistory } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? 30), 100);
  const rows = await listProgressHistory(user.id, limit);
  return json(rows);
};
