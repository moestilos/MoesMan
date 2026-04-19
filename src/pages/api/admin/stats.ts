import type { APIRoute } from 'astro';
import { requireUser, json, jsonError } from '@/server/auth';
import { isAdmin } from '@/server/admin';
import { getDb } from '@/server/db';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const user = await requireUser(ctx);
  if (user instanceof Response) return user;
  if (!isAdmin(user)) return jsonError(403, 'No autorizado');

  const db = await getDb();

  // Totales
  const totalVisits = db.visits.length;
  const uniqueIps = new Set(db.visits.map((v) => v.ip)).size;
  const totalUsers = db.users.length;
  const totalLibraryEntries = db.library.length;
  const totalFavorites = db.favorites.length;
  const totalProgress = db.progress.length;

  // Por día (últimos 30)
  const byDay: Record<string, number> = {};
  db.visits.forEach((v) => {
    byDay[v.day] = (byDay[v.day] ?? 0) + 1;
  });
  const last30Days = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);

  // Por dispositivo (parse UA)
  const deviceCount = { mobile: 0, tablet: 0, desktop: 0 };
  db.visits.forEach((v) => {
    const ua = (v.userAgent ?? '').toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(ua)) deviceCount.tablet++;
    else if (/mobi|android|iphone|ipod|opera mini|iemobile|blackberry/.test(ua)) deviceCount.mobile++;
    else deviceCount.desktop++;
  });
  const byDevice = [
    { key: 'mobile', label: 'Móvil', count: deviceCount.mobile },
    { key: 'desktop', label: 'Desktop', count: deviceCount.desktop },
    { key: 'tablet', label: 'Tablet', count: deviceCount.tablet },
  ];

  // Por navegador
  const browserCount: Record<string, number> = {};
  db.visits.forEach((v) => {
    const ua = v.userAgent ?? '';
    let name = 'Otros';
    if (/Edg\//.test(ua)) name = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) name = 'Opera';
    else if (/Firefox\//.test(ua)) name = 'Firefox';
    else if (/Chrome\//.test(ua)) name = 'Chrome';
    else if (/Safari\//.test(ua)) name = 'Safari';
    browserCount[name] = (browserCount[name] ?? 0) + 1;
  });
  const byBrowser = Object.entries(browserCount)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // Top paths (últimos 7 días)
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const pathCount: Record<string, number> = {};
  db.visits.forEach((v) => {
    if (v.day >= weekAgo) {
      pathCount[v.path] = (pathCount[v.path] ?? 0) + 1;
    }
  });
  const topPaths = Object.entries(pathCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }));

  // Usuarios recientes (últimos 10)
  const recentUsers = [...db.users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      createdAt: u.createdAt,
    }));

  return json({
    totals: {
      visits: totalVisits,
      uniqueIps,
      users: totalUsers,
      library: totalLibraryEntries,
      favorites: totalFavorites,
      progress: totalProgress,
    },
    last30Days,
    topPaths,
    recentUsers,
    byDevice,
    byBrowser,
  });
};
