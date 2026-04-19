import type { APIRoute } from 'astro';
import { commit, getDb, nowIso, uuid } from '@/server/db';
import { extractIp } from '@/server/admin';

export const prerender = false;

// Body: { path: string } — registra una visita dedupeada por (IP + dia)
export const POST: APIRoute = async ({ request }) => {
  let body: { path?: string } = {};
  try {
    body = (await request.json()) as { path?: string };
  } catch {
    return new Response(null, { status: 204 });
  }
  const path = (body.path ?? '/').slice(0, 200);
  const ip = extractIp(request);
  const ua = request.headers.get('user-agent')?.slice(0, 200) ?? '';
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const db = await getDb();
  // Dedup: misma IP + mismo dia = 1 visita unica (sin importar el path para "visitas unicas")
  const exists = db.visits.some((v) => v.ip === ip && v.day === day);
  if (!exists) {
    db.visits.push({
      id: uuid(),
      ip,
      path,
      userAgent: ua,
      day,
      createdAt: nowIso(),
    });
    await commit();
  }
  return new Response(null, { status: 204 });
};
