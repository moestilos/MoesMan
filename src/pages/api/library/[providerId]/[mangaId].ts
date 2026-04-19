import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { findLibraryEntry, removeLibrary } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const providerId = String(ctx.params.providerId ?? '');
  const mangaId = String(ctx.params.mangaId ?? '');
  const entry = await findLibraryEntry(user.id, providerId, mangaId);
  return json({ has: !!entry });
};

export const DELETE: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const providerId = String(ctx.params.providerId ?? '');
  const mangaId = String(ctx.params.mangaId ?? '');
  await removeLibrary(user.id, providerId, mangaId);
  return json({ removed: 1 });
};
