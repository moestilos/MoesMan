import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { listFriendships } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  try {
    const rows = await listFriendships(user.id);
    return json({
      friendships: rows.map((r) => ({
        id: r.id,
        status: r.status,
        direction: r.direction,
        friendId: r.friend_id,
        friendUsername: r.friend_username,
        friendEmail: r.friend_email,
        friendAvatar: r.friend_avatar,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (e) {
    return jsonError(500, (e as Error).message);
  }
};
