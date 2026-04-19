import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { commit, getDb } from '@/server/db';

export const prerender = false;

// Borra TODO el progreso del usuario (acción explícita en UI con confirmación).
export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const db = await getDb();
  const before = db.progress.length;
  db.progress = db.progress.filter((p) => p.userId !== user.id);
  const removed = before - db.progress.length;
  if (removed > 0) await commit();
  return json({ removed });
};
