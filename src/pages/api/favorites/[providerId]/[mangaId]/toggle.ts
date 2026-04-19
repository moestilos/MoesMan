import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { toggleFavorite } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const providerId = String(ctx.params.providerId ?? '');
  const mangaId = String(ctx.params.mangaId ?? '');
  const favorite = await toggleFavorite(user.id, providerId, mangaId);
  return json({ favorite });
};
