import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { requireUser, json, jsonError, signToken } from '@/server/auth';
import { findUserByEmail, findUserById, findUserByUsername, updateUserFields } from '@/server/db';

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export const PATCH: APIRoute = async (ctx) => {
  const auth = await requireUser(ctx);
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }

  const user = await findUserById(auth.id);
  if (!user) return jsonError(404, 'Usuario no encontrado');

  const needsAuth =
    body.email !== undefined || body.username !== undefined || body.newPassword !== undefined;
  if (needsAuth) {
    const cur = String(body.currentPassword ?? '');
    if (!cur) return jsonError(400, 'Contraseña actual requerida');
    const ok = await bcrypt.compare(cur, user.passwordHash);
    if (!ok) return jsonError(401, 'Contraseña actual incorrecta');
  }

  const patch: Partial<{ email: string; username: string; passwordHash: string }> = {};

  if (body.email !== undefined) {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return jsonError(400, 'Email inválido');
    if (email !== user.email) {
      const clash = await findUserByEmail(email);
      if (clash && clash.id !== user.id) return jsonError(409, 'Email ya en uso');
      patch.email = email;
    }
  }

  if (body.username !== undefined) {
    const username = String(body.username ?? '').trim();
    if (!USERNAME_RE.test(username)) return jsonError(400, 'Usuario inválido (3-32, a-z 0-9 _.-)');
    if (username !== user.username) {
      const clash = await findUserByUsername(username);
      if (clash && clash.id !== user.id) return jsonError(409, 'Usuario ya en uso');
      patch.username = username;
    }
  }

  if (body.newPassword !== undefined) {
    const np = String(body.newPassword ?? '');
    if (np.length < 8) return jsonError(400, 'Nueva contraseña mínima 8 caracteres');
    patch.passwordHash = await bcrypt.hash(np, 10);
  }

  const updated = Object.keys(patch).length > 0 ? await updateUserFields(user.id, patch) : user;
  if (!updated) return jsonError(500, 'Error actualizando usuario');

  const token = await signToken(updated);
  return json({
    user: {
      id: updated.id,
      email: updated.email,
      username: updated.username,
      avatarUrl: updated.avatarUrl ?? null,
    },
    token,
  });
};
