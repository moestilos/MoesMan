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
  });
};
