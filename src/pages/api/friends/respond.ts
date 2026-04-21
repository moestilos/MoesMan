import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { respondToFriendRequest } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const { friendshipId, accept } = body as { friendshipId?: string; accept?: boolean };
    if (!friendshipId) return jsonError(400, 'friendshipId requerido');
    await respondToFriendRequest(user.id, friendshipId, !!accept);
    return json({ ok: true });
  } catch (e) {
    return jsonError(400, (e as Error).message);
  }
};
