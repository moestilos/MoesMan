import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { listFavoritesByUser } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const rows = await listFavoritesByUser(user.id);
  return json(rows);
};
