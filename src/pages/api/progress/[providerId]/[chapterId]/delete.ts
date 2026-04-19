import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { commit, getDb } from '@/server/db';

export const prerender = false;

// Usamos POST porque fetch sin body + DELETE en algunos setups da problemas.
// Endpoint semánticamente "unmark/delete progreso".
export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const { providerId, chapterId } = ctx.params;
  const db = await getDb();
  const before = db.progress.length;
  db.progress = db.progress.filter(
    (p) =>
      !(
        p.userId === user.id &&
        p.providerId === providerId &&
        p.chapterId === chapterId
      ),
  );
  const removed = before - db.progress.length;
  if (removed > 0) await commit();
  return json({ removed });
};
