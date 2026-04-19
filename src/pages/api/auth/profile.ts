import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { requireUser, json, jsonError, signToken } from '@/server/auth';
import { commit, getDb } from '@/server/db';

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

  const db = await getDb();
  const user = db.users.find((u) => u.id === auth.id);
  if (!user) return jsonError(404, 'Usuario no encontrado');

  // Cambio de email o username requiere contraseña actual
  const needsAuth =
    body.email !== undefined || body.username !== undefined || body.newPassword !== undefined;
  if (needsAuth) {
    const cur = String(body.currentPassword ?? '');
    if (!cur) return jsonError(400, 'Contraseña actual requerida');
    const ok = await bcrypt.compare(cur, user.passwordHash);
    if (!ok) return jsonError(401, 'Contraseña actual incorrecta');
  }

  if (body.email !== undefined) {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return jsonError(400, 'Email inválido');
    if (email !== user.email && db.users.some((u) => u.email === email && u.id !== user.id)) {
      return jsonError(409, 'Email ya en uso');
    }
    user.email = email;
  }

  if (body.username !== undefined) {
    const username = String(body.username ?? '').trim();
    if (!USERNAME_RE.test(username)) return jsonError(400, 'Usuario inválido (3-32, a-z 0-9 _.-)');
    if (username !== user.username && db.users.some((u) => u.username === username && u.id !== user.id)) {
      return jsonError(409, 'Usuario ya en uso');
    }
    user.username = username;
  }

  if (body.newPassword !== undefined) {
    const np = String(body.newPassword ?? '');
    if (np.length < 8) return jsonError(400, 'Nueva contraseña mínima 8 caracteres');
    user.passwordHash = await bcrypt.hash(np, 10);
  }

  await commit();

  // Re-firmar token (el contenido del token no cambia pero por si acaso)
  const token = await signToken(user);
  return json({
    user: { id: user.id, email: user.email, username: user.username, avatarUrl: user.avatarUrl ?? null },
    token,
  });
};
