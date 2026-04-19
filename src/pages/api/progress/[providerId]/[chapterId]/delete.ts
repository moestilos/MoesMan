import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { deleteProgressByChapter } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const providerId = String(ctx.params.providerId ?? '');
  const chapterId = String(ctx.params.chapterId ?? '');
  await deleteProgressByChapter(user.id, providerId, chapterId);
  return json({ removed: 1 });
};
