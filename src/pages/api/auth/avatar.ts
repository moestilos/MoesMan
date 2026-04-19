import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { commit, getDb } from '@/server/db';

export const prerender = false;

const MAX_BYTES = 1024 * 1024; // 1 MB base64 (~750 KB imagen)

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;

  let body: { avatarUrl?: string } = {};
  try {
    body = (await ctx.request.json()) as { avatarUrl?: string };
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const raw = body.avatarUrl;
  if (raw === null || raw === '') {
    // Quitar avatar
    const db = await getDb();
    const u = db.users.find((x) => x.id === user.id);
    if (u) {
      u.avatarUrl = null;
      await commit();
    }
    return json({ avatarUrl: null });
  }

  if (typeof raw !== 'string') return jsonError(400, 'avatarUrl requerido');
  if (!raw.startsWith('data:image/')) return jsonError(400, 'Formato inválido (data URL image/*)');
  if (raw.length > MAX_BYTES) return jsonError(413, 'Imagen demasiado grande');

  const db = await getDb();
  const u = db.users.find((x) => x.id === user.id);
  if (!u) return jsonError(404, 'Usuario no encontrado');
  u.avatarUrl = raw;
  await commit();
  return json({ avatarUrl: raw });
};

export const DELETE: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const db = await getDb();
  const u = db.users.find((x) => x.id === user.id);
  if (u && u.avatarUrl) {
    u.avatarUrl = null;
    await commit();
  }
  return json({ avatarUrl: null });
};
