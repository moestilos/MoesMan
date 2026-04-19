import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { db } from '@/server/db';
import { sql } from 'drizzle-orm';

export const prerender = false;

interface Row {
  provider_id: string;
  manga_id: string;
  title: string | null;
  cover_url: string | null;
  library_count: number;
  favorite_count: number;
  progress_count: number;
  readers: number;
  last_activity: string | null;
  first_seen: string | null;
}

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const url = ctx.url;
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const sort = url.searchParams.get('sort') ?? 'popular';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 300);

  // Orden SQL por columna según sort
  let orderClause = sql`library_count desc`;
  switch (sort) {
    case 'recent': orderClause = sql`last_activity desc nulls last`; break;
    case 'readers': orderClause = sql`readers desc`; break;
    case 'favorites': orderClause = sql`favorite_count desc`; break;
    case 'activity': orderClause = sql`progress_count desc`; break;
    case 'title': orderClause = sql`title asc nulls last`; break;
  }

  const where = q
    ? sql`where lower(coalesce(title,'')) like ${'%' + q + '%'} or lower(manga_id) like ${'%' + q + '%'}`
    : sql``;

  const result = await db.execute<Row>(sql`
    with agg as (
      select provider_id, manga_id,
        (array_agg(title order by added_at desc))[1] as title,
        (array_agg(cover_url order by added_at desc))[1] as cover_url,
        count(distinct user_id)::int as library_count,
        max(added_at) as last_activity,
        min(added_at) as first_seen,
        null::int as favorite_count,
        null::int as progress_count,
        null::int as readers
      from library
      group by provider_id, manga_id
    ),
    fav as (
      select provider_id, manga_id, count(*)::int as favorite_count, max(added_at) as last_fav
      from favorites group by provider_id, manga_id
    ),
    prog as (
      select provider_id, manga_id,
        count(*)::int as progress_count,
        count(distinct user_id)::int as readers,
        max(updated_at) as last_prog
      from progress group by provider_id, manga_id
    ),
    combined as (
      select
        coalesce(a.provider_id, f.provider_id, p.provider_id) as provider_id,
        coalesce(a.manga_id, f.manga_id, p.manga_id) as manga_id,
        a.title,
        a.cover_url,
        coalesce(a.library_count, 0) as library_count,
        coalesce(f.favorite_count, 0) as favorite_count,
        coalesce(p.progress_count, 0) as progress_count,
        coalesce(p.readers, 0) as readers,
        greatest(a.last_activity, f.last_fav, p.last_prog) as last_activity,
        a.first_seen as first_seen
      from agg a
      full outer join fav f on f.provider_id = a.provider_id and f.manga_id = a.manga_id
      full outer join prog p on p.provider_id = coalesce(a.provider_id, f.provider_id)
        and p.manga_id = coalesce(a.manga_id, f.manga_id)
    )
    select * from combined
    ${where}
    order by ${orderClause}
    limit ${limit}
  `);

  const rows = (result.rows ?? (result as unknown as Row[])) as Row[];
  const items = rows.map((r) => ({
    providerId: r.provider_id,
    mangaId: r.manga_id,
    title: r.title ?? `Manga ${String(r.manga_id).slice(0, 6)}`,
    coverUrl: r.cover_url,
    libraryCount: r.library_count,
    favoriteCount: r.favorite_count,
    progressCount: r.progress_count,
    readers: r.readers,
    lastActivity: r.last_activity
      ? (r.last_activity instanceof Date ? r.last_activity.toISOString() : String(r.last_activity))
      : null,
    firstSeen: r.first_seen
      ? (r.first_seen instanceof Date ? r.first_seen.toISOString() : String(r.first_seen))
      : null,
  }));

  return json({ total: items.length, items });
};
