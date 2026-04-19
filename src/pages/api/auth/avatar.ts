import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { updateUserFields } from '@/server/db';

export const prerender = false;

const MAX_BYTES = 1024 * 1024; // 1 MB base64 (~750 KB imagen)

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;

  let body: { avatarUrl?: string | null } = {};
  try {
    body = (await ctx.request.json()) as { avatarUrl?: string | null };
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const raw = body.avatarUrl;
  if (raw === null || raw === '') {
    await updateUserFields(user.id, { avatarUrl: null });
    return json({ avatarUrl: null });
  }

  if (typeof raw !== 'string') return jsonError(400, 'avatarUrl requerido');
  if (!raw.startsWith('data:image/')) return jsonError(400, 'Formato inválido (data URL image/*)');
  if (raw.length > MAX_BYTES) return jsonError(413, 'Imagen demasiado grande');

  const updated = await updateUserFields(user.id, { avatarUrl: raw });
  if (!updated) return jsonError(404, 'Usuario no encontrado');
  return json({ avatarUrl: raw });
};

export const DELETE: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  await updateUserFields(user.id, { avatarUrl: null });
  return json({ avatarUrl: null });
};
