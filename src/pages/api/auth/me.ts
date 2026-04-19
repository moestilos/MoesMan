import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  return json({ user });
};
