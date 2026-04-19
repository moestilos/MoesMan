import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { listProgressByManga } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const providerId = String(ctx.params.providerId ?? '');
  const mangaId = String(ctx.params.mangaId ?? '');
  const rows = await listProgressByManga(user.id, providerId, mangaId);
  return json(rows);
};
