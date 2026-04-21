import type { APIRoute } from 'astro';
import { requireUser, json } from '@/server/auth';
import { friendsFeed } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  const limit = Math.min(Number(ctx.url.searchParams.get('limit') ?? 30), 60);
  const rows = await friendsFeed(user.id, limit);
  return json({
    feed: rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      providerId: r.provider_id,
      mangaId: r.manga_id,
      mangaTitle: r.manga_title,
      mangaCoverUrl: r.manga_cover_url,
      chapterId: r.chapter_id,
      chapterNumber: r.chapter_number,
      page: r.page,
      totalPages: r.total_pages,
      updatedAt: r.updated_at,
    })),
  });
};
