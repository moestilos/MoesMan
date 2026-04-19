import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { deleteAllProgress } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  await deleteAllProgress(user.id);
  return json({ removed: -1 });
};
