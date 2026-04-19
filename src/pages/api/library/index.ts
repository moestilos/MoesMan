import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { commit, getDb, nowIso, uuid } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const db = await getDb();
  const entries = db.library
    .filter((e) => e.userId === user.id)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  return json(entries);
};

export const POST: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  let body: Record<string, unknown> = {};
  try {
    body = (await ctx.request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, 'Invalid JSON');
  }
  const providerId = String(body.providerId ?? '');
  const mangaId = String(body.mangaId ?? '');
  const title = String(body.title ?? '');
  const coverUrl = body.coverUrl == null ? null : String(body.coverUrl);
  if (!providerId || !mangaId || !title) return jsonError(400, 'Missing fields');

  const db = await getDb();
  const existing = db.library.find(
    (e) => e.userId === user.id && e.providerId === providerId && e.mangaId === mangaId,
  );
  if (existing) {
    existing.title = title;
    existing.coverUrl = coverUrl;
    await commit();
    return json(existing);
  }
  const row = {
    id: uuid(),
    userId: user.id,
    providerId,
    mangaId,
    title,
    coverUrl,
    addedAt: nowIso(),
  };
  db.library.push(row);
  await commit();
  return json(row, { status: 201 });
};
