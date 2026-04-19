import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { commit, getDb, nowIso, uuid } from '@/server/db';

export const prerender = false;

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
  const chapterId = String(body.chapterId ?? '');
  const chapterNumber = body.chapterNumber == null ? null : String(body.chapterNumber);
  const page = Math.max(0, Number(body.page ?? 0));
  const totalPages = body.totalPages == null ? null : Number(body.totalPages);
  const mangaTitle = body.mangaTitle == null ? null : String(body.mangaTitle).slice(0, 512);
  const mangaCoverUrl = body.mangaCoverUrl == null ? null : String(body.mangaCoverUrl).slice(0, 1024);
  if (!providerId || !mangaId || !chapterId) return jsonError(400, 'Missing fields');

  const db = await getDb();
  const existing = db.progress.find(
    (p) =>
      p.userId === user.id &&
      p.providerId === providerId &&
      p.chapterId === chapterId,
  );
  if (existing) {
    existing.page = page;
    existing.totalPages = totalPages;
    existing.chapterNumber = chapterNumber;
    if (mangaTitle) existing.mangaTitle = mangaTitle;
    if (mangaCoverUrl) existing.mangaCoverUrl = mangaCoverUrl;
    existing.updatedAt = nowIso();
    await commit();
    return json(existing);
  }
  const row = {
    id: uuid(),
    userId: user.id,
    providerId,
    mangaId,
    mangaTitle,
    mangaCoverUrl,
    chapterId,
    chapterNumber,
    page,
    totalPages,
    updatedAt: nowIso(),
  };
  db.progress.push(row);
  await commit();
  return json(row, { status: 201 });
};
