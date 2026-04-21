import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { findUserByUsernameLike } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const q = (ctx.url.searchParams.get('q') ?? '').trim();
  if (q.length < 2) return json({ users: [] });
  const rows = await findUserByUsernameLike(q, 12);
  const users = (rows as Array<{ id: string; username: string; avatarUrl: string | null }>)
    .filter((u) => u.id !== user.id)
    .map((u) => ({ id: u.id, username: u.username, avatarUrl: u.avatarUrl }));
  return json({ users });
};
