import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { removeFriendship } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const { friendUserId } = body as { friendUserId?: string };
    if (!friendUserId) return jsonError(400, 'friendUserId requerido');
    await removeFriendship(user.id, friendUserId);
    return json({ ok: true });
  } catch (e) {
    return jsonError(400, (e as Error).message);
  }
};
