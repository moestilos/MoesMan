import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { db } from '@/server/db';
import * as schema from '@/server/schema';
import { sql, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const [
    totalsRow,
    visitsAll,
    recentUsersRows,
  ] = await Promise.all([
    db.execute<{
      visits: number;
      unique_ips: number;
      users: number;
      library: number;
      favorites: number;
      progress: number;
    }>(sql`
      select
        (select count(*)::int from visits) as visits,
        (select count(distinct ip)::int from visits) as unique_ips,
        (select count(*)::int from users) as users,
        (select count(*)::int from library) as library,
        (select count(*)::int from favorites) as favorites,
        (select count(*)::int from progress) as progress
    `),
    db.select().from(schema.visits),
    db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .orderBy(desc(schema.users.createdAt))
      .limit(10),
  ]);

  const totals = (totalsRow.rows ?? totalsRow)[0] as {
    visits: number;
    unique_ips: number;
    users: number;
    library: number;
    favorites: number;
    progress: number;
  };

  const byDay: Record<string, number> = {};
  for (const v of visitsAll) byDay[v.day] = (byDay[v.day] ?? 0) + 1;
  const last30Days = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  const deviceCount = { mobile: 0, tablet: 0, desktop: 0 };
  for (const v of visitsAll) {
    const ua = (v.userAgent ?? '').toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(ua)) deviceCount.tablet++;
    else if (/mobi|android|iphone|ipod|opera mini|iemobile|blackberry/.test(ua)) deviceCount.mobile++;
    else deviceCount.desktop++;
  }
  const byDevice = [
    { key: 'mobile', label: 'Móvil', count: deviceCount.mobile },
    { key: 'desktop', label: 'Desktop', count: deviceCount.desktop },
    { key: 'tablet', label: 'Tablet', count: deviceCount.tablet },
  ];

  const browserCount: Record<string, number> = {};
  for (const v of visitsAll) {
    const ua = v.userAgent ?? '';
    let name = 'Otros';
    if (/Edg\//.test(ua)) name = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) name = 'Opera';
    else if (/Firefox\//.test(ua)) name = 'Firefox';
    else if (/Chrome\//.test(ua)) name = 'Chrome';
    else if (/Safari\//.test(ua)) name = 'Safari';
    browserCount[name] = (browserCount[name] ?? 0) + 1;
  }
  const byBrowser = Object.entries(browserCount)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const pathCount: Record<string, number> = {};
  for (const v of visitsAll) {
    if (v.day >= weekAgo) pathCount[v.path] = (pathCount[v.path] ?? 0) + 1;
  }
  const topPaths = Object.entries(pathCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  return json({
    totals: {
      visits: totals?.visits ?? 0,
      uniqueIps: totals?.unique_ips ?? 0,
      users: totals?.users ?? 0,
      library: totals?.library ?? 0,
      favorites: totals?.favorites ?? 0,
      progress: totals?.progress ?? 0,
    },
    last30Days,
    topPaths,
    recentUsers: recentUsersRows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
    })),
    byDevice,
    byBrowser,
  });
};
