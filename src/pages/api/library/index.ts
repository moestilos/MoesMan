import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { addLibrary, findLibraryEntry, listLibraryByUser } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const entries = await listLibraryByUser(user.id);
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

  const existing = await findLibraryEntry(user.id, providerId, mangaId);
  if (existing) return json(existing);

  const row = await addLibrary({ userId: user.id, providerId, mangaId, title, coverUrl });
  return json(row, { status: 201 });
};
