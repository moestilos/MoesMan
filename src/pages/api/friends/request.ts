import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { sendFriendRequest, findUserByUsername, findUserByEmail } from '@/server/db';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const { userId, username, email } = body as { userId?: string; username?: string; email?: string };
    let target = null as Awaited<ReturnType<typeof findUserByUsername>> | null;
    if (username) target = await findUserByUsername(username);
    else if (email) target = await findUserByEmail(email);
    else if (userId) {
      // buscar por id directo
      const { findUserById } = await import('@/server/db');
      target = await findUserById(userId);
    }
    if (!target) return jsonError(404, 'Usuario no encontrado');
    if (target.id === user.id) return jsonError(400, 'No puedes agregarte a ti mismo');
    const result = await sendFriendRequest(user.id, target.id);
    return json({ result, target: { id: target.id, username: target.username } });
  } catch (e) {
    return jsonError(400, (e as Error).message);
  }
};
